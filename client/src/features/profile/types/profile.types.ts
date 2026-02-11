export interface PublicProfile {
  _id: string;
  username: string;
  name: string | null;
  bio: string;
  avatarUrl: string | null;
  avatar: string | null;
  created: string;
  skillCount: number;
  followerCount: number;
  followingCount: number;
  highestBelt: string | null;
  currentStreak: number;
  totalSessions: number;
}

export interface PublicSkill {
  _id: string;
  skillCatalogId: { name: string; slug: string; icon: string | null; category: string };
  currentBelt: string;
  createdAt: string;
  concepts?: Record<string, { mastery: number; streak: number; contexts: string[] }>;
}
