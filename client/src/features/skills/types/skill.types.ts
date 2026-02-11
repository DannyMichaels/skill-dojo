export type Belt = 'white' | 'yellow' | 'orange' | 'green' | 'blue' | 'purple' | 'brown' | 'black';

export interface SkillCatalogEntry {
  _id: string;
  name: string;
  slug: string;
  icon: string | null;
  category: string;
  description: string;
  usedByCount: number;
}

export interface UserSkill {
  _id: string;
  userId: string;
  skillCatalogId: SkillCatalogEntry;
  currentBelt: Belt;
  assessmentAvailable: boolean;
  isPublic: boolean;
  concepts: Record<string, ConceptData>;
  reinforcementQueue: ReinforcementItem[];
  createdAt: string;
  updatedAt: string;
}

export interface ConceptData {
  mastery: number;
  exposureCount: number;
  successCount: number;
  lastSeen: string | null;
  streak: number;
  contexts: string[];
  observations: string[];
  beltLevel: string;
  readyForNewContext: boolean;
}

export interface ReinforcementItem {
  concept: string;
  context: string | null;
  priority: 'low' | 'medium' | 'high';
  attempts: number;
  sourceSession: string | null;
}

export interface NormalizeResult {
  name: string;
  slug: string;
  ambiguous: boolean;
  existsInCatalog: boolean;
  catalogEntry: SkillCatalogEntry | null;
}
