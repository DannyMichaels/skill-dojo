import Activity from '../models/Activity.js';
import User from '../models/User.js';

/**
 * Fire-and-forget activity emissions.
 * Errors are logged but never thrown to avoid breaking the caller.
 */

export async function emitSkillStarted(userId, { skillName, skillSlug }) {
  try {
    await Activity.create({
      userId,
      type: 'skill_started',
      data: { skillName, skillSlug },
    });
  } catch (err) {
    console.error('Failed to emit skill_started activity:', err.message);
  }
}

export async function emitBeltPromotion(userId, { skillName, skillSlug, fromBelt, toBelt }) {
  try {
    await Activity.create({
      userId,
      type: 'belt_promotion',
      data: { skillName, skillSlug, fromBelt, toBelt },
    });
  } catch (err) {
    console.error('Failed to emit belt_promotion activity:', err.message);
  }
}

export async function emitAssessmentPassed(userId, { skillName, skillSlug, belt }) {
  try {
    await Activity.create({
      userId,
      type: 'assessment_passed',
      data: { skillName, skillSlug, belt },
    });
  } catch (err) {
    console.error('Failed to emit assessment_passed activity:', err.message);
  }
}

export async function updateStreak(userId) {
  try {
    const user = await User.findById(userId).select('lastSession currentStreak longestStreak totalSessions');
    if (!user) return;

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    if (user.lastSession) {
      const lastDate = new Date(user.lastSession);
      const lastDay = new Date(lastDate.getFullYear(), lastDate.getMonth(), lastDate.getDate());
      const diffDays = Math.floor((today - lastDay) / (1000 * 60 * 60 * 24));

      if (diffDays === 0) {
        // Same day — just update lastSession, no streak change
        user.lastSession = now;
      } else if (diffDays === 1) {
        // Consecutive day — increment streak
        user.currentStreak += 1;
        user.longestStreak = Math.max(user.longestStreak, user.currentStreak);
        user.lastSession = now;
      } else {
        // Gap — reset streak to 1
        user.currentStreak = 1;
        user.lastSession = now;
      }
    } else {
      // First session ever
      user.currentStreak = 1;
      user.longestStreak = Math.max(user.longestStreak, 1);
      user.lastSession = now;
    }

    user.totalSessions += 1;
    await user.save();
    return user.currentStreak;
  } catch (err) {
    console.error('Failed to update streak:', err.message);
    return null;
  }
}

const STREAK_MILESTONES = [7, 14, 30, 60, 100];

export async function checkAndEmitStreakMilestone(userId, currentStreak) {
  try {
    let streak = currentStreak;
    if (streak == null) {
      const user = await User.findById(userId).select('currentStreak').lean();
      if (!user) return;
      streak = user.currentStreak;
    }
    if (!STREAK_MILESTONES.includes(streak)) return;

    // Deduplicate: check if we already emitted this milestone
    const existing = await Activity.findOne({
      userId,
      type: 'streak_milestone',
      'data.streakDays': streak,
    }).lean();

    if (!existing) {
      await Activity.create({
        userId,
        type: 'streak_milestone',
        data: { streakDays: streak },
      });
    }
  } catch (err) {
    console.error('Failed to check/emit streak milestone:', err.message);
  }
}
