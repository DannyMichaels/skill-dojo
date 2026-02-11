/**
 * Claude tool definitions for training sessions.
 * These tools let Claude write structured data back to MongoDB
 * through the tool handler.
 */

export const TRAINING_TOOLS = [
  {
    name: 'record_observation',
    description: 'Record an observation about the student\'s code or behavior during this session. Use this whenever you notice a pattern — positive or negative.',
    input_schema: {
      type: 'object',
      properties: {
        type: {
          type: 'string',
          enum: ['missed_opportunity', 'anti_pattern', 'breakthrough', 'struggle', 'near_miss'],
          description: 'The type of observation',
        },
        concept: {
          type: 'string',
          description: 'The concept this observation relates to (e.g. "recursion", "duck_typing", "error_handling")',
        },
        note: {
          type: 'string',
          description: 'Specific, actionable description of what you observed',
        },
        severity: {
          type: 'string',
          enum: ['minor', 'moderate', 'significant', 'positive'],
          description: 'How important this observation is',
        },
      },
      required: ['type', 'concept', 'note', 'severity'],
    },
  },
  {
    name: 'update_mastery',
    description: 'Update mastery data for a concept after evaluating the student\'s work. Call this for each concept that was exercised in the session.',
    input_schema: {
      type: 'object',
      properties: {
        concept: {
          type: 'string',
          description: 'The concept name (e.g. "array_methods", "closures")',
        },
        success: {
          type: 'boolean',
          description: 'Whether the student demonstrated this concept correctly',
        },
        context: {
          type: 'string',
          description: 'The context in which this concept was applied (e.g. "data_transformation", "error_handling")',
        },
        belt_level: {
          type: 'string',
          enum: ['white', 'yellow', 'orange', 'green', 'blue', 'purple', 'brown', 'black'],
          description: 'The belt level at which this concept typically emerges',
        },
        mastery: {
          type: 'number',
          minimum: 0,
          maximum: 1,
          description: 'Your assessed mastery score (0.0-1.0) based on holistic judgment. Factor in quality, recurring patterns, help needed, context variety. Can decrease for recurring errors. Set to the student\'s demonstrated level RIGHT NOW — time decay is applied automatically. If omitted, mastery is computed from counters.',
        },
      },
      required: ['concept', 'success'],
    },
  },
  {
    name: 'queue_reinforcement',
    description: 'Add a concept to the reinforcement queue for future sessions. Use when you notice a concept needs more practice.',
    input_schema: {
      type: 'object',
      properties: {
        concept: {
          type: 'string',
          description: 'The concept to reinforce',
        },
        context: {
          type: 'string',
          description: 'A new context to try this concept in',
        },
        priority: {
          type: 'string',
          enum: ['low', 'medium', 'high'],
          description: 'How urgently this needs reinforcement',
        },
      },
      required: ['concept', 'priority'],
    },
  },
  {
    name: 'complete_session',
    description: 'Mark the session as complete with a summary evaluation. Call this when the training problem has been fully evaluated.',
    input_schema: {
      type: 'object',
      properties: {
        correctness: {
          type: 'string',
          enum: ['pass', 'partial', 'fail'],
          description: 'Whether the solution was correct',
        },
        quality: {
          type: 'string',
          enum: ['needs_work', 'acceptable', 'good', 'excellent'],
          description: 'Quality of the code',
        },
        notes: {
          type: 'string',
          description: 'Brief summary notes about the session',
        },
      },
      required: ['correctness', 'quality'],
    },
  },
  {
    name: 'set_training_context',
    description: 'Set the training context for this skill in the catalog. Call this during onboarding after you understand what the skill involves.',
    input_schema: {
      type: 'object',
      properties: {
        training_context: {
          type: 'string',
          description: 'The full training context — what makes code idiomatic, key concept areas, anti-patterns to watch for, evaluation criteria',
        },
      },
      required: ['training_context'],
    },
  },
  {
    name: 'set_belt',
    description: 'Set the student\'s belt level during onboarding. Only valid during onboarding sessions. Use this after observing the student\'s ability level.',
    input_schema: {
      type: 'object',
      properties: {
        belt: {
          type: 'string',
          enum: ['white', 'yellow', 'orange', 'green', 'blue', 'purple', 'brown', 'black'],
          description: 'The belt level to assign',
        },
        reason: {
          type: 'string',
          description: 'Brief justification for the belt assignment',
        },
      },
      required: ['belt', 'reason'],
    },
  },
  {
    name: 'present_problem',
    description: 'Record a training problem\'s metadata AND populate the student\'s code editor. IMPORTANT: You MUST also include the full problem in your chat response. For programming skills, include starter_code and language to pre-fill the code editor. For non-programming skills (e.g. cooking, music), set starter_code and language to empty strings — the student will respond via chat instead.',
    input_schema: {
      type: 'object',
      properties: {
        prompt: {
          type: 'string',
          description: 'The problem description — a clear, concrete scenario',
        },
        concepts_targeted: {
          type: 'array',
          items: { type: 'string' },
          description: 'Which concepts this problem is designed to exercise',
        },
        belt_level: {
          type: 'string',
          enum: ['white', 'yellow', 'orange', 'green', 'blue', 'purple', 'brown', 'black'],
          description: 'The difficulty level of this problem',
        },
        starter_code: {
          type: 'string',
          description: 'Starter code that will be loaded into the student\'s code editor. For non-code skills, set to an empty string.',
        },
        language: {
          type: 'string',
          description: 'The programming language — sets the editor\'s syntax highlighting (e.g. "ruby", "python", "javascript"). For non-code skills, set to an empty string.',
        },
      },
      required: ['prompt', 'concepts_targeted', 'belt_level'],
    },
  },
];

export default TRAINING_TOOLS;
