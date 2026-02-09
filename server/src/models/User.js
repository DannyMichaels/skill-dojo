import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  passwordHash: {
    type: String,
    required: true,
  },
  name: {
    type: String,
    trim: true,
    default: null,
  },
  created: {
    type: Date,
    default: Date.now,
  },
  lastSession: {
    type: Date,
    default: null,
  },
  totalSessions: {
    type: Number,
    default: 0,
  },
  currentStreak: {
    type: Number,
    default: 0,
  },
  longestStreak: {
    type: Number,
    default: 0,
  },
  preferences: {
    sessionLength: {
      type: String,
      enum: ['short', 'medium', 'long'],
      default: 'medium',
    },
    difficultyPreference: {
      type: String,
      enum: ['comfortable', 'challenging', 'intense'],
      default: 'challenging',
    },
    feedbackStyle: {
      type: String,
      enum: ['encouraging', 'direct', 'minimal'],
      default: 'direct',
    },
  },
});

userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.passwordHash;
  delete obj.__v;
  return obj;
};

export default mongoose.model('User', userSchema);
