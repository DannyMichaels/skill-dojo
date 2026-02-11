import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../app.js';
import { createTestUser, createTestUserWithSkill } from './helpers.js';

describe('Users API', () => {
  let token, user;

  beforeEach(async () => {
    const setup = await createTestUser();
    token = setup.token;
    user = setup.user;
  });

  describe('GET /api/users/:username', () => {
    it('should return public profile', async () => {
      const res = await request(app).get(`/api/users/${user.username}`);

      expect(res.status).toBe(200);
      expect(res.body.profile.username).toBe(user.username);
      expect(res.body.profile.created).toBeDefined();
      expect(res.body.profile.skillCount).toBe(0);
      // Should NOT include private data
      expect(res.body.profile.passwordHash).toBeUndefined();
      expect(res.body.profile.email).toBeUndefined();
    });

    it('should return 404 for non-existent user', async () => {
      const res = await request(app).get('/api/users/nonexistent_user_xyz');
      expect(res.status).toBe(404);
    });

    it('should include correct skill count (public only)', async () => {
      // Create a user with a skill
      const setup = await createTestUserWithSkill('javascript');

      // Make the skill private
      await request(app)
        .put(`/api/user-skills/${setup.skillId}/privacy`)
        .set('Authorization', `Bearer ${setup.token}`)
        .send({ isPublic: false });

      const res = await request(app).get(`/api/users/${setup.user.username}`);
      expect(res.status).toBe(200);
      expect(res.body.profile.skillCount).toBe(0); // private skills don't count
    });
  });

  describe('GET /api/users/:username/skills', () => {
    it('should return public skills', async () => {
      const setup = await createTestUserWithSkill('javascript');

      const res = await request(app).get(`/api/users/${setup.user.username}/skills`);

      expect(res.status).toBe(200);
      expect(res.body.skills).toHaveLength(1);
      expect(res.body.skills[0].currentBelt).toBe('white');
      expect(res.body.skills[0].skillCatalogId.category).toBe('technology');
      // Concepts are included for expandable profile view
      expect(res.body.skills[0]).toHaveProperty('concepts');
    });

    it('should filter out private skills', async () => {
      const setup = await createTestUserWithSkill('javascript');

      // Make the skill private
      await request(app)
        .put(`/api/user-skills/${setup.skillId}/privacy`)
        .set('Authorization', `Bearer ${setup.token}`)
        .send({ isPublic: false });

      const res = await request(app).get(`/api/users/${setup.user.username}/skills`);
      expect(res.status).toBe(200);
      expect(res.body.skills).toHaveLength(0);
    });
  });
});
