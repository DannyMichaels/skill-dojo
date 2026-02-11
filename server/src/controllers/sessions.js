import Session from '../models/Session.js';
import UserSkill from '../models/UserSkill.js';
import SkillCatalog from '../models/SkillCatalog.js';
import { buildSystemPrompt } from '../services/promptBuilder.js';
import { streamMessage } from '../services/anthropic.js';
import { handleToolCall } from '../services/toolHandler.js';
import { getSocialStats } from '../services/socialStats.js';
import { acquireSessionLock, releaseSessionLock } from '../services/sessionLock.js';
import TRAINING_TOOLS from '../prompts/tools.js';

// GET /api/user-skills/:skillId/sessions
export async function listSessions(req, res, next) {
  try {
    const { skillId } = req.params;

    // Verify ownership
    const skill = await UserSkill.findOne({ _id: skillId, userId: req.userId });
    if (!skill) {
      return res.status(404).json({ error: 'Skill not found' });
    }

    const sessions = await Session.find({ skillId, userId: req.userId, status: { $ne: 'abandoned' } })
      .select('-messages')
      .sort({ date: -1 })
      .limit(50)
      .lean();

    res.json({ sessions });
  } catch (err) {
    next(err);
  }
}

// POST /api/user-skills/:skillId/sessions
export async function createSession(req, res, next) {
  try {
    const { skillId } = req.params;
    const { type } = req.body;

    // Verify ownership
    const skill = await UserSkill.findOne({ _id: skillId, userId: req.userId });
    if (!skill) {
      return res.status(404).json({ error: 'Skill not found' });
    }

    const session = await Session.create({
      skillId,
      userId: req.userId,
      type: type || 'training',
    });

    res.status(201).json({ session });
  } catch (err) {
    next(err);
  }
}

// GET /api/user-skills/:skillId/sessions/:sid
export async function getSession(req, res, next) {
  try {
    const session = await Session.findOne({
      _id: req.params.sid,
      skillId: req.params.skillId,
      userId: req.userId,
    }).lean();

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    res.json({ session });
  } catch (err) {
    next(err);
  }
}

// DELETE /api/user-skills/:skillId/sessions/:sid
export async function deleteSession(req, res, next) {
  try {
    const result = await Session.findOneAndUpdate(
      {
        _id: req.params.sid,
        skillId: req.params.skillId,
        userId: req.userId,
        status: { $ne: 'abandoned' },
      },
      { status: 'abandoned' },
      { new: true }
    );

    if (!result) {
      return res.status(404).json({ error: 'Session not found' });
    }

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

// PATCH /api/user-skills/:skillId/sessions/:sid/reactivate
export async function reactivateSession(req, res, next) {
  try {
    const session = await Session.findOneAndUpdate(
      {
        _id: req.params.sid,
        skillId: req.params.skillId,
        userId: req.userId,
        status: 'completed',
      },
      { status: 'active' },
      { new: true }
    );

    if (!session) {
      return res.status(404).json({ error: 'Session not found or not completed' });
    }

    res.json({ session });
  } catch (err) {
    next(err);
  }
}

// POST /api/user-skills/:skillId/sessions/:sid/messages — SSE streaming with tool loop
export async function sendMessage(req, res, next) {
  const { skillId, sid } = req.params;

  try {
    const { content } = req.body;

    // Load session
    const session = await Session.findOne({
      _id: sid,
      skillId,
      userId: req.userId,
    });
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }
    if (session.status !== 'active') {
      return res.status(400).json({ error: 'Session is not active' });
    }

    // Session-level mutex: prevent concurrent message processing
    if (!acquireSessionLock(sid)) {
      return res.status(409).json({ error: 'Session is already processing a message' });
    }

    try {
      // Load skill + catalog for prompt building
      const userSkill = await UserSkill.findById(skillId);
      const skillCatalog = await SkillCatalog.findById(userSkill.skillCatalogId);

      // Fetch other skills for cross-skill context (onboarding awareness)
      const otherSkills = await UserSkill.find({
        userId: req.userId,
        _id: { $ne: skillId },
      }).populate('skillCatalogId', 'name');

      // Atomically push user message to session
      await Session.findByIdAndUpdate(sid, {
        $push: { messages: { role: 'user', content } },
      });

      // Re-read session to get fresh messages array (including the one we just pushed)
      const freshSession = await Session.findById(sid);

      // Get social stats for prompt
      const socialStats = await getSocialStats(userSkill.skillCatalogId);

      // Build system prompt
      const systemPrompt = await buildSystemPrompt({
        skillCatalog,
        userSkill,
        sessionType: session.type,
        socialStats,
        otherSkills,
      });

      // Set up SSE
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
      });

      const toolContext = {
        sessionId: sid,
        skillId,
        userId: req.userId,
        skillCatalogId: skillCatalog?._id,
        skillCatalogName: skillCatalog?.name,
        skillCatalogSlug: skillCatalog?.slug,
      };

      try {
        // Build messages array from session history
        let messages = freshSession.messages.map(m => ({
          role: m.role === 'system' ? 'user' : m.role,
          content: m.content,
        }));

        let fullTextResponse = '';
        const toolCount = TRAINING_TOOLS.length;
        const TOOL_LOOP_SOFT_LIMIT = toolCount * 2;
        const TOOL_LOOP_HARD_LIMIT = toolCount * 4;

        for (let loop = 0; loop < TOOL_LOOP_HARD_LIMIT; loop++) {
          const result = await streamMessage({
            system: systemPrompt,
            messages,
            tools: TRAINING_TOOLS,
            maxTokens: 4096,
            onText: (text) => {
              fullTextResponse += text;
              res.write(`data: ${JSON.stringify({ type: 'text', content: text })}\n\n`);
            },
            onToolUse: (toolCall) => {
              res.write(`data: ${JSON.stringify({ type: 'tool_use', tool: toolCall.name, input: toolCall.input })}\n\n`);
            },
          });

          // If no tool calls, we're done
          if (result.toolCalls.length === 0) break;

          if (loop === TOOL_LOOP_SOFT_LIMIT - 1) {
            console.warn(`[sendMessage] session ${sid}: tool loop reached ${TOOL_LOOP_SOFT_LIMIT}, continuing...`);
          }

          // Process tool calls in parallel (handlers write to different fields/collections)
          const toolResultEntries = await Promise.all(
            result.toolCalls.map(async (tc) => {
              const toolResult = await handleToolCall(tc, toolContext);
              return { tc, toolResult };
            })
          );

          // Stream results to client in original order
          const toolResults = [];
          for (const { tc, toolResult } of toolResultEntries) {
            toolResults.push({
              type: 'tool_result',
              tool_use_id: tc.id,
              content: JSON.stringify(toolResult),
            });

            res.write(`data: ${JSON.stringify({
              type: 'tool_result',
              tool: tc.name,
              result: toolResult,
            })}\n\n`);
          }

          // Add assistant message with tool use blocks + tool results for next iteration
          messages = [
            ...messages,
            { role: 'assistant', content: result.response.content },
            { role: 'user', content: toolResults },
          ];

          // Hard limit hit — notify client
          if (loop === TOOL_LOOP_HARD_LIMIT - 1) {
            console.error(`[sendMessage] session ${sid}: hit hard limit of ${TOOL_LOOP_HARD_LIMIT} tool loops`);
            res.write(`data: ${JSON.stringify({ type: 'error', error: 'Tool loop limit reached' })}\n\n`);
          }
        }

        // Atomically push assistant message
        if (fullTextResponse) {
          await Session.findByIdAndUpdate(sid, {
            $push: { messages: { role: 'assistant', content: fullTextResponse } },
          });
        }

        res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
      } catch (streamErr) {
        res.write(`data: ${JSON.stringify({ type: 'error', error: streamErr.message })}\n\n`);
      }

      res.end();
    } finally {
      releaseSessionLock(sid);
    }
  } catch (err) {
    if (res.headersSent) {
      res.write(`data: ${JSON.stringify({ type: 'error', error: err.message })}\n\n`);
      res.end();
    } else {
      next(err);
    }
  }
}
