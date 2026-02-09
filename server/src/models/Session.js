import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  role: {
    type: String,
    enum: ['user', 'assistant', 'system'],
    required: true,
  },
  content: {
    type: String,
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

const observationSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['missed_opportunity', 'anti_pattern', 'breakthrough', 'struggle', 'near_miss'],
    required: true,
  },
  concept: { type: String, required: true },
  note: { type: String, default: '' },
  severity: {
    type: String,
    enum: ['minor', 'moderate', 'significant', 'positive'],
    default: 'minor',
  },
}, { _id: false });

const questionSchema = new mongoose.Schema({
  line: Number,
  codeContext: String,
  question: String,
  answer: String,
  conceptRevealed: String,
}, { _id: false });

const sessionSchema = new mongoose.Schema({
  skillId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Skill',
    required: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  date: {
    type: Date,
    default: Date.now,
  },
  type: {
    type: String,
    enum: ['training', 'assessment', 'onboarding', 'kata'],
    default: 'training',
  },
  status: {
    type: String,
    enum: ['active', 'completed', 'abandoned'],
    default: 'active',
  },
  problem: {
    prompt: { type: String, default: '' },
    conceptsTargeted: [String],
    beltLevel: { type: String, default: 'white' },
  },
  solution: {
    submitted: { type: Boolean, default: false },
    passed: { type: Boolean, default: null },
    code: { type: String, default: '' },
    language: { type: String, default: '' },
  },
  evaluation: {
    correctness: {
      type: String,
      enum: ['pass', 'partial', 'fail', null],
      default: null,
    },
    quality: {
      type: String,
      enum: ['needs_work', 'acceptable', 'good', 'excellent', null],
      default: null,
    },
  },
  observations: [observationSchema],
  questions: [questionSchema],
  masteryUpdates: {
    type: Map,
    of: String,
    default: () => new Map(),
  },
  messages: [messageSchema],
  notes: {
    type: String,
    default: '',
  },
}, { timestamps: true });

sessionSchema.index({ userId: 1, skillId: 1 });
sessionSchema.index({ skillId: 1, date: -1 });

export default mongoose.model('Session', sessionSchema);
