import { randomBytes } from 'crypto';

/**
 * Produces a merchant order reference like "ORD-20260901-8F2A91C4" — the
 * value actually sent to the gateway and shown to students/admins.
 * Distinct from Order.id (an internal uuid never exposed to the gateway),
 * this is deliberately short and date-prefixed for easy manual lookup
 * during a support conversation ("what's your order number?").
 */
export function generateOrderNumber(now: Date = new Date()): string {
  const datePart = now.toISOString().slice(0, 10).replace(/-/g, '');
  const randomPart = randomBytes(4).toString('hex').toUpperCase();
  return `ORD-${datePart}-${randomPart}`;
}
