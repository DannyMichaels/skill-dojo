/**
 * Mastery calculation with recency weighting, context variety,
 * streak, time decay, and observation severity.
 *
 * Belt advancement thresholds.
 */

const BELT_ORDER = ['white', 'yellow', 'orange', 'green', 'blue', 'purple', 'brown', 'black'];

const BELT_THRESHOLDS = {
  white:  { conceptPct: 0.60, minSessions: 1,  minConcepts: 2  },
  yellow: { conceptPct: 0.70, minSessions: 3,  minConcepts: 4  },
  orange: { conceptPct: 0.75, minSessions: 5,  minConcepts: 6  },
  green:  { conceptPct: 0.80, minSessions: 8,  minConcepts: 8  },
  blue:   { conceptPct: 0.82, minSessions: 12, minConcepts: 10 },
  purple: { conceptPct: 0.85, minSessions: 16, minConcepts: 12 },
  brown:  { conceptPct: 0.88, minSessions: 20, minConcepts: 15 },
  black:  { conceptPct: 0.90, minSessions: 25, minConcepts: 18 },
};

// Severity penalties subtracted from raw mastery
const SEVERITY_PENALTY = {
  minor: 0.02,
  moderate: 0.05,
  significant: 0.10,
  positive: -0.03, // bonus
};

/**
 * Compute mastery for a single concept.
 * @param {Object} concept - concept data from UserSkill.concepts Map
 * @returns {number} 0.0 to 1.0
 */
export function computeMastery(concept) {
  if (!concept || concept.exposureCount === 0) return 0;

  // 1. Base ratio
  const baseRatio = concept.successCount / concept.exposureCount;

  // 2. Recency weighting — recent performance matters more
  //    We approximate this with streak bonus
  const streakBonus = Math.min(concept.streak * 0.03, 0.15);

  // 3. Context variety — reward breadth of application
  const contextCount = concept.contexts?.length || 0;
  const contextBonus = Math.min(contextCount * 0.02, 0.10);

  // 4. Time decay — mastery fades without practice
  const daysSinceLastSeen = concept.lastSeen
    ? Math.floor((Date.now() - new Date(concept.lastSeen).getTime()) / (1000 * 60 * 60 * 24))
    : 999;
  const decayFactor = Math.max(0, 1 - (daysSinceLastSeen / 90)); // full decay at 90 days

  // 5. Observation severity — recent negative observations hurt
  const recentObservations = concept.observations || [];
  let observationPenalty = 0;
  for (const obs of recentObservations.slice(-5)) {
    const penalty = SEVERITY_PENALTY[obs] || 0;
    observationPenalty += penalty;
  }

  // 6. Exposure confidence — can't be confident with few data points
  const confidenceFactor = 1 - 0.2 / concept.exposureCount;

  // Composite mastery
  const raw = (baseRatio + streakBonus + contextBonus) * decayFactor * confidenceFactor - observationPenalty;
  return Math.max(0, Math.min(1, raw));
}

/**
 * Check if user is eligible for belt advancement.
 * @param {Object} userSkill - the UserSkill document
 * @param {number} sessionCount - total sessions for this skill
 * @returns {{ eligible: boolean, nextBelt: string|null, details: Object }}
 */
export function checkBeltAdvancement(userSkill, sessionCount) {
  const currentIdx = BELT_ORDER.indexOf(userSkill.currentBelt);
  if (currentIdx >= BELT_ORDER.length - 1) {
    return { eligible: false, nextBelt: null, details: { reason: 'Already at max belt' } };
  }

  const nextBelt = BELT_ORDER[currentIdx + 1];
  const threshold = BELT_THRESHOLDS[userSkill.currentBelt];

  // Count concepts at or below current belt level that are mastered
  const concepts = userSkill.concepts || new Map();
  let totalAtLevel = 0;
  let masteredAtLevel = 0;

  for (const [, data] of concepts) {
    const beltIdx = BELT_ORDER.indexOf(data.beltLevel || 'white');
    if (beltIdx <= currentIdx) {
      totalAtLevel++;
      const mastery = applyTimeDecay(data);
      if (mastery >= 0.8) {
        masteredAtLevel++;
      }
    }
  }

  const conceptPct = totalAtLevel > 0 ? masteredAtLevel / totalAtLevel : 0;
  const meetsConceptPct = conceptPct >= threshold.conceptPct;
  const meetsSessions = sessionCount >= threshold.minSessions;
  const meetsConcepts = totalAtLevel >= threshold.minConcepts;

  return {
    eligible: meetsConceptPct && meetsSessions && meetsConcepts,
    nextBelt,
    details: {
      conceptPct: Math.round(conceptPct * 100),
      requiredPct: Math.round(threshold.conceptPct * 100),
      sessionCount,
      requiredSessions: threshold.minSessions,
      totalConcepts: totalAtLevel,
      requiredConcepts: threshold.minConcepts,
      masteredConcepts: masteredAtLevel,
    },
  };
}

/**
 * Get the next belt in the belt order.
 */
export function getNextBelt(currentBelt) {
  const idx = BELT_ORDER.indexOf(currentBelt);
  if (idx < 0 || idx >= BELT_ORDER.length - 1) return null;
  return BELT_ORDER[idx + 1];
}

/**
 * Apply time decay to a concept's stored mastery.
 * Used at read-time to reflect staleness between sessions.
 * Claude sets "fresh" mastery; this handles display/scheduling decay.
 * @param {Object} concept - concept data from UserSkill.concepts Map
 * @returns {number} 0.0 to 1.0
 */
export function applyTimeDecay(concept) {
  if (!concept || !concept.mastery) return 0;
  const daysSince = concept.lastSeen
    ? Math.floor((Date.now() - new Date(concept.lastSeen).getTime()) / (1000 * 60 * 60 * 24))
    : 999;
  const decayFactor = Math.max(0, 1 - (daysSince / 90));
  return Math.max(0, Math.min(1, concept.mastery * decayFactor));
}

export { BELT_ORDER, BELT_THRESHOLDS };
