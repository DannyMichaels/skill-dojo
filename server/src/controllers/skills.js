import SkillCatalog from '../models/SkillCatalog.js';
import UserSkill from '../models/UserSkill.js';
import BeltHistory from '../models/BeltHistory.js';
import Session from '../models/Session.js';
import { normalize } from '../services/skillNormalizer.js';
import { getClient } from '../services/anthropic.js';
import { emitSkillStarted } from '../services/activityService.js';

// GET /api/skills/catalog
export async function listCatalog(req, res, next) {
  try {
    const { q } = req.query;
    let filter = {};
    if (q) {
      filter = { $text: { $search: q } };
    }
    const skills = await SkillCatalog.find(filter)
      .sort({ usedByCount: -1 })
      .limit(50)
      .lean();
    res.json({ skills });
  } catch (err) {
    next(err);
  }
}

// POST /api/skills/catalog/search
export async function searchCatalog(req, res, next) {
  try {
    const { query } = req.body;

    const anthropicClient = getClient();
    const result = await normalize(query, anthropicClient);

    if (!result || !result.slug) {
      return res.status(400).json({ error: 'Could not identify skill', query });
    }

    // Check if it already exists in catalog
    const existing = await SkillCatalog.findOne({ slug: result.slug }).lean();

    res.json({
      name: result.name,
      slug: result.slug,
      ambiguous: result.ambiguous || false,
      existsInCatalog: !!existing,
      catalogEntry: existing || null,
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/skills/catalog/:slug
export async function getCatalogEntry(req, res, next) {
  try {
    const entry = await SkillCatalog.findOne({ slug: req.params.slug }).lean();
    if (!entry) {
      return res.status(404).json({ error: 'Skill not found in catalog' });
    }
    res.json({ skill: entry });
  } catch (err) {
    next(err);
  }
}

// GET /api/user-skills
export async function listUserSkills(req, res, next) {
  try {
    const skills = await UserSkill.find({ userId: req.userId })
      .populate('skillCatalogId', 'name slug icon category')
      .lean();
    res.json({ skills });
  } catch (err) {
    next(err);
  }
}

// POST /api/user-skills
export async function startSkill(req, res, next) {
  try {
    let { slug, query } = req.body;

    // Normalize if we got a query instead of a slug
    if (!slug && query) {
      const anthropicClient = getClient();
      const result = await normalize(query, anthropicClient);
      if (result?.rejected) {
        return res.status(400).json({ error: result.reason || 'This skill is not appropriate for the platform' });
      }
      if (!result || !result.slug) {
        return res.status(400).json({ error: 'Could not identify skill' });
      }
      slug = result.slug;

      // Create catalog entry if it doesn't exist
      const existing = await SkillCatalog.findOne({ slug });
      if (!existing) {
        await SkillCatalog.create({
          name: result.name,
          slug: result.slug,
          category: result.category || 'other',
          createdBy: req.userId,
        });
      }
    }

    // Find catalog entry
    const catalog = await SkillCatalog.findOne({ slug });
    if (!catalog) {
      return res.status(404).json({ error: 'Skill not found in catalog. Use /api/skills/catalog/search first.' });
    }

    // Check if user already has this skill
    const existing = await UserSkill.findOne({
      userId: req.userId,
      skillCatalogId: catalog._id,
    });
    if (existing) {
      return res.status(409).json({ error: 'You already have this skill', skill: existing });
    }

    // Create UserSkill (the core record)
    const userSkill = await UserSkill.create({
      userId: req.userId,
      skillCatalogId: catalog._id,
    });

    try {
      // Create initial belt history entry
      await BeltHistory.create({
        userId: req.userId,
        userSkillId: userSkill._id,
        skillCatalogId: catalog._id,
        fromBelt: null,
        toBelt: 'white',
      });

      // Increment usedByCount (atomic $inc, safe)
      await SkillCatalog.findByIdAndUpdate(catalog._id, { $inc: { usedByCount: 1 } });

      // Auto-create onboarding session
      const onboardingSession = await Session.create({
        skillId: userSkill._id,
        userId: req.userId,
        type: 'onboarding',
      });

      // Populate for response
      const populated = await UserSkill.findById(userSkill._id)
        .populate('skillCatalogId', 'name slug icon category')
        .lean();

      emitSkillStarted(req.userId, { skillName: catalog.name, skillSlug: catalog.slug });

      res.status(201).json({ skill: populated, onboardingSessionId: onboardingSession._id });
    } catch (err) {
      // Rollback: delete the UserSkill and any associated records
      await UserSkill.findByIdAndDelete(userSkill._id);
      await BeltHistory.deleteMany({ userSkillId: userSkill._id });
      throw err;
    }
  } catch (err) {
    next(err);
  }
}

// GET /api/user-skills/:id
export async function getUserSkill(req, res, next) {
  try {
    const skill = await UserSkill.findOne({
      _id: req.params.id,
      userId: req.userId,
    }).populate('skillCatalogId', 'name slug icon category description').lean();

    if (!skill) {
      return res.status(404).json({ error: 'Skill not found' });
    }
    res.json({ skill });
  } catch (err) {
    next(err);
  }
}

// PUT /api/user-skills/:id/privacy
export async function updatePrivacy(req, res, next) {
  try {
    const skill = await UserSkill.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      { isPublic: req.body.isPublic },
      { new: true },
    ).populate('skillCatalogId', 'name slug icon category');

    if (!skill) {
      return res.status(404).json({ error: 'Skill not found' });
    }
    res.json({ skill });
  } catch (err) {
    next(err);
  }
}

// DELETE /api/user-skills/:id
export async function deleteUserSkill(req, res, next) {
  try {
    const skill = await UserSkill.findOneAndDelete({
      _id: req.params.id,
      userId: req.userId,
    });

    if (!skill) {
      return res.status(404).json({ error: 'Skill not found' });
    }

    // Cascade delete: decrement count, remove sessions and belt history
    await Promise.all([
      SkillCatalog.findByIdAndUpdate(skill.skillCatalogId, { $inc: { usedByCount: -1 } }),
      Session.deleteMany({ skillId: skill._id, userId: req.userId }),
      BeltHistory.deleteMany({ userSkillId: skill._id }),
    ]);

    res.json({ message: 'Skill removed' });
  } catch (err) {
    next(err);
  }
}
