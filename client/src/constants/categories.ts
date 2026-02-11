export const CATEGORY_ORDER = [
  'technology', 'life', 'food', 'music', 'fitness',
  'language', 'science', 'business', 'art', 'other',
] as const;

export const CATEGORY_META: Record<string, { label: string; icon: string }> = {
  technology: { label: 'Technology', icon: '\u{1F4BB}' },
  life: { label: 'Life Skills', icon: '\u{1F527}' },
  food: { label: 'Food & Cooking', icon: '\u{1F373}' },
  music: { label: 'Music', icon: '\u{1F3B5}' },
  fitness: { label: 'Fitness', icon: '\u{1F4AA}' },
  language: { label: 'Languages', icon: '\u{1F310}' },
  science: { label: 'Science', icon: '\u{1F52C}' },
  business: { label: 'Business', icon: '\u{1F4CA}' },
  art: { label: 'Art & Design', icon: '\u{1F3A8}' },
  other: { label: 'Other', icon: '\u{1F4DA}' },
};
