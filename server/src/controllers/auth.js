import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import env from '../config/env.js';

function generateToken(userId) {
  return jwt.sign({ userId }, env.jwtSecret, { expiresIn: '7d' });
}

export async function register(req, res, next) {
  try {
    const { email, password, name } = req.body;

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({ email, passwordHash, name });
    const token = generateToken(user._id);

    res.status(201).json({ token, user });
  } catch (err) {
    next(err);
  }
}

export async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = generateToken(user._id);
    res.json({ token, user });
  } catch (err) {
    next(err);
  }
}

export async function getMe(req, res, next) {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ user });
  } catch (err) {
    next(err);
  }
}

export async function updateMe(req, res, next) {
  try {
    const updates = {};
    const { name, preferences } = req.body;

    if (name !== undefined) updates.name = name;
    if (preferences) {
      if (preferences.sessionLength) updates['preferences.sessionLength'] = preferences.sessionLength;
      if (preferences.difficultyPreference) updates['preferences.difficultyPreference'] = preferences.difficultyPreference;
      if (preferences.feedbackStyle) updates['preferences.feedbackStyle'] = preferences.feedbackStyle;
    }

    const user = await User.findByIdAndUpdate(req.userId, updates, { new: true });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ user });
  } catch (err) {
    next(err);
  }
}
