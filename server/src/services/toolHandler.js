import Session from '../models/Session.js';
import UserSkill from '../models/UserSkill.js';
import SkillCatalog from '../models/SkillCatalog.js';

/**
 * Process a tool call from Claude and write results to MongoDB.
 * Returns a tool result to send back to Claude.
 */
export async function handleToolCall(toolCall, { sessionId, skillId, userId }) {
  const { name, input } = toolCall;

  switch (name) {
    case 'record_observation':
      return handleRecordObservation(input, sessionId);

    case 'update_mastery':
      return handleUpdateMastery(input, { sessionId, skillId });

    case 'queue_reinforcement':
      return handleQueueReinforcement(input, { sessionId, skillId });

    case 'complete_session':
      return handleCompleteSession(input, sessionId);

    case 'set_training_context':
      return handleSetTrainingContext(input, skillId);

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
  const skill = await UserSkill.findById(skillId);
  if (!skill) return { error: 'Skill not found' };

  const conceptKey = input.concept.toLowerCase().replace(/\s+/g, '_');
  const existing = skill.concepts.get(conceptKey) || {
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

  existing.exposureCount += 1;
  existing.lastSeen = new Date();

  if (input.success) {
    existing.successCount += 1;
    existing.streak += 1;
  } else {
    existing.streak = 0;
  }

  // Simple mastery calculation (Phase 4 will have the full formula)
  existing.mastery = Math.min(1, existing.successCount / Math.max(existing.exposureCount, 1));

  if (input.context && !existing.contexts.includes(input.context)) {
    existing.contexts.push(input.context);
  }

  if (input.belt_level) {
    existing.beltLevel = input.belt_level;
  }

  skill.concepts.set(conceptKey, existing);
  await skill.save();

  // Record mastery update in session log
  await Session.findByIdAndUpdate(sessionId, {
    [`masteryUpdates.${conceptKey}`]: `${(existing.mastery * 100).toFixed(0)}%`,
  });

  return { success: true, concept: conceptKey, mastery: existing.mastery };
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

async function handleCompleteSession(input, sessionId) {
  await Session.findByIdAndUpdate(sessionId, {
    status: 'completed',
    'evaluation.correctness': input.correctness,
    'evaluation.quality': input.quality,
    notes: input.notes || '',
  });
  return { success: true, message: 'Session completed' };
}

async function handleSetTrainingContext(input, skillId) {
  const skill = await UserSkill.findById(skillId);
  if (!skill) return { error: 'Skill not found' };

  await SkillCatalog.findByIdAndUpdate(skill.skillCatalogId, {
    trainingContext: input.training_context,
  });

  return { success: true, message: 'Training context saved' };
}

async function handlePresentProblem(input, sessionId) {
  await Session.findByIdAndUpdate(sessionId, {
    'problem.prompt': input.prompt,
    'problem.conceptsTargeted': input.concepts_targeted,
    'problem.beltLevel': input.belt_level,
    'solution.language': input.language || '',
  });

  return {
    success: true,
    message: 'Problem presented',
    starter_code: input.starter_code || null,
  };
}
