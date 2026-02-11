import UserSkill from '../models/UserSkill.js';
import SkillCatalog from '../models/SkillCatalog.js';
import Session from '../models/Session.js';
import BeltHistory from '../models/BeltHistory.js';
import { applyTimeDecay, checkBeltAdvancement, BELT_ORDER } from '../services/masteryCalc.js';
import { promoteBelt } from '../services/assessmentService.js';
import { emitBeltPromotion } from '../services/activityService.js';
import { getClient } from '../services/anthropic.js';
import MODELS from '../config/models.js';

// GET /api/progress — Cross-skill dashboard summary
export async function getDashboardProgress(req, res, next) {
  try {
    const skills = await UserSkill.find({ userId: req.userId })
      .populate('skillCatalogId', 'name slug icon category')
      .lean();

    const totalSessions = await Session.countDocuments({ userId: req.userId });
    const completedSessions = await Session.countDocuments({
      userId: req.userId,
      status: 'completed',
    });

    const skillSummaries = skills.map(skill => {
      const concepts = skill.concepts || {};
      let totalMastery = 0;
      let conceptCount = 0;

      for (const [, data] of Object.entries(concepts)) {
        totalMastery += applyTimeDecay(data);
        conceptCount++;
      }

      return {
        _id: skill._id,
        name: skill.skillCatalogId?.name || 'Unknown',
        slug: skill.skillCatalogId?.slug || '',
        currentBelt: skill.currentBelt,
        conceptCount,
        avgMastery: conceptCount > 0 ? Math.round((totalMastery / conceptCount) * 100) : 0,
        assessmentAvailable: skill.assessmentAvailable,
      };
    });

    res.json({
      progress: {
        totalSkills: skills.length,
        totalSessions,
        completedSessions,
        skills: skillSummaries,
      },
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/progress/:skillId/belt-info — Belt advancement details
export async function getBeltInfo(req, res, next) {
  try {
    const skill = await UserSkill.findOne({
      _id: req.params.skillId,
      userId: req.userId,
    });

    if (!skill) {
      return res.status(404).json({ error: 'Skill not found' });
    }

    const sessionCount = await Session.countDocuments({
      skillId: skill._id,
      userId: req.userId,
      status: { $ne: 'abandoned' },
    });

    const advancement = checkBeltAdvancement(skill, sessionCount);
    const currentIdx = BELT_ORDER.indexOf(skill.currentBelt);

    res.json({
      beltInfo: {
        currentBelt: skill.currentBelt,
        nextBelt: advancement.nextBelt,
        eligible: advancement.eligible,
        beltOrder: BELT_ORDER,
        currentBeltIndex: currentIdx,
        details: advancement.details,
      },
    });
  } catch (err) {
    next(err);
  }
}

// POST /api/progress/:skillId/promote — Manual belt promotion when eligible
export async function manualPromote(req, res, next) {
  try {
    const skill = await UserSkill.findOne({
      _id: req.params.skillId,
      userId: req.userId,
    });

    if (!skill) {
      return res.status(404).json({ error: 'Skill not found' });
    }

    const promotion = await promoteBelt(skill._id, null);

    // Emit activity
    const catalog = await SkillCatalog.findById(skill.skillCatalogId).select('name slug');
    if (catalog) {
      emitBeltPromotion(req.userId, {
        skillName: catalog.name,
        skillSlug: catalog.slug,
        fromBelt: promotion.fromBelt,
        toBelt: promotion.toBelt,
      });
    }

    res.json({
      promotion: {
        fromBelt: promotion.fromBelt,
        toBelt: promotion.toBelt,
      },
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/progress/:skillId/belt-analysis — AI-powered belt analysis
export async function getBeltAnalysis(req, res, next) {
  try {
    const skill = await UserSkill.findOne({
      _id: req.params.skillId,
      userId: req.userId,
    });

    if (!skill) {
      return res.status(404).json({ error: 'Skill not found' });
    }

    const catalog = await SkillCatalog.findById(skill.skillCatalogId).select('name slug').lean();

    const sessionCount = await Session.countDocuments({
      skillId: skill._id,
      userId: req.userId,
      status: { $ne: 'abandoned' },
    });

    const recentSessions = await Session.find({
      skillId: skill._id,
      userId: req.userId,
      status: 'completed',
    })
      .select('date type evaluation observations notes')
      .sort({ date: -1 })
      .limit(5)
      .lean();

    const advancement = checkBeltAdvancement(skill, sessionCount);

    // Build concept summary
    const concepts = skill.concepts || new Map();
    const conceptSummary = [];
    for (const [name, data] of concepts) {
      const mastery = applyTimeDecay(data);
      conceptSummary.push({
        name,
        mastery: Math.round(mastery * 100),
        streak: data.streak || 0,
        exposureCount: data.exposureCount || 0,
        beltLevel: data.beltLevel || 'white',
      });
    }

    const sessionSummary = recentSessions.map(s => ({
      date: s.date,
      type: s.type,
      correctness: s.evaluation?.correctness,
      quality: s.evaluation?.quality,
      observationCount: s.observations?.length || 0,
    }));

    const prompt = `You are an AI training coach analyzing a student's progress in ${catalog?.name || 'programming'}.

Current belt: ${skill.currentBelt}
Next belt: ${advancement.nextBelt || 'max belt reached'}
Total sessions: ${sessionCount}
Assessment available (JS heuristic): ${skill.assessmentAvailable ? 'Yes' : 'No'}

Concept mastery:
${conceptSummary.map(c => `- ${c.name}: ${c.mastery}% (streak: ${c.streak}, exposures: ${c.exposureCount}, belt level: ${c.beltLevel})`).join('\n') || 'No concepts tracked yet'}

Recent sessions:
${sessionSummary.map(s => `- ${new Date(s.date).toLocaleDateString()}: ${s.type} — ${s.correctness}/${s.quality} (${s.observationCount} observations)`).join('\n') || 'No completed sessions yet'}

Belt advancement thresholds (for reference only — use your judgment):
${JSON.stringify(advancement.details, null, 2)}

Respond with a JSON object containing exactly two fields:
- "analysis": A markdown string (3-5 paragraphs) covering strengths, areas for improvement, recommended next steps, and assessment readiness. Be encouraging but honest.
- "readyForPromotion": A boolean. true ONLY if you genuinely believe the student has demonstrated enough mastery, consistency, and breadth to earn the next belt right now. Consider the full picture — concept mastery levels, session history, streaks, variety of contexts. Don't just check thresholds mechanically; use your judgment as a teacher. If there are gaps or the student hasn't proven themselves across enough contexts, say false even if numbers look okay.

Respond ONLY with the JSON object, no other text.`;

    const client = getClient();
    const response = await client.messages.create({
      model: MODELS.HAIKU,
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    });

    const rawText = response.content
      .filter(b => b.type === 'text')
      .map(b => b.text)
      .join('');

    let analysis = rawText;
    let readyForPromotion = false;

    try {
      // Strip markdown code fences if present
      const cleaned = rawText.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/, '');
      const parsed = JSON.parse(cleaned);
      analysis = parsed.analysis || rawText;
      readyForPromotion = parsed.readyForPromotion === true;
    } catch {
      // If JSON parsing fails, use the raw text as analysis
    }

    const currentIdx = BELT_ORDER.indexOf(skill.currentBelt);

    res.json({
      beltAnalysis: {
        currentBelt: skill.currentBelt,
        nextBelt: advancement.nextBelt,
        eligible: advancement.eligible,
        beltOrder: BELT_ORDER,
        currentBeltIndex: currentIdx,
        details: advancement.details,
        analysis,
        readyForPromotion,
      },
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/progress/:skillId — Detailed skill progress
export async function getSkillProgress(req, res, next) {
  try {
    const skill = await UserSkill.findOne({
      _id: req.params.skillId,
      userId: req.userId,
    }).populate('skillCatalogId', 'name slug icon category').lean();

    if (!skill) {
      return res.status(404).json({ error: 'Skill not found' });
    }

    const sessionCount = await Session.countDocuments({
      skillId: skill._id,
      userId: req.userId,
    });

    const recentSessions = await Session.find({
      skillId: skill._id,
      userId: req.userId,
    })
      .select('date type status evaluation observations')
      .sort({ date: -1 })
      .limit(10)
      .lean();

    const beltHistory = await BeltHistory.find({ userSkillId: skill._id })
      .sort({ achievedAt: 1 })
      .lean();

    // Compute per-concept mastery
    const concepts = skill.concepts || {};
    const conceptDetails = Object.entries(concepts).map(([name, data]) => ({
      name,
      mastery: Math.round(applyTimeDecay(data) * 100),
      exposureCount: data.exposureCount || 0,
      streak: data.streak || 0,
      contexts: data.contexts || [],
      beltLevel: data.beltLevel || 'white',
      lastSeen: data.lastSeen,
    }));

    res.json({
      progress: {
        skill: {
          name: skill.skillCatalogId?.name,
          slug: skill.skillCatalogId?.slug,
          currentBelt: skill.currentBelt,
          assessmentAvailable: skill.assessmentAvailable,
        },
        sessionCount,
        recentSessions,
        beltHistory,
        concepts: conceptDetails,
        reinforcementQueue: skill.reinforcementQueue || [],
      },
    });
  } catch (err) {
    next(err);
  }
}
