import type { User, UserRole, UserStatus } from '@prisma/client';

/**
 * What every API response is allowed to expose about a user. Constructed
 * explicitly (never via spread + delete) so adding a sensitive field to the
 * Prisma model in the future can't silently leak it through this type —
 * a new column simply won't appear here until someone deliberately adds it.
 */
export interface SafeUser {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  telegramUsername: string | null;
  role: UserRole;
  status: UserStatus;
  locale: string;
  emailVerifiedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export function toSafeUser(user: User): SafeUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    phone: user.phone,
    telegramUsername: user.telegramUsername,
    role: user.role,
    status: user.status,
    locale: user.locale,
    emailVerifiedAt: user.emailVerifiedAt,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}
