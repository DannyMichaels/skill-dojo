export interface User {
  _id: string;
  email: string;
  username: string;
  name: string | null;
  bio: string;
  avatarUrl: string | null;
  avatar: string | null;
  emailVerified: boolean;
  created: string;
  lastSession: string | null;
  totalSessions: number;
  currentStreak: number;
  longestStreak: number;
  preferences: {
    sessionLength: 'short' | 'medium' | 'long';
    difficultyPreference: 'comfortable' | 'challenging' | 'intense';
    feedbackStyle: 'encouraging' | 'direct' | 'minimal';
  };
}

export interface AuthResponse {
  token: string;
  user: User;
}
