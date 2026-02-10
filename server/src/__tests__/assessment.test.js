import { describe, it, expect, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import { checkAssessmentEligibility, promoteBelt, failAssessment } from '../services/assessmentService.js';
import User from '../models/User.js';
import SkillCatalog from '../models/SkillCatalog.js';
import UserSkill from '../models/UserSkill.js';
import Session from '../models/Session.js';
import BeltHistory from '../models/BeltHistory.js';

let user, catalog, skill;

beforeEach(async () => {
  user = await User.create({
    email: `assess-${Date.now()}@dojo.test`,
    passwordHash: 'hashedpass',
    username: `assessuser${Date.now()}`,
  });

  catalog = await SkillCatalog.create({
    name: 'JavaScript',
    slug: `javascript-${Date.now()}`,
  });

  skill = await UserSkill.create({
    userId: user._id,
    skillCatalogId: catalog._id,
  });
});

describe('checkAssessmentEligibility', () => {
  it('returns not eligible when no concepts', async () => {
    const result = await checkAssessmentEligibility(skill._id);
    expect(result.eligible).toBe(false);
  });

  it('returns eligible when thresholds are met', async () => {
    // Add enough mastered concepts
    const concepts = new Map();
    for (let i = 0; i < 3; i++) {
      concepts.set(`concept_${i}`, {
        mastery: 0.95,
        exposureCount: 10,
        successCount: 9,
        lastSeen: new Date(),
        streak: 5,
        contexts: ['a', 'b', 'c'],
        observations: [],
        beltLevel: 'white',
      });
    }
    skill.concepts = concepts;
    await skill.save();

    // Create enough completed sessions
    for (let i = 0; i < 5; i++) {
      await Session.create({
        skillId: skill._id,
        userId: user._id,
        status: 'completed',
      });
    }

    const result = await checkAssessmentEligibility(skill._id);
    expect(result.eligible).toBe(true);
    expect(result.nextBelt).toBe('yellow');

    // Verify flag was updated
    const updated = await UserSkill.findById(skill._id);
    expect(updated.assessmentAvailable).toBe(true);
  });
});

describe('promoteBelt', () => {
  it('promotes to next belt and creates history entry', async () => {
    const session = await Session.create({
      skillId: skill._id,
      userId: user._id,
      type: 'assessment',
    });

    const result = await promoteBelt(skill._id, session._id);
    expect(result.fromBelt).toBe('white');
    expect(result.toBelt).toBe('yellow');

    const updated = await UserSkill.findById(skill._id);
    expect(updated.currentBelt).toBe('yellow');
    expect(updated.assessmentAvailable).toBe(false);

    const history = await BeltHistory.find({ userSkillId: skill._id }).sort({ achievedAt: 1 });
    expect(history.length).toBeGreaterThanOrEqual(1);
    const latest = history[history.length - 1];
    expect(latest.fromBelt).toBe('white');
    expect(latest.toBelt).toBe('yellow');
    expect(latest.sessionId.toString()).toBe(session._id.toString());
  });

  it('throws for max belt', async () => {
    skill.currentBelt = 'black';
    await skill.save();

    await expect(promoteBelt(skill._id, new mongoose.Types.ObjectId()))
      .rejects.toThrow('Already at max belt');
  });
});

describe('failAssessment', () => {
  it('resets assessmentAvailable to false', async () => {
    skill.assessmentAvailable = true;
    await skill.save();

    await failAssessment(skill._id);

    const updated = await UserSkill.findById(skill._id);
    expect(updated.assessmentAvailable).toBe(false);
  });
});
