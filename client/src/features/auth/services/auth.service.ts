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
