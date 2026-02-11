import UserSkill from '../models/UserSkill.js';
import Session from '../models/Session.js';
import BeltHistory from '../models/BeltHistory.js';
import { checkBeltAdvancement, getNextBelt } from './masteryCalc.js';

/**
 * Check if a user is eligible for a belt assessment.
 * Sets assessmentAvailable flag on the UserSkill.
 */
export async function checkAssessmentEligibility(userSkillId) {
  const skill = await UserSkill.findById(userSkillId);
  if (!skill) return { eligible: false, reason: 'Skill not found' };

  const sessionCount = await Session.countDocuments({
    skillId: userSkillId,
    userId: skill.userId,
    status: 'completed',
  });

  const result = checkBeltAdvancement(skill, sessionCount);

  // Update the flag
  if (result.eligible !== skill.assessmentAvailable) {
    skill.assessmentAvailable = result.eligible;
    await skill.save();
  }

  return {
    eligible: result.eligible,
    nextBelt: result.nextBelt,
    details: result.details,
  };
}

/**
 * Promote a user to the next belt after passing an assessment.
 * Creates history record first, then does version-checked belt update.
 * If the update fails due to concurrent modification, rolls back the history record.
 */
export async function promoteBelt(userSkillId, sessionId) {
  const skill = await UserSkill.findById(userSkillId);
  if (!skill) throw new Error('Skill not found');

  const nextBelt = getNextBelt(skill.currentBelt);
  if (!nextBelt) throw new Error('Already at max belt');

  const fromBelt = skill.currentBelt;

  // Create history record FIRST (if this fails, belt hasn't changed yet)
  await BeltHistory.create({
    userId: skill.userId,
    userSkillId: skill._id,
    skillCatalogId: skill.skillCatalogId,
    fromBelt,
    toBelt: nextBelt,
    sessionId,
  });

  // Then promote belt with version check
  const updated = await UserSkill.findOneAndUpdate(
    { _id: userSkillId, __v: skill.__v },
    { currentBelt: nextBelt, assessmentAvailable: false, $inc: { __v: 1 } },
    { new: true }
  );

  if (!updated) {
    // Version conflict — clean up the history record we just created
    await BeltHistory.deleteOne({ userSkillId: skill._id, sessionId });
    throw new Error('Concurrent modification — please retry');
  }

  return { fromBelt, toBelt: nextBelt, skillCatalogId: skill.skillCatalogId, userId: skill.userId };
}

/**
 * Handle assessment failure — provide feedback and reset flag.
 */
export async function failAssessment(userSkillId) {
  await UserSkill.findByIdAndUpdate(userSkillId, {
    assessmentAvailable: false,
  });
}
