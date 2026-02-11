import { describe, it, expect } from 'vitest';
import { buildSystemPrompt } from '../services/promptBuilder.js';

describe('promptBuilder', () => {
  it('builds all 5 layers for a training session', async () => {
    const prompt = await buildSystemPrompt({
      skillCatalog: {
        name: 'JavaScript',
        trainingContext: 'Focus on closures, prototypes, and async patterns.',
      },
      userSkill: {
        currentBelt: 'yellow',
        assessmentAvailable: false,
        concepts: new Map([
          ['closures', { mastery: 0.7, exposureCount: 5, successCount: 4, lastSeen: new Date(), streak: 2, contexts: ['callbacks', 'modules'], beltLevel: 'yellow' }],
          ['prototypes', { mastery: 0.3, exposureCount: 3, successCount: 1, lastSeen: new Date(), streak: 0, contexts: ['inheritance'], beltLevel: 'yellow' }],
        ]),
        reinforcementQueue: [
          { concept: 'prototypes', priority: 'high', context: 'delegation' },
        ],
      },
      sessionType: 'training',
    });

    // Layer 1: Core Protocol
    expect(prompt).toContain('training sensei');
    expect(prompt).toContain('Core Philosophy');

    // Layer 2: Skill Context
    expect(prompt).toContain('Skill: JavaScript');
    expect(prompt).toContain('Focus on closures');

    // Layer 3: Current State — enriched concept labels
    expect(prompt).toContain('Current Belt: **yellow**');
    expect(prompt).toContain('Tracked Concepts: 2');
    expect(prompt).toContain('exp:5');
    expect(prompt).toContain('streak:2');
    expect(prompt).toContain('last:0d ago');
    expect(prompt).toContain('Reinforcement Queue: prototypes (high)');

    // Layer 4: Session Instructions
    expect(prompt).toContain('Session Type: Training');
    expect(prompt).toContain('present_problem');

    // Layer 5: Output Format
    expect(prompt).toContain('Output Format');
    expect(prompt).toContain('complete_session');
  });

  it('builds onboarding prompt for new skill', async () => {
    const prompt = await buildSystemPrompt({
      skillCatalog: { name: 'Rust' },
      userSkill: {
        currentBelt: 'white',
        assessmentAvailable: false,
        concepts: new Map(),
        reinforcementQueue: [],
      },
      sessionType: 'onboarding',
    });

    expect(prompt).toContain('Skill: Rust');
    expect(prompt).toContain('new skill being onboarded');
    expect(prompt).toContain('Session Type: Onboarding');
    expect(prompt).toContain('set_training_context');
    expect(prompt).toContain('3-5 graduated challenges');
  });

  it('builds assessment prompt', async () => {
    const prompt = await buildSystemPrompt({
      skillCatalog: { name: 'Python', trainingContext: 'Pythonic code patterns.' },
      userSkill: {
        currentBelt: 'green',
        assessmentAvailable: true,
        concepts: new Map(),
        reinforcementQueue: [],
      },
      sessionType: 'assessment',
    });

    expect(prompt).toContain('Session Type: Belt Assessment');
    expect(prompt).toContain('Current belt: green');
    expect(prompt).toContain('Evaluate strictly');
  });

  it('builds kata prompt', async () => {
    const prompt = await buildSystemPrompt({
      skillCatalog: { name: 'Ruby', trainingContext: 'Ruby idioms.' },
      userSkill: {
        currentBelt: 'blue',
        assessmentAvailable: false,
        concepts: new Map(),
        reinforcementQueue: [],
      },
      sessionType: 'kata',
    });

    expect(prompt).toContain('Session Type: Kata');
    expect(prompt).toContain('maintenance');
  });

  it('includes social stats when provided', async () => {
    const prompt = await buildSystemPrompt({
      skillCatalog: { name: 'Go', trainingContext: 'Go idioms.' },
      userSkill: {
        currentBelt: 'white',
        assessmentAvailable: false,
        concepts: new Map(),
        reinforcementQueue: [],
      },
      sessionType: 'training',
      socialStats: {
        totalStudents: 42,
        avgTimeToNextBelt: '2 weeks',
        recentPromotions: 5,
      },
    });

    expect(prompt).toContain('Community Context');
    expect(prompt).toContain('42 students');
    expect(prompt).toContain('2 weeks');
    expect(prompt).toContain('5 students promoted');
  });

  it('handles null skillCatalog and userSkill gracefully', async () => {
    const prompt = await buildSystemPrompt({
      skillCatalog: null,
      userSkill: null,
      sessionType: 'training',
    });

    expect(prompt).toContain('training sensei');
    expect(prompt).toContain('Session Type: Training');
  });
});
