import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, User, UserRole, UserStatus } from '@prisma/client';

import { PaginatedResult } from '../common/interfaces/paginated-result.interface';
import { normalizeEmail } from '../common/utils/normalize';
import { PrismaService } from '../prisma/prisma.service';

export interface SearchStudentsInput {
  search?: string;
  status?: UserStatus;
  page?: number;
  limit?: number;
}

export interface CreateStudentInput {
  email: string;
  passwordHash: string;
  name: string;
  phone?: string;
  telegramUsername?: string;
}

export interface UpdateProfileInput {
  name?: string;
  phone?: string | null;
  telegramUsername?: string | null;
  email?: string;
}

/**
 * The only place in the application that talks to Prisma about the `User`
 * table. Returns raw Prisma `User` entities (including `passwordHash`) —
 * callers at the boundary (controllers, via `toSafeUser`) are responsible
 * for stripping sensitive fields before anything reaches an HTTP response.
 * Keeping that stripping at the boundary rather than in this service means
 * internal callers (e.g. `AuthService` comparing a login password) can
 * still get at the hash when they legitimately need to.
 */
@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email: normalizeEmail(email) } });
  }

  findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  /** Only ever creates STUDENT accounts — see AuthService for why ADMIN/TEACHER creation is a separate, guarded path. */
  async createStudent(input: CreateStudentInput): Promise<User> {
    const email = normalizeEmail(input.email);

    const existing = await this.findByEmail(email);
    if (existing) {
      // Fast, friendly path. The database's own unique constraint on
      // `email` remains the actual safety net against a concurrent
      // duplicate registration racing this check — handled globally by
      // AllExceptionsFilter's Prisma P2002 mapping, so a race condition
      // here still ends up as a clean 409, not a 500.
      throw new ConflictException('An account with this email address already exists.');
    }

    return this.prisma.user.create({
      data: {
        email,
        passwordHash: input.passwordHash,
        name: input.name,
        phone: input.phone ?? null,
        telegramUsername: input.telegramUsername ?? null,
      },
    });
  }

  async updateProfile(id: string, input: UpdateProfileInput): Promise<User> {
    const data: Prisma.UserUpdateInput = {};

    if (input.name !== undefined) {
      data.name = input.name;
    }
    if (input.phone !== undefined) {
      data.phone = input.phone;
    }
    if (input.telegramUsername !== undefined) {
      data.telegramUsername = input.telegramUsername;
    }
    if (input.email !== undefined) {
      const normalized = normalizeEmail(input.email);
      const existing = await this.findByEmail(normalized);
      if (existing && existing.id !== id) {
        throw new ConflictException('An account with this email address already exists.');
      }
      data.email = normalized;
      // Changing the email invalidates the prior verification — a new
      // verification email must be sent before it's trusted again. Wiring
      // that send is a NotificationsModule concern that doesn't exist yet
      // in this codebase; the flag below is the extension point for it.
      data.emailVerifiedAt = null;
    }

    return this.prisma.user.update({ where: { id }, data });
  }

  updatePasswordHash(id: string, passwordHash: string): Promise<User> {
    return this.prisma.user.update({ where: { id }, data: { passwordHash } });
  }

  /** Used by the JWT strategy to reject tokens belonging to a suspended/deleted account before its short-lived access token would otherwise expire on its own. */
  isActive(user: Pick<User, 'status'>): boolean {
    return user.status === UserStatus.ACTIVE;
  }

  // ---------------------------------------------------------------------
  // Admin: student management
  // ---------------------------------------------------------------------

  /**
   * Scoped to `role: STUDENT` deliberately — this is specifically
   * "student management," not general user search. Excludes soft-deleted
   * accounts (`status: DELETED`) unless a caller explicitly filters for
   * that status, since a deleted account showing up in an admin's default
   * student search would be confusing (the student can't log in or be
   * acted upon further either way).
   */
  async search(input: SearchStudentsInput): Promise<PaginatedResult<User>> {
    const page = input.page ?? 1;
    const limit = input.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.UserWhereInput = {
      role: UserRole.STUDENT,
      status: input.status ?? { not: UserStatus.DELETED },
      ...(input.search
        ? {
            OR: [
              { name: { contains: input.search, mode: 'insensitive' } },
              { email: { contains: input.search, mode: 'insensitive' } },
              { phone: { contains: input.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.user.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' } }),
      this.prisma.user.count({ where }),
    ]);

    return { data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  /**
   * Account-level lockout — the student can no longer log in at all (see
   * JwtStrategy/AuthService.validateCredentials, both of which check
   * `isActive`). Deliberately does NOT cascade into cancelling the
   * student's subscriptions or revoking Telegram access — those are a
   * separate, explicit admin action (`SubscriptionsService.cancel`/
   * `manuallyDeactivate`) so a suspension's blast radius is exactly what
   * the admin performing it intended, not an implicit side effect.
   */
  async suspend(id: string): Promise<User> {
    await this.findOrThrow(id);
    return this.prisma.user.update({ where: { id }, data: { status: UserStatus.SUSPENDED } });
  }

  async reactivate(id: string): Promise<User> {
    const user = await this.findOrThrow(id);
    if (user.status === UserStatus.DELETED) {
      throw new ConflictException('Cannot reactivate a deleted account.');
    }
    return this.prisma.user.update({ where: { id }, data: { status: UserStatus.ACTIVE } });
  }

  private async findOrThrow(id: string): Promise<User> {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException('Student not found.');
    }
    return user;
  }
}
