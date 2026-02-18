import { Router } from 'express';
import { register, login, getMe, updateMe, uploadAvatar, deleteMe, verifyEmail, resendVerificationCode, forgotPassword, resetPassword } from '../controllers/auth.js';
import auth from '../middleware/auth.js';
import validate from '../middleware/validate.js';
import { registerSchema, loginSchema, updateProfileSchema, verifyEmailSchema, forgotPasswordSchema, resetPasswordSchema } from '../schemas/auth.js';
import { avatarSchema } from '../schemas/social.js';

const router = Router();

router.post('/register', validate(registerSchema), register);
router.post('/login', validate(loginSchema), login);
router.post('/verify-email', auth, validate(verifyEmailSchema), verifyEmail);
router.post('/resend-verification', auth, resendVerificationCode);
router.post('/forgot-password', validate(forgotPasswordSchema), forgotPassword);
router.post('/reset-password', validate(resetPasswordSchema), resetPassword);
router.get('/me', auth, getMe);
router.put('/me', auth, validate(updateProfileSchema), updateMe);
router.put('/me/avatar', auth, validate(avatarSchema), uploadAvatar);
router.delete('/me', auth, deleteMe);

export default router;
