import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  NotificationChannel,
  NotificationStatus,
  NotificationType,
  Prisma,
  TelegramAccessGrant,
  TelegramGrantStatus,
  TelegramGroup,
  TelegramLink,
} from '@prisma/client';
import { randomBytes, randomUUID } from 'crypto';

import { AppConfigService } from '../config/app-config.service';
import { PrismaService } from '../prisma/prisma.service';
import { GrantAccessInput, RevokeAccessInput, TelegramAccessPort } from './telegram-access.port';
import { TelegramBotApiClient } from './telegram-bot-api.client';

const LINK_TOKEN_TTL_MINUTES = 15;

@Injectable()
export class TelegramService implements TelegramAccessPort {
  private readonly logger = new Logger(TelegramService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: AppConfigService,
    private readonly botClient: TelegramBotApiClient,
  ) {}

  // =======================================================================
  // Account linking — a hard prerequisite for sendMessage()/removeMember():
  // Telegram has no email-based identity, and a bot cannot message or
  // identify a user who hasn't started a conversation with it. This is the
  // `/start <token>` deep-link handshake described in the original
  // architecture doc, implemented here since nothing else in the codebase
  // does it yet and the explicitly-requested functions are unusable
  // without it.
  // =======================================================================

  async requestLinkToken(userId: string): Promise<{ deepLink: string; expiresAt: Date }> {
    const token = randomBytes(24).toString('base64url');
    const expiresAt = new Date(Date.now() + LINK_TOKEN_TTL_MINUTES * 60_000);

    await this.prisma.telegramLinkToken.create({
      data: { userId, token, expiresAt },
    });

    return {
      deepLink: `https://t.me/${this.config.telegramBotUsername}?start=${token}`,
      expiresAt,
    };
  }

  /**
   * Called by TelegramWebhookController when a `/start <token>` message
   * arrives.
   */
  async handleStartCommand(input: {
    telegramUserId: bigint;
    telegramUsername: string | undefined;
    token: string;
  }): Promise<void> {
    const linkToken = await this.prisma.telegramLinkToken.findUnique({
      where: { token: input.token },
    });

    if (!linkToken || linkToken.consumedAt || linkToken.expiresAt.getTime() < Date.now()) {
      await this.replySafely(
        input.telegramUserId,
        'This link is invalid or has expired. Please request a new one from your Praxis Tech Academy dashboard.',
      );
      return;
    }

    const existingLinkForTelegramAccount = await this.prisma.telegramLink.findUnique({
      where: { telegramUserId: input.telegramUserId },
    });
    if (
      existingLinkForTelegramAccount &&
      existingLinkForTelegramAccount.userId !== linkToken.userId
    ) {
      // This Telegram account is already bound to a *different* platform
      // account — refuse rather than silently re-pointing it, which would
      // let one Telegram account be used to pick up another student's
      // course access.
      await this.replySafely(
        input.telegramUserId,
        'This Telegram account is already linked to a different Praxis Tech Academy account.',
      );
      return;
    }

    await this.prisma.$transaction([
      this.prisma.telegramLink.upsert({
        where: { userId: linkToken.userId },
        create: {
          userId: linkToken.userId,
          telegramUserId: input.telegramUserId,
          telegramUsername: input.telegramUsername,
        },
        update: {
          telegramUserId: input.telegramUserId,
          telegramUsername: input.telegramUsername,
        },
      }),
      this.prisma.telegramLinkToken.update({
        where: { id: linkToken.id },
        data: { consumedAt: new Date() },
      }),
    ]);

    await this.replySafely(
      input.telegramUserId,
      'Your Telegram account is now linked to Praxis Tech Academy. Group invites and updates will be sent here.',
    );
  }

  /** Logs, rather than throws, on failure — a reply that fails to send must never make the webhook handler return a non-200 to Telegram (see TelegramWebhookController). */
  private async replySafely(telegramUserId: bigint, text: string): Promise<void> {
    try {
      await this.botClient.sendMessage(telegramUserId, text);
    } catch (error) {
      this.logger.error(
        `Failed to send Telegram reply to user ${telegramUserId}`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  async isLinked(userId: string): Promise<boolean> {
    const link = await this.prisma.telegramLink.findUnique({ where: { userId } });
    return link !== null;
  }

  // =======================================================================
  // Admin: linking a CourseGroup to a real, already-existing Telegram chat.
  // Telegram bots cannot create group chats via the API — a human creates
  // the group and adds the bot as admin first. This is the operational
  // step CourseGroupsService deliberately deferred to "a future
  // TelegramModule" when telegramGroupId was made a derived, read-only
  // field on CourseGroup responses.
  // =======================================================================

  async linkCourseGroupToChat(
    courseGroupId: string,
    telegramChatId: bigint,
    title: string,
  ): Promise<{ id: string }> {
    const courseGroup = await this.prisma.courseGroup.findUnique({ where: { id: courseGroupId } });
    if (!courseGroup) {
      throw new NotFoundException(`Course group ${courseGroupId} not found.`);
    }

    const existingForGroup = await this.prisma.telegramGroup.findUnique({
      where: { courseGroupId },
    });
    if (existingForGroup) {
      throw new ConflictException(
        `Course group ${courseGroupId} is already linked to a Telegram chat. Unlink it first.`,
      );
    }

    const existingForChat = await this.prisma.telegramGroup.findUnique({
      where: { telegramChatId },
    });
    if (existingForChat) {
      throw new ConflictException(
        'This Telegram chat is already linked to a different course group.',
      );
    }

    const created = await this.prisma.telegramGroup.create({
      data: { courseGroupId, telegramChatId, title },
    });

    return { id: created.id };
  }

  // =======================================================================
  // The three requested functions
  // =======================================================================

  /**
   * Generates a single-use invite link scoped to one student. Deliberately
   * `member_limit: 1` and time-boxed — never the group's shared/primary
   * link — so a forwarded link can't leak paid access to someone who never
   * paid.
   */
  async createInviteLink(courseGroupId: string, userId: string): Promise<TelegramAccessGrant> {
    const telegramGroup = await this.findTelegramGroupOrThrow(courseGroupId);
    return this.issueInviteLinkForGroup(telegramGroup, userId);
  }

  private async issueInviteLinkForGroup(
    telegramGroup: TelegramGroup,
    userId: string,
  ): Promise<TelegramAccessGrant> {
    const expiresAt = new Date(Date.now() + this.config.telegramInviteLinkExpiryMinutes * 60_000);

    const link = await this.botClient.createChatInviteLink(telegramGroup.telegramChatId, {
      memberLimit: 1,
      expireDate: expiresAt,
      name: `grant-${randomUUID().slice(0, 8)}`,
    });

    return this.prisma.telegramAccessGrant.create({
      data: {
        userId,
        telegramGroupId: telegramGroup.id,
        inviteLink: link.invite_link,
        status: TelegramGrantStatus.ISSUED,
        linkExpiresAt: expiresAt,
      },
    });
  }

  /** Direct message to a student. Throws if they haven't completed the /start linking flow — there is no other way to identify them to Telegram. */
  async sendMessage(userId: string, text: string): Promise<void> {
    const telegramLink = await this.findTelegramLinkOrThrow(userId);
    await this.botClient.sendMessage(telegramLink.telegramUserId, text);
  }

  /** Removes a student from a course group's Telegram chat and marks any outstanding grants for it as revoked. */
  async removeMember(userId: string, courseGroupId: string): Promise<void> {
    const telegramGroup = await this.findTelegramGroupOrThrow(courseGroupId);
    const telegramLink = await this.prisma.telegramLink.findUnique({ where: { userId } });

    if (!telegramLink) {
      // Nothing to remove — they never linked their Telegram account, so
      // they were never actually a member via this system either.
      this.logger.warn(
        `removeMember called for user ${userId} / course group ${courseGroupId}, but no TelegramLink exists — nothing to revoke.`,
      );
    } else {
      await this.botClient.kickChatMember(
        telegramGroup.telegramChatId,
        telegramLink.telegramUserId,
      );
    }

    await this.prisma.telegramAccessGrant.updateMany({
      where: {
        userId,
        telegramGroupId: telegramGroup.id,
        status: { in: [TelegramGrantStatus.ISSUED, TelegramGrantStatus.JOINED] },
      },
      data: {
        status: TelegramGrantStatus.REVOKED,
        revokedAt: new Date(),
        revokedReason: 'access_revoked',
      },
    });
  }

  // =======================================================================
  // TelegramAccessPort — called by SubscriptionsService and PaymentsService
  // =======================================================================

  /**
   * Steps 3-6 of the post-payment workflow (steps 1-2 — confirm payment,
   * create subscription — happen in PaymentsService before this is ever
   * called; see its doc comment on applySuccessfulPayment for the other
   * half of this trace). Each step is logged individually so a specific
   * payment's grant can be traced to exactly where it succeeded or failed,
   * without having to infer it from a single opaque error at the end.
   */
  async grantAccess(input: GrantAccessInput): Promise<void> {
    const logCtx = `user=${input.userId} courseGroup=${input.courseGroupId} subscription=${input.subscriptionId}`;

    const telegramLink = await this.prisma.telegramLink.findUnique({
      where: { userId: input.userId },
    });
    if (!telegramLink) {
      this.logger.warn(`[grantAccess] Aborting for ${logCtx} — Telegram account not linked yet.`);
      await this.queueNotification(
        input.userId,
        NotificationType.ACCESS_GRANTED,
        NotificationStatus.FAILED,
        {
          courseGroupId: input.courseGroupId,
          subscriptionId: input.subscriptionId,
          failedReason: 'User has not linked their Telegram account.',
          failedAtStep: 'find_telegram_link',
        },
      );
      return;
    }

    let telegramGroup: TelegramGroup;
    try {
      // Step 3: find Telegram group.
      telegramGroup = await this.findTelegramGroupOrThrow(input.courseGroupId);
      this.logger.log(
        `[grantAccess] Step 3/6 OK — found Telegram group ${telegramGroup.id} for ${logCtx}`,
      );
    } catch (error) {
      this.logger.error(
        `[grantAccess] Step 3/6 FAILED (find Telegram group) for ${logCtx}`,
        error instanceof Error ? error.stack : String(error),
      );
      await this.queueNotification(
        input.userId,
        NotificationType.ACCESS_GRANTED,
        NotificationStatus.FAILED,
        {
          courseGroupId: input.courseGroupId,
          subscriptionId: input.subscriptionId,
          failedReason: error instanceof Error ? error.message : String(error),
          failedAtStep: 'find_telegram_group',
        },
      );
      return;
    }

    let grant: TelegramAccessGrant;
    try {
      // Step 4: generate invite link.
      grant = await this.issueInviteLinkForGroup(telegramGroup, input.userId);
      this.logger.log(
        `[grantAccess] Step 4/6 OK — invite link issued (grant ${grant.id}) for ${logCtx}`,
      );
    } catch (error) {
      this.logger.error(
        `[grantAccess] Step 4/6 FAILED (generate invite link) for ${logCtx}`,
        error instanceof Error ? error.stack : String(error),
      );
      await this.queueNotification(
        input.userId,
        NotificationType.ACCESS_GRANTED,
        NotificationStatus.FAILED,
        {
          courseGroupId: input.courseGroupId,
          subscriptionId: input.subscriptionId,
          failedReason: error instanceof Error ? error.message : String(error),
          failedAtStep: 'generate_invite_link',
        },
      );
      return;
    }

    // Needed to compose the welcome message (course title, expiry date).
    // Fetched only after the invite link is confirmed created, so this
    // (rare, near-impossible) failure can't waste a just-issued link.
    const [courseGroup, subscription] = await Promise.all([
      this.prisma.courseGroup.findUniqueOrThrow({
        where: { id: input.courseGroupId },
        include: { course: true },
      }),
      this.prisma.subscription.findUniqueOrThrow({ where: { id: input.subscriptionId } }),
    ]);

    const message = this.buildWelcomeMessage({
      courseTitle: courseGroup.course.title,
      inviteLink: grant.inviteLink ?? '',
      expireDate: subscription.expireDate,
    });

    try {
      // Step 5: send Telegram message.
      await this.botClient.sendMessage(telegramLink.telegramUserId, message);
      this.logger.log(`[grantAccess] Step 5/6 OK — welcome message sent for ${logCtx}`);
    } catch (error) {
      this.logger.error(
        `[grantAccess] Step 5/6 FAILED (send message) for ${logCtx} — invite link ${grant.id} was already issued and remains valid.`,
        error instanceof Error ? error.stack : String(error),
      );
      // Step 6 still runs even on this failure: the invite link genuinely
      // was created and must not be lost from the record just because the
      // notification about it failed to send — support can hand it to the
      // student manually using exactly this row.
      await this.queueNotification(
        input.userId,
        NotificationType.ACCESS_GRANTED,
        NotificationStatus.FAILED,
        {
          courseGroupId: input.courseGroupId,
          subscriptionId: input.subscriptionId,
          telegramAccessGrantId: grant.id,
          inviteLink: grant.inviteLink,
          messageText: message,
          failedReason: error instanceof Error ? error.message : String(error),
          failedAtStep: 'send_message',
        },
      );
      return;
    }

    // Step 6: save notification history.
    await this.queueNotification(
      input.userId,
      NotificationType.ACCESS_GRANTED,
      NotificationStatus.SENT,
      {
        courseGroupId: input.courseGroupId,
        subscriptionId: input.subscriptionId,
        telegramAccessGrantId: grant.id,
        inviteLink: grant.inviteLink,
        messageText: message,
        courseTitle: courseGroup.course.title,
      },
    );
    this.logger.log(`[grantAccess] Step 6/6 OK — notification history saved for ${logCtx}`);
  }

  async revokeAccess(input: RevokeAccessInput): Promise<void> {
    try {
      await this.removeMember(input.userId, input.courseGroupId);
      await this.queueNotification(
        input.userId,
        NotificationType.ACCESS_REVOKED,
        NotificationStatus.SENT,
        {
          courseGroupId: input.courseGroupId,
          subscriptionId: input.subscriptionId,
          reason: input.reason,
        },
      );
    } catch (error) {
      this.logger.error(
        `Failed to revoke Telegram access for user ${input.userId} / course group ${input.courseGroupId}`,
        error instanceof Error ? error.stack : String(error),
      );
      await this.queueNotification(
        input.userId,
        NotificationType.ACCESS_REVOKED,
        NotificationStatus.FAILED,
        {
          courseGroupId: input.courseGroupId,
          subscriptionId: input.subscriptionId,
          reason: input.reason,
          failedReason: error instanceof Error ? error.message : String(error),
        },
      );
    }
  }

  // -------------------------------------------------------------------
  // Internal helpers
  // -------------------------------------------------------------------

  private buildWelcomeMessage(input: {
    courseTitle: string;
    inviteLink: string;
    expireDate: Date | null;
  }): string {
    const expiryText = input.expireDate ? input.expireDate.toISOString().slice(0, 10) : 'unknown';
    return [
      'Welcome to Praxis Tech Academy.',
      '',
      'Course:',
      input.courseTitle,
      '',
      'Group:',
      input.inviteLink,
      '',
      'Subscription expires:',
      expiryText,
    ].join('\n');
  }

  private async findTelegramGroupOrThrow(courseGroupId: string): Promise<TelegramGroup> {
    const telegramGroup = await this.prisma.telegramGroup.findUnique({ where: { courseGroupId } });
    if (!telegramGroup) {
      throw new BadRequestException(
        `Course group ${courseGroupId} has no linked Telegram chat yet. An admin must link one first.`,
      );
    }
    return telegramGroup;
  }

  private async findTelegramLinkOrThrow(userId: string): Promise<TelegramLink> {
    const telegramLink = await this.prisma.telegramLink.findUnique({ where: { userId } });
    if (!telegramLink) {
      throw new BadRequestException(`User ${userId} has not linked their Telegram account yet.`);
    }
    return telegramLink;
  }

  private async queueNotification(
    userId: string,
    type: NotificationType,
    status: NotificationStatus,
    metadata: Record<string, unknown>,
  ): Promise<void> {
    try {
      await this.prisma.notificationLog.create({
        data: {
          userId,
          channel: NotificationChannel.TELEGRAM_GROUP,
          type,
          status,
          subject: this.buildNotificationSubject(type, status, metadata),
          sentAt: status === NotificationStatus.SENT ? new Date() : undefined,
          failedReason:
            status === NotificationStatus.FAILED && typeof metadata.failedReason === 'string'
              ? metadata.failedReason
              : undefined,
          metadata: metadata as unknown as Prisma.InputJsonValue,
        },
      });
    } catch (error) {
      this.logger.error(
        'Failed to write notification log entry',
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  /** A short, scannable summary — the full message text/invite link live in `metadata`; this is what a support agent sees without opening every row. */
  private buildNotificationSubject(
    type: NotificationType,
    status: NotificationStatus,
    metadata: Record<string, unknown>,
  ): string {
    const courseTitle = typeof metadata.courseTitle === 'string' ? metadata.courseTitle : undefined;
    const base =
      type === NotificationType.ACCESS_GRANTED
        ? 'Telegram group access granted'
        : 'Telegram group access revoked';
    const withCourse = courseTitle ? `${base} — ${courseTitle}` : base;
    return status === NotificationStatus.FAILED ? `${withCourse} (failed)` : withCourse;
  }
}
