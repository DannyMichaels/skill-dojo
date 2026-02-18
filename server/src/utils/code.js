import crypto from 'crypto';
import bcrypt from 'bcryptjs';

export function generateCode() {
  return String(crypto.randomInt(100000, 999999));
}

export function hashCode(code) {
  return bcrypt.hash(code, 10);
}

export function verifyCode(code, hash) {
  return bcrypt.compare(code, hash);
}
