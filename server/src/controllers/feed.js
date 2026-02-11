import Activity from '../models/Activity.js';
import Follow from '../models/Follow.js';
import UserSkill from '../models/UserSkill.js';
import SkillCatalog from '../models/SkillCatalog.js';

async function filterPrivateSkillActivities(activities) {
  const withSkill = activities.filter(a => a.data?.skillSlug);
  if (withSkill.length === 0) return activities;

  const lookups = [...new Set(withSkill.map(a => `${a.userId._id || a.userId}:${a.data.skillSlug}`))];

  const privateSlugs = new Set();
  for (const key of lookups) {
    const [userId, slug] = key.split(':');
    const catalog = await SkillCatalog.findOne({ slug }).select('_id').lean();
    if (!catalog) continue;
    const userSkill = await UserSkill.findOne({ userId, skillCatalogId: catalog._id }).select('isPublic').lean();
    if (userSkill && !userSkill.isPublic) {
      privateSlugs.add(key);
    }
  }

  return activities.filter(a => {
    if (!a.data?.skillSlug) return true;
    const key = `${a.userId._id || a.userId}:${a.data.skillSlug}`;
    return !privateSlugs.has(key);
  });
}

// GET /api/feed/following?page=
export async function getFollowingFeed(req, res, next) {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = 20;
    const skip = (page - 1) * limit;

    // Get IDs of users the current user follows
    const follows = await Follow.find({ followerId: req.userId }).select('followingId').lean();
    const followingIds = follows.map(f => f.followingId);

    if (followingIds.length === 0) {
      return res.json({ activities: [], total: 0, page, totalPages: 0 });
    }

    const [rawActivities, total] = await Promise.all([
      Activity.find({ userId: { $in: followingIds } })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('userId', 'username name avatar')
        .lean(),
      Activity.countDocuments({ userId: { $in: followingIds } }),
    ]);

    const activities = await filterPrivateSkillActivities(rawActivities);

    res.json({
      activities,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/feed/for-you?page=
export async function getForYouFeed(req, res, next) {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = 20;
    const skip = (page - 1) * limit;

    // Get current user's skill slugs for relevance scoring
    const userSkills = await UserSkill.find({ userId: req.userId })
      .populate('skillCatalogId', 'slug')
      .select('skillCatalogId')
      .lean();
    const userSlugs = new Set(userSkills.map(s => s.skillCatalogId?.slug).filter(Boolean));

    // Fetch more than needed so we can score and re-sort
    const fetchLimit = limit * 3;
    const [rawActivities, total] = await Promise.all([
      Activity.find({ userId: { $ne: req.userId } })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(fetchLimit)
        .populate('userId', 'username name avatar')
        .lean(),
      Activity.countDocuments({ userId: { $ne: req.userId } }),
    ]);

    const activities = await filterPrivateSkillActivities(rawActivities);

    // Score by relevance
    const scored = activities.map(a => {
      let relevance = 0;
      if (a.data?.skillSlug && userSlugs.has(a.data.skillSlug)) relevance += 2;
      if (a.type === 'belt_promotion' || a.type === 'assessment_passed') relevance += 1;
      return { ...a, relevance };
    });

    // Sort by relevance desc, then createdAt desc
    scored.sort((a, b) => {
      if (b.relevance !== a.relevance) return b.relevance - a.relevance;
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    res.json({
      activities: scored.slice(0, limit),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    next(err);
  }
}
