/**
 * Telegram deep linking helpers for Praxis Tech Academy.
 * Allows visitors to directly open a chat on Telegram with a prefilled inquiry
 * indicating exactly which course they are interested in.
 */

export function getTelegramContactUsername(): string {
  const configured =
    process.env.NEXT_PUBLIC_TELEGRAM_CONTACT_USERNAME ||
    process.env.NEXT_PUBLIC_TELEGRAM_USERNAME ||
    process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME ||
    "PraxisAcademyBot";

  return configured.replace(/^@/, "").trim();
}

/**
 * Generates a direct Telegram deep link for course enrollment with a prefilled message.
 */
export function buildTelegramEnrollmentUrl(courseTitle: string): string {
  const username = getTelegramContactUsername();
  const message = `Hello! I would like to enroll in the ${courseTitle} course at Praxis Tech Academy. Please provide me with details on the next steps and schedule.`;
  return `https://t.me/${username}?text=${encodeURIComponent(message)}`;
}

/**
 * Generates a direct Telegram deep link for asking questions about a specific course.
 */
export function buildTelegramInquiryUrl(courseTitle: string): string {
  const username = getTelegramContactUsername();
  const message = `Hello! I have a question regarding the ${courseTitle} course at Praxis Tech Academy.`;
  return `https://t.me/${username}?text=${encodeURIComponent(message)}`;
}
