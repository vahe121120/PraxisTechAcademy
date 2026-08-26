-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('STUDENT', 'TEACHER', 'ADMIN');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'DELETED');

-- CreateEnum
CREATE TYPE "Locale" AS ENUM ('EN', 'RU', 'HY');

-- CreateEnum
CREATE TYPE "CourseTrack" AS ENUM ('FUNDAMENTALS', 'PROFESSION', 'COMBINED', 'MINI');

-- CreateEnum
CREATE TYPE "Currency" AS ENUM ('AMD', 'USD');

-- CreateEnum
CREATE TYPE "CourseStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "CourseGroupStatus" AS ENUM ('UPCOMING', 'ACTIVE', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "EnrollmentStatus" AS ENUM ('PENDING_PAYMENT', 'ACTIVE', 'SUSPENDED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('PENDING', 'ACTIVE', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'PAID', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('INITIATED', 'PENDING', 'SUCCEEDED', 'FAILED', 'CANCELLED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "PaymentProviderType" AS ENUM ('ARCA');

-- CreateEnum
CREATE TYPE "TelegramGrantStatus" AS ENUM ('ISSUED', 'JOINED', 'REVOKED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('PRESENT', 'ABSENT', 'LATE', 'EXCUSED');

-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('EMAIL', 'TELEGRAM_DM', 'TELEGRAM_GROUP');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('WELCOME', 'EMAIL_VERIFICATION', 'PASSWORD_RESET', 'PAYMENT_SUCCEEDED', 'PAYMENT_FAILED', 'RENEWAL_REMINDER_7D', 'RENEWAL_REMINDER_1D', 'SUBSCRIPTION_EXPIRED', 'ACCESS_GRANTED', 'ACCESS_REVOKED', 'TELEGRAM_LINK_REQUEST', 'ATTENDANCE_REMINDER', 'ADMIN_MANUAL_MESSAGE');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('PENDING', 'SENT', 'FAILED');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'STUDENT',
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "name" VARCHAR(150) NOT NULL,
    "phone" VARCHAR(32),
    "telegram_username" VARCHAR(64),
    "locale" "Locale" NOT NULL DEFAULT 'HY',
    "email_verified_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "family_id" UUID NOT NULL,
    "token_hash" VARCHAR(255) NOT NULL,
    "user_agent" VARCHAR(255),
    "ip_address" VARCHAR(45),
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "telegram_links" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "telegram_user_id" BIGINT NOT NULL,
    "telegram_username" VARCHAR(64),
    "linked_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "telegram_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "telegram_link_tokens" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token" VARCHAR(64) NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "consumed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "telegram_link_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "courses" (
    "id" UUID NOT NULL,
    "slug" VARCHAR(120) NOT NULL,
    "title" VARCHAR(150) NOT NULL,
    "description" TEXT NOT NULL,
    "track" "CourseTrack" NOT NULL,
    "monthly_price" INTEGER NOT NULL,
    "currency" "Currency" NOT NULL DEFAULT 'AMD',
    "duration_days" INTEGER NOT NULL,
    "status" "CourseStatus" NOT NULL DEFAULT 'DRAFT',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "courses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "course_groups" (
    "id" UUID NOT NULL,
    "course_id" UUID NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE,
    "schedule" VARCHAR(255) NOT NULL,
    "teacher_id" UUID,
    "capacity" INTEGER,
    "status" "CourseGroupStatus" NOT NULL DEFAULT 'UPCOMING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "course_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "telegram_groups" (
    "id" UUID NOT NULL,
    "course_group_id" UUID NOT NULL,
    "telegram_chat_id" BIGINT NOT NULL,
    "title" VARCHAR(150) NOT NULL,
    "invite_link" VARCHAR(255),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "telegram_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "telegram_access_grants" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "telegram_group_id" UUID NOT NULL,
    "invite_link" VARCHAR(255),
    "status" "TelegramGrantStatus" NOT NULL DEFAULT 'ISSUED',
    "issued_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "link_expires_at" TIMESTAMP(3),
    "joined_at" TIMESTAMP(3),
    "revoked_at" TIMESTAMP(3),
    "revoked_reason" VARCHAR(255),

    CONSTRAINT "telegram_access_grants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "enrollments" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "course_group_id" UUID NOT NULL,
    "status" "EnrollmentStatus" NOT NULL DEFAULT 'PENDING_PAYMENT',
    "enrolled_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    "cancelled_at" TIMESTAMP(3),

    CONSTRAINT "enrollments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" UUID NOT NULL,
    "enrollment_id" UUID NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'PENDING',
    "start_date" TIMESTAMP(3),
    "expire_date" TIMESTAMP(3),
    "auto_renew" BOOLEAN NOT NULL DEFAULT false,
    "cancelled_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" UUID NOT NULL,
    "order_number" VARCHAR(64) NOT NULL,
    "user_id" UUID NOT NULL,
    "course_group_id" UUID NOT NULL,
    "subscription_id" UUID,
    "amount" INTEGER NOT NULL,
    "currency" "Currency" NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
    "period_start" DATE NOT NULL,
    "period_end" DATE NOT NULL,
    "description" VARCHAR(255),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3),
    "cancelled_at" TIMESTAMP(3),

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "provider" "PaymentProviderType" NOT NULL DEFAULT 'ARCA',
    "provider_order_id" VARCHAR(128) NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'INITIATED',
    "attempt_number" INTEGER NOT NULL DEFAULT 1,
    "approval_code" VARCHAR(32),
    "rrn" VARCHAR(32),
    "card_mask" VARCHAR(19),
    "card_brand" VARCHAR(32),
    "raw_gateway_response" JSONB,
    "failure_code" VARCHAR(64),
    "failure_message" VARCHAR(500),
    "initiated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_webhook_events" (
    "id" UUID NOT NULL,
    "payment_id" UUID,
    "provider" "PaymentProviderType" NOT NULL DEFAULT 'ARCA',
    "payload" JSONB NOT NULL,
    "signature" VARCHAR(512),
    "signature_valid" BOOLEAN NOT NULL,
    "received_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed_at" TIMESTAMP(3),
    "processing_error" VARCHAR(1000),

    CONSTRAINT "payment_webhook_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" UUID NOT NULL,
    "course_group_id" UUID NOT NULL,
    "title" VARCHAR(150) NOT NULL,
    "scheduled_at" TIMESTAMP(3) NOT NULL,
    "duration_min" INTEGER NOT NULL DEFAULT 90,
    "meeting_url" VARCHAR(500),
    "created_by_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendance" (
    "id" UUID NOT NULL,
    "enrollment_id" UUID NOT NULL,
    "session_id" UUID NOT NULL,
    "status" "AttendanceStatus" NOT NULL,
    "joined_at" TIMESTAMP(3),
    "left_at" TIMESTAMP(3),
    "duration_minutes" INTEGER,
    "marked_by_id" UUID,
    "notes" VARCHAR(500),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "attendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_logs" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "channel" "NotificationChannel" NOT NULL,
    "type" "NotificationType" NOT NULL,
    "status" "NotificationStatus" NOT NULL DEFAULT 'PENDING',
    "subject" VARCHAR(255),
    "metadata" JSONB,
    "sent_at" TIMESTAMP(3),
    "failed_reason" VARCHAR(500),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "actor_user_id" UUID,
    "action" VARCHAR(100) NOT NULL,
    "entity_type" VARCHAR(100) NOT NULL,
    "entity_id" UUID NOT NULL,
    "before" JSONB,
    "after" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE INDEX "users_status_idx" ON "users"("status");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_hash_key" ON "refresh_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "refresh_tokens_user_id_idx" ON "refresh_tokens"("user_id");

-- CreateIndex
CREATE INDEX "refresh_tokens_expires_at_idx" ON "refresh_tokens"("expires_at");

-- CreateIndex
CREATE INDEX "refresh_tokens_family_id_idx" ON "refresh_tokens"("family_id");

-- CreateIndex
CREATE UNIQUE INDEX "telegram_links_user_id_key" ON "telegram_links"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "telegram_links_telegram_user_id_key" ON "telegram_links"("telegram_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "telegram_link_tokens_token_key" ON "telegram_link_tokens"("token");

-- CreateIndex
CREATE INDEX "telegram_link_tokens_user_id_idx" ON "telegram_link_tokens"("user_id");

-- CreateIndex
CREATE INDEX "telegram_link_tokens_expires_at_idx" ON "telegram_link_tokens"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "courses_slug_key" ON "courses"("slug");

-- CreateIndex
CREATE INDEX "courses_track_idx" ON "courses"("track");

-- CreateIndex
CREATE INDEX "courses_status_idx" ON "courses"("status");

-- CreateIndex
CREATE INDEX "course_groups_course_id_idx" ON "course_groups"("course_id");

-- CreateIndex
CREATE INDEX "course_groups_status_idx" ON "course_groups"("status");

-- CreateIndex
CREATE INDEX "course_groups_start_date_idx" ON "course_groups"("start_date");

-- CreateIndex
CREATE INDEX "course_groups_teacher_id_idx" ON "course_groups"("teacher_id");

-- CreateIndex
CREATE UNIQUE INDEX "telegram_groups_course_group_id_key" ON "telegram_groups"("course_group_id");

-- CreateIndex
CREATE UNIQUE INDEX "telegram_groups_telegram_chat_id_key" ON "telegram_groups"("telegram_chat_id");

-- CreateIndex
CREATE INDEX "telegram_access_grants_user_id_idx" ON "telegram_access_grants"("user_id");

-- CreateIndex
CREATE INDEX "telegram_access_grants_telegram_group_id_idx" ON "telegram_access_grants"("telegram_group_id");

-- CreateIndex
CREATE INDEX "telegram_access_grants_status_idx" ON "telegram_access_grants"("status");

-- CreateIndex
CREATE INDEX "enrollments_course_group_id_idx" ON "enrollments"("course_group_id");

-- CreateIndex
CREATE INDEX "enrollments_status_idx" ON "enrollments"("status");

-- CreateIndex
CREATE UNIQUE INDEX "enrollments_user_id_course_group_id_key" ON "enrollments"("user_id", "course_group_id");

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_enrollment_id_key" ON "subscriptions"("enrollment_id");

-- CreateIndex
CREATE INDEX "subscriptions_status_expire_date_idx" ON "subscriptions"("status", "expire_date");

-- CreateIndex
CREATE UNIQUE INDEX "orders_order_number_key" ON "orders"("order_number");

-- CreateIndex
CREATE INDEX "orders_user_id_idx" ON "orders"("user_id");

-- CreateIndex
CREATE INDEX "orders_course_group_id_idx" ON "orders"("course_group_id");

-- CreateIndex
CREATE INDEX "orders_subscription_id_idx" ON "orders"("subscription_id");

-- CreateIndex
CREATE INDEX "orders_status_idx" ON "orders"("status");

-- CreateIndex
CREATE UNIQUE INDEX "payments_provider_order_id_key" ON "payments"("provider_order_id");

-- CreateIndex
CREATE INDEX "payments_order_id_idx" ON "payments"("order_id");

-- CreateIndex
CREATE INDEX "payments_status_idx" ON "payments"("status");

-- CreateIndex
CREATE INDEX "payment_webhook_events_provider_idx" ON "payment_webhook_events"("provider");

-- CreateIndex
CREATE INDEX "payment_webhook_events_processed_at_idx" ON "payment_webhook_events"("processed_at");

-- CreateIndex
CREATE INDEX "payment_webhook_events_payment_id_idx" ON "payment_webhook_events"("payment_id");

-- CreateIndex
CREATE INDEX "sessions_course_group_id_idx" ON "sessions"("course_group_id");

-- CreateIndex
CREATE INDEX "sessions_scheduled_at_idx" ON "sessions"("scheduled_at");

-- CreateIndex
CREATE INDEX "attendance_session_id_idx" ON "attendance"("session_id");

-- CreateIndex
CREATE INDEX "attendance_status_idx" ON "attendance"("status");

-- CreateIndex
CREATE UNIQUE INDEX "attendance_enrollment_id_session_id_key" ON "attendance"("enrollment_id", "session_id");

-- CreateIndex
CREATE INDEX "notification_logs_user_id_idx" ON "notification_logs"("user_id");

-- CreateIndex
CREATE INDEX "notification_logs_type_idx" ON "notification_logs"("type");

-- CreateIndex
CREATE INDEX "notification_logs_user_id_type_created_at_idx" ON "notification_logs"("user_id", "type", "created_at");

-- CreateIndex
CREATE INDEX "audit_logs_entity_type_entity_id_idx" ON "audit_logs"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "audit_logs_actor_user_id_idx" ON "audit_logs"("actor_user_id");

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "telegram_links" ADD CONSTRAINT "telegram_links_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "telegram_link_tokens" ADD CONSTRAINT "telegram_link_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_groups" ADD CONSTRAINT "course_groups_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_groups" ADD CONSTRAINT "course_groups_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "telegram_groups" ADD CONSTRAINT "telegram_groups_course_group_id_fkey" FOREIGN KEY ("course_group_id") REFERENCES "course_groups"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "telegram_access_grants" ADD CONSTRAINT "telegram_access_grants_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "telegram_access_grants" ADD CONSTRAINT "telegram_access_grants_telegram_group_id_fkey" FOREIGN KEY ("telegram_group_id") REFERENCES "telegram_groups"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_course_group_id_fkey" FOREIGN KEY ("course_group_id") REFERENCES "course_groups"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_enrollment_id_fkey" FOREIGN KEY ("enrollment_id") REFERENCES "enrollments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_course_group_id_fkey" FOREIGN KEY ("course_group_id") REFERENCES "course_groups"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "subscriptions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_webhook_events" ADD CONSTRAINT "payment_webhook_events_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_course_group_id_fkey" FOREIGN KEY ("course_group_id") REFERENCES "course_groups"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_enrollment_id_fkey" FOREIGN KEY ("enrollment_id") REFERENCES "enrollments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_marked_by_id_fkey" FOREIGN KEY ("marked_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_logs" ADD CONSTRAINT "notification_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
