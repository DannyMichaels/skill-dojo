import Session from '../models/Session.js';
import UserSkill from '../models/UserSkill.js';
import SkillCatalog from '../models/SkillCatalog.js';
import BeltHistory from '../models/BeltHistory.js';
import { promoteBelt, failAssessment } from './assessmentService.js';
import { updateStreak, emitBeltPromotion, emitAssessmentPassed, checkAndEmitStreakMilestone } from './activityService.js';

/**
 * Process a tool call from Claude and write results to MongoDB.
 * Returns a tool result to send back to Claude.
 */
export async function handleToolCall(toolCall, ctx) {
  const { sessionId, skillId, userId, skillCatalogId, skillCatalogName, skillCatalogSlug } = ctx;
  const { name, input } = toolCall;

  switch (name) {
    case 'record_observation':
      return handleRecordObservation(input, sessionId);

    case 'update_mastery':
      return handleUpdateMastery(input, { sessionId, skillId });

    case 'queue_reinforcement':
      return handleQueueReinforcement(input, { sessionId, skillId });

    case 'complete_session':
      return handleCompleteSession(input, { sessionId, skillId, userId, skillCatalogName, skillCatalogSlug });

    case 'set_belt':
      return handleSetBelt(input, { sessionId, skillId, userId, skillCatalogId, skillCatalogName, skillCatalogSlug });

    case 'set_assessment_available':
      return handleSetAssessmentAvailable(input, skillId);

    case 'set_training_context':
      return handleSetTrainingContext(input, { skillId, skillCatalogId });

    case 'present_problem':
      return handlePresentProblem(input, sessionId);

    default:
      return { error: `Unknown tool: ${name}` };
  }
}

async function handleRecordObservation(input, sessionId) {
  await Session.findByIdAndUpdate(sessionId, {
    $push: {
      observations: {
        type: input.type,
        concept: input.concept,
        note: input.note,
        severity: input.severity,
      },
    },
  });
  return { success: true, message: `Observation recorded: ${input.type} on ${input.concept}` };
}

async function handleUpdateMastery(input, { sessionId, skillId }) {
  const MAX_RETRIES = 5;
  const conceptKey = input.concept.toLowerCase().replace(/\s+/g, '_');

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const skill = await UserSkill.findById(skillId);
    if (!skill) return { error: 'Skill not found' };

    const defaults = {
      mastery: 0,
      exposureCount: 0,
      successCount: 0,
      lastSeen: null,
      streak: 0,
      contexts: [],
      observations: [],
      beltLevel: input.belt_level || 'white',
      readyForNewContext: false,
    };
    const raw = skill.concepts.get(conceptKey);
    const existing = raw ? raw.toObject() : defaults;

    const previousMastery = existing.mastery;

    existing.exposureCount += 1;
    existing.lastSeen = new Date();

    if (input.success) {
      existing.successCount += 1;
      existing.streak += 1;
    } else {
      existing.streak = 0;
    }

    existing.mastery = input.mastery;

    if (input.context && !existing.contexts.includes(input.context)) {
      existing.contexts = [...existing.contexts, input.context];
    }

    if (input.belt_level) {
      existing.beltLevel = input.belt_level;
    }

    // Version-checked atomic update
    const result = await UserSkill.findOneAndUpdate(
      { _id: skillId, __v: skill.__v },
      { $set: { [`concepts.${conceptKey}`]: existing }, $inc: { __v: 1 } },
      { new: true }
    );

    if (result) {
      // Record mastery update in session log with "from -> to" format
      await Session.findByIdAndUpdate(sessionId, {
        [`masteryUpdates.${conceptKey}`]: `${(previousMastery * 100).toFixed(0)}% -> ${(existing.mastery * 100).toFixed(0)}%`,
      });

      return { success: true, concept: conceptKey, mastery: existing.mastery };
    }
    // Version conflict — retry with fresh read
  }

  return { error: 'Concurrent modification — max retries exceeded' };
}

async function handleQueueReinforcement(input, { sessionId, skillId }) {
  await UserSkill.findByIdAndUpdate(skillId, {
    $push: {
      reinforcementQueue: {
        concept: input.concept,
        context: input.context || null,
        priority: input.priority,
        attempts: 0,
        sourceSession: sessionId,
      },
    },
  });
  return { success: true, message: `Queued reinforcement for ${input.concept}` };
}

async function handleCompleteSession(input, { sessionId, skillId, userId, skillCatalogName, skillCatalogSlug }) {
  // Atomic update: also prevents completing an already-completed session
  const session = await Session.findOneAndUpdate(
    { _id: sessionId, status: 'active' },
    {
      status: 'completed',
      evaluation: { correctness: input.correctness, quality: input.quality },
      notes: input.notes || '',
    },
    { new: true }
  );
  if (!session) return { error: 'Session not found or already completed' };

  const result = { success: true, message: 'Session completed' };

  // Handle assessment results
  if (session.type === 'assessment') {
    if (input.correctness === 'pass' && (input.quality === 'good' || input.quality === 'excellent')) {
      try {
        const promotion = await promoteBelt(skillId, sessionId);
        result.promotion = promotion;
        result.message = `Assessment passed! Promoted from ${promotion.fromBelt} to ${promotion.toBelt}! You MUST now announce this to the student — celebrate the promotion, summarize their strengths, and describe what the next belt level will involve.`;

        // Emit activity events using context catalog info (no extra DB read)
        if (skillCatalogName) {
          emitBeltPromotion(session.userId, { skillName: skillCatalogName, skillSlug: skillCatalogSlug, fromBelt: promotion.fromBelt, toBelt: promotion.toBelt });
          emitAssessmentPassed(session.userId, { skillName: skillCatalogName, skillSlug: skillCatalogSlug, belt: promotion.toBelt });
        }
      } catch {
        // Promotion failed (e.g. already at max belt)
      }
    } else {
      await failAssessment(skillId);
      result.assessmentFailed = true;
      result.correctness = input.correctness;
      result.quality = input.quality;
      result.message = `Assessment not passed (correctness: ${input.correctness}, quality: ${input.quality}). The student needs more training before retrying. You MUST now write a detailed summary explaining the result, their strengths, weaknesses, and concrete next steps.`;
    }
  }

  // Update streak and check for milestones on all session completions
  const currentStreak = await updateStreak(session.userId);
  if (currentStreak !== null) {
    checkAndEmitStreakMilestone(session.userId, currentStreak);
  }

  return result;
}

async function handleSetBelt(input, { sessionId, skillId, userId, skillCatalogId, skillCatalogName, skillCatalogSlug }) {
  const skill = await UserSkill.findById(skillId);
  if (!skill) return { error: 'Skill not found' };

  const fromBelt = skill.currentBelt;
  const toBelt = input.belt;

  if (fromBelt === toBelt) {
    return { success: true, message: `Belt already set to ${toBelt}`, belt: toBelt };
  }

  skill.currentBelt = toBelt;
  await skill.save();

  await BeltHistory.create({
    userId,
    userSkillId: skillId,
    skillCatalogId: skillCatalogId || skill.skillCatalogId,
    fromBelt,
    toBelt,
    sessionId,
  });

  // Emit activity event using context catalog info (no extra DB read)
  if (skillCatalogName) {
    emitBeltPromotion(userId, {
      skillName: skillCatalogName,
      skillSlug: skillCatalogSlug,
      fromBelt,
      toBelt,
    });
  }

  return { success: true, message: `Belt set to ${toBelt} (was ${fromBelt}). Reason: ${input.reason}`, belt: toBelt };
}

async function handleSetAssessmentAvailable(input, skillId) {
  const skill = await UserSkill.findByIdAndUpdate(
    skillId,
    { assessmentAvailable: input.available },
    { new: true }
  );
  if (!skill) return { error: 'Skill not found' };

  return { success: true, message: `Assessment availability set to ${input.available}. Reason: ${input.reason}` };
}

async function handleSetTrainingContext(input, { skillId, skillCatalogId }) {
  let catalogId = skillCatalogId;
  if (!catalogId) {
    // Defensive fallback: read from DB if context missing
    const skill = await UserSkill.findById(skillId);
    if (!skill) return { error: 'Skill not found' };
    catalogId = skill.skillCatalogId;
  }

  await SkillCatalog.findByIdAndUpdate(catalogId, {
    trainingContext: input.training_context,
  });

  return { success: true, message: 'Training context saved' };
}

async function handlePresentProblem(input, sessionId) {
  await Session.findByIdAndUpdate(sessionId, {
    'problem.prompt': input.prompt,
    'problem.conceptsTargeted': input.concepts_targeted,
    'problem.beltLevel': input.belt_level,
    'problem.starterCode': input.starter_code || '',
    'solution.language': input.language || '',
  });

  return {
    success: true,
    message: 'Problem presented',
    starter_code: input.starter_code || null,
  };
}
