import User from '../models/User.js';
import UserSkill from '../models/UserSkill.js';
import Follow from '../models/Follow.js';

// GET /api/users/:username — Public profile
export async function getPublicProfile(req, res, next) {
  try {
    const user = await User.findOne({ username: req.params.username })
      .select('username name bio avatarUrl avatar created currentStreak totalSessions')
      .lean();

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const [skillCount, followerCount, followingCount, publicSkills] = await Promise.all([
      UserSkill.countDocuments({ userId: user._id, isPublic: true }),
      Follow.countDocuments({ followingId: user._id }),
      Follow.countDocuments({ followerId: user._id }),
      UserSkill.find({ userId: user._id, isPublic: true }).select('currentBelt').lean(),
    ]);

    // Compute highest belt
    const beltOrder = ['white', 'yellow', 'orange', 'green', 'blue', 'purple', 'brown', 'black'];
    let highestBelt = null;
    for (const s of publicSkills) {
      const idx = beltOrder.indexOf(s.currentBelt);
      const curIdx = highestBelt ? beltOrder.indexOf(highestBelt) : -1;
      if (idx > curIdx) highestBelt = s.currentBelt;
    }

    res.json({
      profile: {
        ...user,
        skillCount,
        followerCount,
        followingCount,
        highestBelt,
      },
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/users/search?q=
export async function searchUsers(req, res, next) {
  try {
    const q = (req.query.q || '').trim();
    if (q.length < 2) {
      return res.status(400).json({ error: 'Query must be at least 2 characters' });
    }

    const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escaped, 'i');

    const users = await User.find({
      $or: [{ username: regex }, { name: regex }],
    })
      .select('username name avatar')
      .limit(20)
      .lean();

    res.json({ users });
  } catch (err) {
    next(err);
  }
}

// GET /api/users/:username/skills — Public skills (isPublic only)
export async function getPublicSkills(req, res, next) {
  try {
    const user = await User.findOne({ username: req.params.username }).select('_id').lean();
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const skills = await UserSkill.find({
      userId: user._id,
      isPublic: true,
    })
      .populate('skillCatalogId', 'name slug icon category')
      .select('skillCatalogId currentBelt createdAt concepts')
      .lean();

    res.json({ skills });
  } catch (err) {
    next(err);
  }
}
