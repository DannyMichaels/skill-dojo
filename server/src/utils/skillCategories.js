export const TECH_CATEGORIES = new Set(['technology']);

export function isTechCategory(category) {
  return TECH_CATEGORIES.has(category || 'technology');
}
