/**
 * Converts a title into a URL-safe slug: lowercase, alphanumeric words
 * joined by single hyphens, diacritics stripped (so "QA Automation —
 * September" becomes "qa-automation-september"). Used as a fallback when
 * an admin doesn't supply an explicit slug on course creation.
 */
export function slugify(input: string): string {
  return input
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '') // strip diacritics
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120);
}
