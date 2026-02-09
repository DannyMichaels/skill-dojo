import { Router } from 'express';
import { register, login, getMe, updateMe } from '../controllers/auth.js';
import auth from '../middleware/auth.js';
import validate from '../middleware/validate.js';
import { registerSchema, loginSchema, updateProfileSchema } from '../schemas/auth.js';

const router = Router();

router.post('/register', validate(registerSchema), register);
router.post('/login', validate(loginSchema), login);
router.get('/me', auth, getMe);
router.put('/me', auth, validate(updateProfileSchema), updateMe);

export default router;
