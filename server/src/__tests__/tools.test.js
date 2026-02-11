import { describe, it, expect, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import { handleToolCall } from '../services/toolHandler.js';
import Session from '../models/Session.js';
import UserSkill from '../models/UserSkill.js';
import SkillCatalog from '../models/SkillCatalog.js';
import User from '../models/User.js';

let user, catalog, skill, session, ctx;

beforeEach(async () => {
  user = await User.create({
    email: `tools-${Date.now()}@dojo.test`,
    passwordHash: 'hashedpass',
    username: `toolsuser${Date.now()}`,
    name: 'Tools Tester',
  });

  catalog = await SkillCatalog.create({
    name: 'JavaScript',
    slug: `javascript-${Date.now()}`,
    createdBy: user._id,
  });

  skill = await UserSkill.create({
    userId: user._id,
    skillCatalogId: catalog._id,
  });

  session = await Session.create({
    skillId: skill._id,
    userId: user._id,
    type: 'training',
  });

  ctx = {
    sessionId: session._id,
    skillId: skill._id,
    userId: user._id,
    skillCatalogId: catalog._id,
    skillCatalogName: catalog.name,
    skillCatalogSlug: catalog.slug,
  };
});

describe('record_observation', () => {
  it('pushes observation to session', async () => {
    const result = await handleToolCall(
      {
        name: 'record_observation',
        input: {
          type: 'anti_pattern',
          concept: 'enumerable',
          note: 'Used each + push instead of map',
          severity: 'moderate',
        },
      },
      ctx
    );

    expect(result.success).toBe(true);

    const updated = await Session.findById(session._id);
    expect(updated.observations).toHaveLength(1);
    expect(updated.observations[0].type).toBe('anti_pattern');
    expect(updated.observations[0].concept).toBe('enumerable');
    expect(updated.observations[0].note).toBe('Used each + push instead of map');
    expect(updated.observations[0].severity).toBe('moderate');
  });

  it('accumulates multiple observations', async () => {
    await handleToolCall(
      {
        name: 'record_observation',
        input: { type: 'breakthrough', concept: 'closures', note: 'Used closure elegantly', severity: 'positive' },
      },
      ctx
    );
    await handleToolCall(
      {
        name: 'record_observation',
        input: { type: 'struggle', concept: 'recursion', note: 'Base case incorrect', severity: 'moderate' },
      },
      ctx
    );

    const updated = await Session.findById(session._id);
    expect(updated.observations).toHaveLength(2);
  });
});

describe('update_mastery', () => {
  it('creates new concept and updates mastery on success', async () => {
    const result = await handleToolCall(
      {
        name: 'update_mastery',
        input: { concept: 'Array Methods', success: true, mastery: 0.85, context: 'data_transformation', belt_level: 'yellow' },
      },
      ctx
    );

    expect(result.success).toBe(true);
    expect(result.concept).toBe('array_methods');
    expect(result.mastery).toBe(0.85);

    const updated = await UserSkill.findById(skill._id);
    const concept = updated.concepts.get('array_methods');
    expect(concept).toBeDefined();
    expect(concept.exposureCount).toBe(1);
    expect(concept.successCount).toBe(1);
    expect(concept.streak).toBe(1);
    expect(concept.contexts).toContain('data_transformation');
    expect(concept.beltLevel).toBe('yellow');
    expect(concept.lastSeen).toBeInstanceOf(Date);
  });

  it('tracks failure and resets streak', async () => {
    // First: success
    await handleToolCall(
      { name: 'update_mastery', input: { concept: 'recursion', success: true, mastery: 0.7 } },
      ctx
    );
    // Second: failure
    const result = await handleToolCall(
      { name: 'update_mastery', input: { concept: 'recursion', success: false, mastery: 0.45 } },
      ctx
    );

    expect(result.mastery).toBe(0.45);

    const updated = await UserSkill.findById(skill._id);
    const concept = updated.concepts.get('recursion');
    expect(concept.exposureCount).toBe(2);
    expect(concept.successCount).toBe(1);
    expect(concept.streak).toBe(0);
  });

  it('records mastery update in session with from -> to format', async () => {
    await handleToolCall(
      { name: 'update_mastery', input: { concept: 'closures', success: true, mastery: 0.82 } },
      ctx
    );

    const updated = await Session.findById(session._id);
    expect(updated.masteryUpdates.get('closures')).toBe('0% -> 82%');
  });

  it('uses Claude-provided mastery score', async () => {
    const result = await handleToolCall(
      { name: 'update_mastery', input: { concept: 'closures', success: false, mastery: 0.25 } },
      ctx
    );

    expect(result.success).toBe(true);
    expect(result.mastery).toBe(0.25);

    const updated = await UserSkill.findById(skill._id);
    const concept = updated.concepts.get('closures');
    expect(concept.mastery).toBe(0.25);
  });

  it('allows mastery to decrease', async () => {
    // First call: set mastery to 0.5
    await handleToolCall(
      { name: 'update_mastery', input: { concept: 'loops', success: true, mastery: 0.5 } },
      ctx
    );

    // Second call: decrease mastery to 0.45
    const result = await handleToolCall(
      { name: 'update_mastery', input: { concept: 'loops', success: false, mastery: 0.45 } },
      ctx
    );

    expect(result.mastery).toBe(0.45);

    const updated = await UserSkill.findById(skill._id);
    expect(updated.concepts.get('loops').mastery).toBe(0.45);
  });

  it('returns error for non-existent skill', async () => {
    const fakeId = new mongoose.Types.ObjectId();
    const result = await handleToolCall(
      { name: 'update_mastery', input: { concept: 'test', success: true } },
      { sessionId: session._id, skillId: fakeId, userId: user._id }
    );

    expect(result.error).toBe('Skill not found');
  });
});

describe('queue_reinforcement', () => {
  it('adds item to reinforcement queue', async () => {
    const result = await handleToolCall(
      {
        name: 'queue_reinforcement',
        input: { concept: 'duck_typing', context: 'polymorphic_interfaces', priority: 'high' },
      },
      ctx
    );

    expect(result.success).toBe(true);

    const updated = await UserSkill.findById(skill._id);
    expect(updated.reinforcementQueue).toHaveLength(1);
    expect(updated.reinforcementQueue[0].concept).toBe('duck_typing');
    expect(updated.reinforcementQueue[0].context).toBe('polymorphic_interfaces');
    expect(updated.reinforcementQueue[0].priority).toBe('high');
    expect(updated.reinforcementQueue[0].attempts).toBe(0);
    expect(updated.reinforcementQueue[0].sourceSession.toString()).toBe(session._id.toString());
  });
});

describe('complete_session', () => {
  it('marks session as completed with evaluation', async () => {
    const result = await handleToolCall(
      {
        name: 'complete_session',
        input: { correctness: 'pass', quality: 'good', notes: 'Strong session overall' },
      },
      ctx
    );

    expect(result.success).toBe(true);

    const updated = await Session.findById(session._id);
    expect(updated.status).toBe('completed');
    expect(updated.evaluation.correctness).toBe('pass');
    expect(updated.evaluation.quality).toBe('good');
    expect(updated.notes).toBe('Strong session overall');
  });
});

describe('set_training_context', () => {
  it('updates training context on the catalog entry', async () => {
    const result = await handleToolCall(
      {
        name: 'set_training_context',
        input: { training_context: 'JavaScript is a dynamic language. Focus on closures, prototypes, and async patterns.' },
      },
      ctx
    );

    expect(result.success).toBe(true);

    const updated = await SkillCatalog.findById(catalog._id);
    expect(updated.trainingContext).toBe('JavaScript is a dynamic language. Focus on closures, prototypes, and async patterns.');
  });

  it('returns error for non-existent skill', async () => {
    const fakeId = new mongoose.Types.ObjectId();
    const result = await handleToolCall(
      { name: 'set_training_context', input: { training_context: 'test' } },
      { sessionId: session._id, skillId: fakeId, userId: user._id }
    );

    expect(result.error).toBe('Skill not found');
  });
});

describe('present_problem', () => {
  it('stores problem data and language on session', async () => {
    const result = await handleToolCall(
      {
        name: 'present_problem',
        input: {
          prompt: 'Write a function that reverses a linked list',
          concepts_targeted: ['linked_lists', 'recursion'],
          belt_level: 'green',
          starter_code: 'function reverseList(head) {\n  // your code\n}',
          language: 'javascript',
        },
      },
      ctx
    );

    expect(result.success).toBe(true);
    expect(result.starter_code).toBe('function reverseList(head) {\n  // your code\n}');

    const updated = await Session.findById(session._id);
    expect(updated.problem.prompt).toBe('Write a function that reverses a linked list');
    expect(updated.problem.conceptsTargeted).toEqual(['linked_lists', 'recursion']);
    expect(updated.problem.beltLevel).toBe('green');
    expect(updated.solution.language).toBe('javascript');
  });
});

describe('unknown tool', () => {
  it('returns error for unknown tool name', async () => {
    const result = await handleToolCall(
      { name: 'nonexistent_tool', input: {} },
      ctx
    );

    expect(result.error).toBe('Unknown tool: nonexistent_tool');
  });
});
