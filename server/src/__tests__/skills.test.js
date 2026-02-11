import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../app.js';
import SkillCatalog from '../models/SkillCatalog.js';
import { normalizeLocal } from '../services/skillNormalizer.js';
import { createTestUser } from './helpers.js';

let token;

describe('Skills API', () => {
  beforeEach(async () => {
    const result = await createTestUser();
    token = result.token;
  });

  // --- Catalog ---
  describe('Catalog', () => {
    it('GET /api/skills/catalog should return empty list initially', async () => {
      const res = await request(app).get('/api/skills/catalog');
      expect(res.status).toBe(200);
      expect(res.body.skills).toEqual([]);
    });

    it('POST /api/skills/catalog/search should normalize known skill', async () => {
      const res = await request(app)
        .post('/api/skills/catalog/search')
        .set('Authorization', `Bearer ${token}`)
        .send({ query: 'js' });

      expect(res.status).toBe(200);
      expect(res.body.name).toBe('JavaScript');
      expect(res.body.slug).toBe('javascript');
      expect(res.body.ambiguous).toBe(false);
    });

    it('POST /api/skills/catalog/search should normalize Python aliases', async () => {
      const res = await request(app)
        .post('/api/skills/catalog/search')
        .set('Authorization', `Bearer ${token}`)
        .send({ query: 'python3' });

      expect(res.status).toBe(200);
      expect(res.body.name).toBe('Python');
      expect(res.body.slug).toBe('python');
    });

    it('GET /api/skills/catalog/:slug should return catalog entry with category', async () => {
      await SkillCatalog.create({ name: 'Ruby', slug: 'ruby', category: 'technology' });

      const res = await request(app).get('/api/skills/catalog/ruby');
      expect(res.status).toBe(200);
      expect(res.body.skill.name).toBe('Ruby');
      expect(res.body.skill.category).toBe('technology');
    });

    it('GET /api/skills/catalog/:slug should default category to technology', async () => {
      await SkillCatalog.create({ name: 'Perl', slug: 'perl' });

      const res = await request(app).get('/api/skills/catalog/perl');
      expect(res.status).toBe(200);
      expect(res.body.skill.category).toBe('technology');
    });

    it('GET /api/skills/catalog/:slug should 404 for missing slug', async () => {
      const res = await request(app).get('/api/skills/catalog/nonexistent');
      expect(res.status).toBe(404);
    });
  });

  // --- UserSkills ---
  describe('UserSkills', () => {
    it('POST /api/user-skills should create skill with query and category', async () => {
      const res = await request(app)
        .post('/api/user-skills')
        .set('Authorization', `Bearer ${token}`)
        .send({ query: 'ruby' });

      expect(res.status).toBe(201);
      expect(res.body.skill).toBeDefined();
      expect(res.body.skill.currentBelt).toBe('white');
      expect(res.body.skill.skillCatalogId.category).toBe('technology');

      // Catalog should have been created
      const catalog = await SkillCatalog.findOne({ slug: 'ruby' });
      expect(catalog).toBeTruthy();
      expect(catalog.usedByCount).toBe(1);
      expect(catalog.category).toBe('technology');
    });

    it('POST /api/user-skills should create non-tech skill with correct category', async () => {
      const res = await request(app)
        .post('/api/user-skills')
        .set('Authorization', `Bearer ${token}`)
        .send({ query: 'cooking' });

      expect(res.status).toBe(201);
      expect(res.body.skill.skillCatalogId.category).toBe('food');

      const catalog = await SkillCatalog.findOne({ slug: 'cooking' });
      expect(catalog.category).toBe('food');
    });

    it('POST /api/user-skills should reject duplicate skill', async () => {
      await request(app)
        .post('/api/user-skills')
        .set('Authorization', `Bearer ${token}`)
        .send({ query: 'ruby' });

      const res = await request(app)
        .post('/api/user-skills')
        .set('Authorization', `Bearer ${token}`)
        .send({ query: 'rb' }); // "rb" normalizes to "ruby" too

      expect(res.status).toBe(409);
    });

    it('GET /api/user-skills should list user skills with category', async () => {
      await request(app)
        .post('/api/user-skills')
        .set('Authorization', `Bearer ${token}`)
        .send({ query: 'python' });

      const res = await request(app)
        .get('/api/user-skills')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.skills).toHaveLength(1);
      expect(res.body.skills[0].skillCatalogId.category).toBe('technology');
    });

    it('GET /api/user-skills/:id should get skill detail', async () => {
      const createRes = await request(app)
        .post('/api/user-skills')
        .set('Authorization', `Bearer ${token}`)
        .send({ query: 'go' });

      const res = await request(app)
        .get(`/api/user-skills/${createRes.body.skill._id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.skill.currentBelt).toBe('white');
    });

    it('PUT /api/user-skills/:id/privacy should toggle isPublic', async () => {
      const createRes = await request(app)
        .post('/api/user-skills')
        .set('Authorization', `Bearer ${token}`)
        .send({ query: 'rust' });

      const res = await request(app)
        .put(`/api/user-skills/${createRes.body.skill._id}/privacy`)
        .set('Authorization', `Bearer ${token}`)
        .send({ isPublic: false });

      expect(res.status).toBe(200);
      expect(res.body.skill.isPublic).toBe(false);
    });

    it('DELETE /api/user-skills/:id should remove skill', async () => {
      const createRes = await request(app)
        .post('/api/user-skills')
        .set('Authorization', `Bearer ${token}`)
        .send({ query: 'swift' });

      const res = await request(app)
        .delete(`/api/user-skills/${createRes.body.skill._id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);

      const catalog = await SkillCatalog.findOne({ slug: 'swift' });
      expect(catalog.usedByCount).toBe(0);
    });

    it('should isolate skills between users', async () => {
      // User 1 creates a skill
      await request(app)
        .post('/api/user-skills')
        .set('Authorization', `Bearer ${token}`)
        .send({ query: 'elixir' });

      // User 2
      const { token: token2 } = await createTestUser();

      // User 2 should see no skills
      const res = await request(app)
        .get('/api/user-skills')
        .set('Authorization', `Bearer ${token2}`);

      expect(res.status).toBe(200);
      expect(res.body.skills).toHaveLength(0);
    });
  });

  // --- Skill Normalization Categories ---
  describe('Skill Normalization Categories', () => {
    it('normalizeLocal should return category for tech skills', () => {
      const result = normalizeLocal('javascript');
      expect(result).toEqual({ name: 'JavaScript', slug: 'javascript', category: 'technology' });
    });

    it('normalizeLocal should return category for food skills', () => {
      const result = normalizeLocal('cooking');
      expect(result).toEqual({ name: 'Cooking', slug: 'cooking', category: 'food' });
    });

    it('normalizeLocal should return category for music skills', () => {
      const result = normalizeLocal('guitar');
      expect(result).toEqual({ name: 'Guitar', slug: 'guitar', category: 'music' });
    });

    it('normalizeLocal should return category for life skills', () => {
      const result = normalizeLocal('car maintenance');
      expect(result).toEqual({ name: 'Car Maintenance', slug: 'car-maintenance', category: 'life' });
    });

    it('normalizeLocal should return category for science skills', () => {
      const result = normalizeLocal('chemistry');
      expect(result).toEqual({ name: 'Chemistry', slug: 'chemistry', category: 'science' });
    });

    it('normalizeLocal should return null for unknown skills', () => {
      const result = normalizeLocal('underwater basket weaving');
      expect(result).toBeNull();
    });
  });
});
