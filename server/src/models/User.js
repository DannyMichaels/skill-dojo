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
  username: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    minlength: 3,
    maxlength: 30,
    match: /^[a-z0-9_-]+$/,
  },
  bio: {
    type: String,
    maxlength: 500,
    default: '',
  },
  avatarUrl: {
    type: String,
    default: null,
  },
  avatar: {
    type: String,
    default: null,
  },
  emailVerified: {
    type: Boolean,
    default: false,
  },
  verificationCodeHash: {
    type: String,
    default: null,
  },
  verificationCodeExpiresAt: {
    type: Date,
    default: null,
  },
  passwordResetCodeHash: {
    type: String,
    default: null,
  },
  passwordResetCodeExpiresAt: {
    type: Date,
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
  delete obj.verificationCodeHash;
  delete obj.verificationCodeExpiresAt;
  delete obj.passwordResetCodeHash;
  delete obj.passwordResetCodeExpiresAt;
  return obj;
};

export default mongoose.model('User', userSchema);
