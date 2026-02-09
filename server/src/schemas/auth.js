import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(1).max(100).optional(),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(1, 'Password is required'),
});

export const updateProfileSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  preferences: z.object({
    sessionLength: z.enum(['short', 'medium', 'long']).optional(),
    difficultyPreference: z.enum(['comfortable', 'challenging', 'intense']).optional(),
    feedbackStyle: z.enum(['encouraging', 'direct', 'minimal']).optional(),
  }).optional(),
});
