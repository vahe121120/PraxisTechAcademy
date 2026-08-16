-- =============================================================================
-- Praxis Tech Academy — Supplementary CHECK constraints
--
-- Prisma's schema.prisma language cannot express arbitrary CHECK constraints
-- as of the current stable Prisma release. Run this file once, immediately
-- after the initial `prisma migrate dev` / `prisma migrate deploy`, and add
-- it as a manually-written migration step for every environment (dev, CI,
-- staging, prod) so the constraints are never accidentally dropped by a
-- future `prisma migrate reset` or schema drift.
--
-- Recommended usage: create a migration via
--   npx prisma migrate dev --create-only --name add_check_constraints
-- then paste this file's contents into the generated migration.sql so it
-- becomes part of the normal migration history instead of a manual step
-- someone has to remember to run.
-- =============================================================================

-- Courses: price must be a positive amount, and duration must be a
-- meaningful, sane number of days (catches obvious data-entry mistakes —
-- e.g. "3" instead of "30" — without being so tight it rejects a genuinely
-- short intensive or a long part-time program).
ALTER TABLE "courses"
  ADD CONSTRAINT "chk_courses_price_positive" CHECK ("monthly_price" > 0);

ALTER TABLE "courses"
  ADD CONSTRAINT "chk_courses_duration_days_range" CHECK ("duration_days" BETWEEN 1 AND 730);

-- Cohorts: end date, when set, must be after the start date.
ALTER TABLE "cohorts"
  ADD CONSTRAINT "chk_cohorts_end_after_start"
  CHECK ("end_date" IS NULL OR "end_date" >= "start_date");

-- Cohorts: capacity, when set, must be positive.
ALTER TABLE "cohorts"
  ADD CONSTRAINT "chk_cohorts_capacity_positive"
  CHECK ("capacity" IS NULL OR "capacity" > 0);

-- Subscriptions: current period end must be after current period start.
ALTER TABLE "subscriptions"
  ADD CONSTRAINT "chk_subscriptions_period_valid"
  CHECK (
    "current_period_start" IS NULL
    OR "current_period_end" IS NULL
    OR "current_period_end" > "current_period_start"
  );

-- Subscriptions: grace period, when set, must not end before the period it follows.
ALTER TABLE "subscriptions"
  ADD CONSTRAINT "chk_subscriptions_grace_after_period_end"
  CHECK (
    "grace_period_ends_at" IS NULL
    OR "current_period_end" IS NULL
    OR "grace_period_ends_at" >= "current_period_end"
  );

-- Orders: amount must be positive, and the billing period must be well-formed.
ALTER TABLE "orders"
  ADD CONSTRAINT "chk_orders_amount_positive" CHECK ("amount" > 0);

ALTER TABLE "orders"
  ADD CONSTRAINT "chk_orders_period_valid" CHECK ("period_end" > "period_start");

-- Payments: attempt number must be positive; completedAt (if set) must not
-- precede initiatedAt.
ALTER TABLE "payments"
  ADD CONSTRAINT "chk_payments_attempt_positive" CHECK ("attempt_number" > 0);

ALTER TABLE "payments"
  ADD CONSTRAINT "chk_payments_completed_after_initiated"
  CHECK ("completed_at" IS NULL OR "completed_at" >= "initiated_at");

-- Payments: a SUCCEEDED payment must carry an approval code and RRN — these
-- are the fields a bank gateway is contractually required to return on a
-- successful authorization. Enforcing this at the DB level catches an
-- integration bug (e.g. misparsed webhook) before it silently corrupts the
-- financial record.
ALTER TABLE "payments"
  ADD CONSTRAINT "chk_payments_succeeded_has_approval"
  CHECK (
    "status" <> 'SUCCEEDED'
    OR ("approval_code" IS NOT NULL AND "rrn" IS NOT NULL)
  );

-- Attendance: if both joinedAt and leftAt are set, leftAt must not precede joinedAt.
ALTER TABLE "attendance"
  ADD CONSTRAINT "chk_attendance_left_after_joined"
  CHECK ("left_at" IS NULL OR "joined_at" IS NULL OR "left_at" >= "joined_at");

-- Attendance: durationMinutes, when set, must be non-negative.
ALTER TABLE "attendance"
  ADD CONSTRAINT "chk_attendance_duration_non_negative"
  CHECK ("duration_minutes" IS NULL OR "duration_minutes" >= 0);

-- Sessions: duration must be positive.
ALTER TABLE "sessions"
  ADD CONSTRAINT "chk_sessions_duration_positive" CHECK ("duration_min" > 0);

-- Telegram access grants: revokedAt, when set, must not precede issuedAt.
ALTER TABLE "telegram_access_grants"
  ADD CONSTRAINT "chk_grants_revoked_after_issued"
  CHECK ("revoked_at" IS NULL OR "revoked_at" >= "issued_at");

-- Email normalization guard: enforce lowercase at the database level as a
-- last line of defense even though the application layer normalizes before
-- every write (belt-and-suspenders against a raw SQL insert or a future
-- code path that forgets to normalize).
ALTER TABLE "users"
  ADD CONSTRAINT "chk_users_email_lowercase" CHECK ("email" = lower("email"));
