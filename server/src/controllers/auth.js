import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Session from '../models/Session.js';
import UserSkill from '../models/UserSkill.js';
import BeltHistory from '../models/BeltHistory.js';
import Follow from '../models/Follow.js';
import Activity from '../models/Activity.js';
import env from '../config/env.js';
import { generateCode, hashCode, verifyCode } from '../utils/code.js';
import { sendVerificationEmail, sendPasswordResetEmail } from '../services/email.js';

function generateToken(userId) {
  return jwt.sign({ userId }, env.jwtSecret, { expiresIn: '7d' });
}

export async function register(req, res, next) {
  try {
    const { email, password, username, name } = req.body;

    const existingEmail = await User.findOne({ email: email.toLowerCase() });
    if (existingEmail) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const existingUsername = await User.findOne({ username: username.toLowerCase() });
    if (existingUsername) {
      return res.status(409).json({ error: 'Username already taken' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const code = generateCode();
    const codeHash = await hashCode(code);
    const user = await User.create({
      email,
      passwordHash,
      username,
      name,
      verificationCodeHash: codeHash,
      verificationCodeExpiresAt: new Date(Date.now() + 10 * 60 * 1000),
    });
    const token = generateToken(user._id);

    sendVerificationEmail(email, code).catch(() => {});

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

export async function uploadAvatar(req, res, next) {
  try {
    const user = await User.findByIdAndUpdate(
      req.userId,
      { avatar: req.body.avatar },
      { new: true },
    );
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
    const { name, username, bio, avatarUrl, preferences } = req.body;

    if (name !== undefined) updates.name = name;
    if (bio !== undefined) updates.bio = bio;
    if (avatarUrl !== undefined) updates.avatarUrl = avatarUrl;

    if (username !== undefined) {
      // Check uniqueness
      const existing = await User.findOne({ username: username.toLowerCase(), _id: { $ne: req.userId } });
      if (existing) {
        return res.status(409).json({ error: 'Username already taken' });
      }
      updates.username = username.toLowerCase();
    }

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

export async function verifyEmail(req, res, next) {
  try {
    const { code } = req.body;
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (user.emailVerified) return res.json({ user });

    if (!user.verificationCodeHash || !user.verificationCodeExpiresAt) {
      return res.status(400).json({ error: 'No verification code found. Request a new one.' });
    }

    if (user.verificationCodeExpiresAt < new Date()) {
      return res.status(400).json({ error: 'Code expired. Request a new one.' });
    }

    const valid = await verifyCode(code, user.verificationCodeHash);
    if (!valid) return res.status(400).json({ error: 'Invalid code' });

    user.emailVerified = true;
    user.verificationCodeHash = null;
    user.verificationCodeExpiresAt = null;
    await user.save();

    res.json({ user });
  } catch (err) {
    next(err);
  }
}

export async function resendVerificationCode(req, res, next) {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.emailVerified) return res.json({ message: 'Already verified' });

    const code = generateCode();
    const codeHash = await hashCode(code);
    user.verificationCodeHash = codeHash;
    user.verificationCodeExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();

    await sendVerificationEmail(user.email, code);

    res.json({ message: 'Verification code sent' });
  } catch (err) {
    next(err);
  }
}

export async function forgotPassword(req, res, next) {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email: email.toLowerCase() });

    if (user) {
      const code = generateCode();
      const codeHash = await hashCode(code);
      user.passwordResetCodeHash = codeHash;
      user.passwordResetCodeExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
      await user.save();
      sendPasswordResetEmail(user.email, code).catch(() => {});
    }

    res.json({ message: 'If an account exists, a reset code has been sent.' });
  } catch (err) {
    next(err);
  }
}

export async function resetPassword(req, res, next) {
  try {
    const { email, code, newPassword } = req.body;
    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user || !user.passwordResetCodeHash || !user.passwordResetCodeExpiresAt) {
      return res.status(400).json({ error: 'Invalid or expired reset code' });
    }

    if (user.passwordResetCodeExpiresAt < new Date()) {
      return res.status(400).json({ error: 'Reset code expired. Request a new one.' });
    }

    const valid = await verifyCode(code, user.passwordResetCodeHash);
    if (!valid) return res.status(400).json({ error: 'Invalid code' });

    user.passwordHash = await bcrypt.hash(newPassword, 12);
    user.passwordResetCodeHash = null;
    user.passwordResetCodeExpiresAt = null;
    await user.save();

    res.json({ message: 'Password reset successfully' });
  } catch (err) {
    next(err);
  }
}

export async function deleteMe(req, res, next) {
  try {
    const userId = req.userId;

    const userSkills = await UserSkill.find({ userId }, '_id');
    const userSkillIds = userSkills.map(s => s._id);

    await Promise.all([
      Session.deleteMany({ userId }),
      UserSkill.deleteMany({ userId }),
      BeltHistory.deleteMany({ userSkillId: { $in: userSkillIds } }),
      Follow.deleteMany({ $or: [{ followerId: userId }, { followingId: userId }] }),
      Activity.deleteMany({ userId }),
    ]);

    await User.findByIdAndDelete(userId);

    res.json({ message: 'Account deleted' });
  } catch (err) {
    next(err);
  }
}
