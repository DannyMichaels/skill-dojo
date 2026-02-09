import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../app.js';
import User from '../models/User.js';

describe('Auth API', () => {
  // --- POST /api/auth/register ---
  describe('POST /api/auth/register', () => {
    it('should register a new user and return 201', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'test@example.com', password: 'password123' });

      expect(res.status).toBe(201);
      expect(res.body.token).toBeDefined();
      expect(res.body.user).toBeDefined();
      expect(res.body.user.email).toBe('test@example.com');
      expect(res.body.user.passwordHash).toBeUndefined();
    });

    it('should return 409 for duplicate email', async () => {
      await request(app)
        .post('/api/auth/register')
        .send({ email: 'dupe@example.com', password: 'password123' });

      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'dupe@example.com', password: 'password456' });

      expect(res.status).toBe(409);
      expect(res.body.error).toBeDefined();
    });

    it('should return 400 for invalid email', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'not-an-email', password: 'password123' });

      expect(res.status).toBe(400);
    });

    it('should return 400 for short password', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'test@example.com', password: 'short' });

      expect(res.status).toBe(400);
    });

    it('should allow registration without a name', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'noname@example.com', password: 'password123' });

      expect(res.status).toBe(201);
      expect(res.body.user.name).toBeNull();
    });

    it('should store email as lowercase', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'Test@EXAMPLE.com', password: 'password123' });

      expect(res.status).toBe(201);
      expect(res.body.user.email).toBe('test@example.com');
    });
  });

  // --- POST /api/auth/login ---
  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      await request(app)
        .post('/api/auth/register')
        .send({ email: 'login@example.com', password: 'password123', name: 'Test User' });
    });

    it('should login successfully and return 200', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'login@example.com', password: 'password123' });

      expect(res.status).toBe(200);
      expect(res.body.token).toBeDefined();
      expect(res.body.user).toBeDefined();
      expect(res.body.user.email).toBe('login@example.com');
    });

    it('should return 401 for wrong password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'login@example.com', password: 'wrongpassword' });

      expect(res.status).toBe(401);
      expect(res.body.error).toBeDefined();
    });

    it('should return 401 for non-existent email', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'nobody@example.com', password: 'password123' });

      expect(res.status).toBe(401);
      expect(res.body.error).toBeDefined();
    });
  });

  // --- GET /api/auth/me ---
  describe('GET /api/auth/me', () => {
    let token;

    beforeEach(async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'me@example.com', password: 'password123', name: 'Me' });
      token = res.body.token;
    });

    it('should return current user with valid token', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.user.email).toBe('me@example.com');
      expect(res.body.user.name).toBe('Me');
    });

    it('should return 401 without token', async () => {
      const res = await request(app).get('/api/auth/me');

      expect(res.status).toBe(401);
    });

    it('should return 401 with invalid token', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalidtoken123');

      expect(res.status).toBe(401);
    });
  });

  // --- PUT /api/auth/me ---
  describe('PUT /api/auth/me', () => {
    let token;

    beforeEach(async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'update@example.com', password: 'password123', name: 'Original' });
      token = res.body.token;
    });

    it('should update name', async () => {
      const res = await request(app)
        .put('/api/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Updated Name' });

      expect(res.status).toBe(200);
      expect(res.body.user.name).toBe('Updated Name');
    });

    it('should update preferences', async () => {
      const res = await request(app)
        .put('/api/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .send({ preferences: { sessionLength: 'short', feedbackStyle: 'minimal' } });

      expect(res.status).toBe(200);
      expect(res.body.user.preferences.sessionLength).toBe('short');
      expect(res.body.user.preferences.feedbackStyle).toBe('minimal');
    });

    it('should return 401 without auth', async () => {
      const res = await request(app)
        .put('/api/auth/me')
        .send({ name: 'No Auth' });

      expect(res.status).toBe(401);
    });
  });
});
