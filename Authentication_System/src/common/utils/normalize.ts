/** Canonical form for every email stored or looked up: trimmed, lowercase. */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** Strips a leading "@" some users type out of habit when entering a Telegram handle. */
export function normalizeTelegramUsername(username: string): string {
  const trimmed = username.trim();
  return trimmed.startsWith('@') ? trimmed.slice(1) : trimmed;
}
