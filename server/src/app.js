import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import authRoutes from './routes/auth.js';
import skillRoutes from './routes/skills.js';
import userSkillRoutes from './routes/userSkills.js';
import sessionRoutes from './routes/sessions.js';
import userRoutes from './routes/users.js';
import beltHistoryRoutes from './routes/beltHistory.js';
import progressRoutes from './routes/progress.js';
import socialRoutes from './routes/social.js';
import feedRoutes from './routes/feed.js';
import errorHandler from './middleware/errorHandler.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();

app.use(cors());
app.use(express.json({ limit: '2mb' }));

app.use('/api/auth', authRoutes);
app.use('/api/skills', skillRoutes);
app.use('/api/user-skills', userSkillRoutes);
app.use('/api/user-skills/:skillId/sessions', sessionRoutes);
app.use('/api/users', userRoutes);
app.use('/api/belt-history', beltHistoryRoutes);
app.use('/api/progress', progressRoutes);
app.use('/api/social', socialRoutes);
app.use('/api/feed', feedRoutes);

// Serve client static files in production
const clientDist = join(__dirname, '../../client/dist');
app.use(express.static(clientDist));
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  res.sendFile(join(clientDist, 'index.html'));
});

app.use(errorHandler);

export default app;
