import mongoose from 'mongoose';

const conceptSchema = new mongoose.Schema({
  mastery: { type: Number, default: 0 },
  exposureCount: { type: Number, default: 0 },
  successCount: { type: Number, default: 0 },
  lastSeen: { type: Date, default: null },
  streak: { type: Number, default: 0 },
  contexts: [String],
  observations: [String],
  beltLevel: { type: String, default: 'white' },
  readyForNewContext: { type: Boolean, default: false },
}, { _id: false });

const reinforcementItemSchema = new mongoose.Schema({
  concept: { type: String, required: true },
  context: { type: String, default: null },
  priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
  attempts: { type: Number, default: 0 },
  sourceSession: { type: mongoose.Schema.Types.ObjectId, ref: 'Session', default: null },
}, { _id: false });

const beltHistorySchema = new mongoose.Schema({
  belt: { type: String, required: true },
  achievedAt: { type: Date, default: Date.now },
  sessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Session', default: null },
}, { _id: false });

const skillSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  skillName: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
  },
  currentBelt: {
    type: String,
    enum: ['white', 'yellow', 'orange', 'green', 'blue', 'purple', 'brown', 'black'],
    default: 'white',
  },
  assessmentAvailable: {
    type: Boolean,
    default: false,
  },
  beltHistory: [beltHistorySchema],
  trainingContext: {
    type: String,
    default: '',
  },
  concepts: {
    type: Map,
    of: conceptSchema,
    default: () => new Map(),
  },
  reinforcementQueue: [reinforcementItemSchema],
}, { timestamps: true });

skillSchema.index({ userId: 1, skillName: 1 }, { unique: true });

export default mongoose.model('Skill', skillSchema);
