import { describe, it, expect } from 'vitest';
import { applyTimeDecay, checkBeltAdvancement, getNextBelt, BELT_ORDER } from '../services/masteryCalc.js';

describe('applyTimeDecay', () => {
  it('returns 0 for null or empty concept', () => {
    expect(applyTimeDecay(null)).toBe(0);
    expect(applyTimeDecay({})).toBe(0);
    expect(applyTimeDecay({ mastery: 0 })).toBe(0);
  });

  it('returns stored mastery for recently seen concept', () => {
    const mastery = applyTimeDecay({
      mastery: 0.75,
      lastSeen: new Date(),
    });
    expect(mastery).toBeCloseTo(0.75, 1);
  });

  it('returns exactly 0.80 for concept at 0.80 mastery seen today', () => {
    const mastery = applyTimeDecay({
      mastery: 0.80,
      lastSeen: new Date(),
    });
    expect(mastery).toBe(0.80);
  });

  it('applies decay for stale concepts', () => {
    const mastery = applyTimeDecay({
      mastery: 0.80,
      lastSeen: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000), // 45 days ago
    });
    // 45/90 = 0.5 decay factor, so 0.80 * 0.5 = 0.40
    expect(mastery).toBeCloseTo(0.40, 1);
  });

  it('fully decays after 90+ days', () => {
    const mastery = applyTimeDecay({
      mastery: 0.90,
      lastSeen: new Date(Date.now() - 100 * 24 * 60 * 60 * 1000), // 100 days ago
    });
    expect(mastery).toBe(0);
  });

  it('returns 0 when lastSeen is null', () => {
    const mastery = applyTimeDecay({
      mastery: 0.75,
      lastSeen: null,
    });
    expect(mastery).toBe(0);
  });
});

describe('checkBeltAdvancement', () => {
  it('returns not eligible when at max belt', () => {
    const result = checkBeltAdvancement({ currentBelt: 'black', concepts: new Map() }, 100);
    expect(result.eligible).toBe(false);
    expect(result.nextBelt).toBeNull();
  });

  it('returns not eligible when not enough concepts', () => {
    const concepts = new Map([
      ['var1', { mastery: 0.9, exposureCount: 10, successCount: 9, lastSeen: new Date(), streak: 5, contexts: ['a', 'b'], beltLevel: 'white' }],
    ]);

    const result = checkBeltAdvancement({ currentBelt: 'white', concepts }, 5);
    expect(result.eligible).toBe(false);
    expect(result.details.totalConcepts).toBe(1);
    expect(result.details.requiredConcepts).toBe(2);
  });

  it('returns eligible when all thresholds met', () => {
    const concepts = new Map();
    // Create enough mastered concepts
    for (let i = 0; i < 3; i++) {
      concepts.set(`concept_${i}`, {
        mastery: 0.9,
        exposureCount: 10,
        successCount: 9,
        lastSeen: new Date(),
        streak: 5,
        contexts: ['a', 'b', 'c'],
        observations: [],
        beltLevel: 'white',
      });
    }

    const result = checkBeltAdvancement({ currentBelt: 'white', concepts }, 5);
    expect(result.eligible).toBe(true);
    expect(result.nextBelt).toBe('yellow');
  });

  it('returns not eligible when not enough sessions', () => {
    const concepts = new Map();
    for (let i = 0; i < 3; i++) {
      concepts.set(`concept_${i}`, {
        mastery: 0.9,
        exposureCount: 10,
        successCount: 9,
        lastSeen: new Date(),
        streak: 5,
        contexts: ['a', 'b', 'c'],
        observations: [],
        beltLevel: 'white',
      });
    }

    const result = checkBeltAdvancement({ currentBelt: 'white', concepts }, 0); // 0 sessions
    expect(result.eligible).toBe(false);
    expect(result.details.sessionCount).toBe(0);
  });
});

describe('getNextBelt', () => {
  it('returns next belt in order', () => {
    expect(getNextBelt('white')).toBe('yellow');
    expect(getNextBelt('yellow')).toBe('orange');
    expect(getNextBelt('brown')).toBe('black');
  });

  it('returns null for black belt', () => {
    expect(getNextBelt('black')).toBeNull();
  });

  it('returns null for invalid belt', () => {
    expect(getNextBelt('invalid')).toBeNull();
  });
});

describe('BELT_ORDER', () => {
  it('has correct number of belts', () => {
    expect(BELT_ORDER).toHaveLength(8);
  });

  it('starts with white and ends with black', () => {
    expect(BELT_ORDER[0]).toBe('white');
    expect(BELT_ORDER[BELT_ORDER.length - 1]).toBe('black');
  });
});
