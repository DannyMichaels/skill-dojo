import Session from '../models/Session.js';
import UserSkill from '../models/UserSkill.js';
import SkillCatalog from '../models/SkillCatalog.js';
import { buildSystemPrompt } from '../services/promptBuilder.js';
import { streamMessage } from '../services/anthropic.js';
import { handleToolCall } from '../services/toolHandler.js';
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

    const sessions = await Session.find({ skillId, userId: req.userId })
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

// POST /api/user-skills/:skillId/sessions/:sid/messages — SSE streaming with tool loop
export async function sendMessage(req, res, next) {
  try {
    const { skillId, sid } = req.params;
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

    // Load skill + catalog for prompt building
    const userSkill = await UserSkill.findById(skillId);
    const skillCatalog = await SkillCatalog.findById(userSkill.skillCatalogId);

    // Add user message to session
    session.messages.push({ role: 'user', content });
    await session.save();

    // Build system prompt
    const systemPrompt = buildSystemPrompt({
      skillCatalog,
      userSkill,
      sessionType: session.type,
    });

    // Set up SSE
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    });

    const toolContext = { sessionId: sid, skillId, userId: req.userId };

    try {
      // Build messages array from session history
      let messages = session.messages.map(m => ({
        role: m.role === 'system' ? 'user' : m.role,
        content: m.content,
      }));

      let fullTextResponse = '';
      const MAX_TOOL_LOOPS = 10;

      for (let loop = 0; loop < MAX_TOOL_LOOPS; loop++) {
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

        // Process tool calls and build tool result messages
        const toolResults = [];
        for (const tc of result.toolCalls) {
          const toolResult = await handleToolCall(tc, toolContext);
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

        // Reset text for next iteration (tool calls may produce more text)
        fullTextResponse = '';
      }

      // Save the full text response as assistant message
      if (fullTextResponse) {
        session.messages.push({ role: 'assistant', content: fullTextResponse });
        await session.save();
      }

      res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
    } catch (streamErr) {
      res.write(`data: ${JSON.stringify({ type: 'error', error: streamErr.message })}\n\n`);
    }

    res.end();
  } catch (err) {
    if (res.headersSent) {
      res.write(`data: ${JSON.stringify({ type: 'error', error: err.message })}\n\n`);
      res.end();
    } else {
      next(err);
    }
  }
}
