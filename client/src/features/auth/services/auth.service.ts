import api from '../../../api/client';
import type { AuthResponse, User } from '../types/auth.types';
import type { LoginInput, RegisterInput } from '../schemas/auth.schema';

export async function loginUser(data: LoginInput): Promise<AuthResponse> {
  const res = await api.post('/auth/login', data);
  return res.data;
}

export async function registerUser(data: RegisterInput): Promise<AuthResponse> {
  const res = await api.post('/auth/register', data);
  return res.data;
}

export async function getMe(): Promise<User> {
  const res = await api.get('/auth/me');
  return res.data.user;
}

export async function deleteAccount(): Promise<void> {
  await api.delete('/auth/me');
}

export async function verifyEmail(code: string): Promise<User> {
  const res = await api.post('/auth/verify-email', { code });
  return res.data.user;
}

export async function resendVerificationCode(): Promise<void> {
  await api.post('/auth/resend-verification');
}

export async function forgotPassword(email: string): Promise<void> {
  await api.post('/auth/forgot-password', { email });
}

export async function resetPassword(data: { email: string; code: string; newPassword: string }): Promise<void> {
  await api.post('/auth/reset-password', data);
}
