import mongoose from 'mongoose';

const skillCatalogSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  description: {
    type: String,
    default: '',
  },
  icon: {
    type: String,
    default: null,
  },
  category: {
    type: String,
    enum: ['technology', 'life', 'food', 'music', 'fitness', 'language', 'science', 'business', 'art', 'other'],
    default: 'technology',
  },
  trainingContext: {
    type: String,
    default: '',
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  usedByCount: {
    type: Number,
    default: 0,
  },
}, { timestamps: true });

skillCatalogSchema.index({ name: 'text' });

export default mongoose.model('SkillCatalog', skillCatalogSchema);
