# Praxis Tech Academy — API

NestJS + PostgreSQL (Prisma) backend.

## Stack

- NestJS 11, TypeScript 5.9 (strict mode)
- PostgreSQL + Prisma **6.19.3** (`prisma-client-js` generator — see the note in
  `prisma/schema.prisma` on why this project is not yet on Prisma 7, which
  requires ESM + a mandatory driver adapter across the whole app)
- `@nestjs/terminus` for health checks, `@nestjs/throttler` for rate limiting,
  `@nestjs/config` + Joi for fail-fast environment validation

## First-time setup

```bash
cp .env.example .env
# fill in real values, especially DATABASE_URL / DIRECT_URL

docker compose up -d          # local Postgres
npm install                   # postinstall runs `prisma generate` automatically
npm run prisma:migrate:dev    # creates the schema in your local database

# Apply the CHECK constraints Prisma's schema language can't express natively —
# fold this into the generated migration.sql instead of running it by hand
# for every environment. See prisma/constraints.sql for the full explanation.
psql "$DATABASE_URL" -f prisma/constraints.sql

npm run start:dev
```

Verify it's alive:

```bash
curl http://localhost:3000/health/live
curl http://localhost:3000/health/ready
```

## A note on validation in this delivery

Every file in this project was hand-written, not scaffolded from a
`nest new` template, and checked with the real compiler and linter
(`npx tsc --noEmit`, `npx eslint`) inside the sandbox this was built in.
**One thing could not be verified here**: this sandbox's network egress
blocks `binaries.prisma.sh`, which `prisma generate` needs to fetch its
query/schema engine — even just to produce the generated TypeScript types.
That leaves exactly six compiler errors, all of the shape
`Module '"@prisma/client"' has no exported member 'PrismaClient'`, confined
to `prisma.service.ts`, `prisma.health-indicator.ts`, and the exception
filter (plus its spec). Every one of them will disappear the moment you run
`npm install` (or `npx prisma generate`) in a normal environment with
unrestricted network access — they are not bugs in this code, they're the
absence of a generated artifact this sandbox can't produce. Run
`npx tsc --noEmit` yourself right after your first `npm install` as a
sanity check; it should come back clean.

## Scripts

| Script | Purpose |
|---|---|
| `npm run start:dev` | Watch-mode dev server |
| `npm run build` / `start:prod` | Production build + run |
| `npm run lint` | ESLint (flat config, typed) |
| `npm run test` / `test:cov` | Unit tests |
| `npm run test:e2e` | E2E tests — requires a running database (`docker compose up -d`) |
| `npm run prisma:migrate:dev` | Create/apply a migration locally |
| `npm run prisma:migrate:deploy` | Apply pending migrations in CI/production |
| `npm run prisma:studio` | Browse the database visually |

## Folder structure

```
src/
├── main.ts                 # bootstrap: security middleware, pipes, versioning, shutdown hooks
├── app.module.ts            # root module: wires config, Prisma, health, throttling, global providers
├── config/                  # env validation (Joi) + typed AppConfigService
├── prisma/                  # PrismaService (connect/disconnect lifecycle) + global PrismaModule
├── health/                  # liveness/readiness endpoints (Terminus) + custom Prisma indicator
└── common/
    ├── filters/              # global exception filter (incl. Prisma error → HTTP status mapping)
    ├── interceptors/         # request logging, request timeout
    ├── middleware/           # request-id correlation
    └── constants/
```

Feature modules (auth, users, courses, subscriptions, payments, telegram,
notifications, scheduler — per the architecture document) land as siblings of
`health/` and `prisma/` under `src/`, each with its own module, controller,
service, and DTOs, following the same pattern established here.

## Auth module

JWT access + refresh tokens, bcrypt password hashing, role-based access
control (STUDENT / TEACHER / ADMIN).

**Endpoints** (all under `/api/v1/auth`):

| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/register` | Public | Always creates a STUDENT account |
| POST | `/register-staff` | ADMIN only | Creates a TEACHER/ADMIN account |
| POST | `/login` | Public | Email + password (passport-local) |
| POST | `/refresh` | Refresh cookie | Rotates the refresh token; reused/stale tokens revoke the whole session family |
| POST | `/logout` | Access token | Revokes the current session's refresh token |
| POST | `/logout-all` | Access token | Revokes every refresh token for the account |
| GET | `/me` | Access token | Current profile |
| PATCH | `/me` | Access token | Update name/phone/telegramUsername/email |
| PATCH | `/me/password` | Access token | Requires `currentPassword`; revokes all other sessions on success |

**Design decisions worth knowing about:**

- **`name` replaces the earlier `firstName`/`lastName` split**, and a
  self-reported `telegramUsername` was added directly on `User` — distinct
  from `TelegramLink.telegramUserId`, which remains the *verified* identity
  used for actual Telegram group access decisions. A student can type
  anything into `telegramUsername`; it's a contact convenience field only.
- **Refresh tokens rotate on every use and share a `familyId`.** Presenting
  an already-rotated (or logged-out) refresh token revokes the entire
  family and forces a fresh login — standard reuse/theft detection.
- **Refresh tokens are hashed with SHA-256, not bcrypt.** Bcrypt is
  deliberately slow to resist brute-forcing a low-entropy human password; a
  128-bit-plus machine-generated token needs a fast, deterministic hash for
  lookup, not bcrypt's cost factor.
- **Public registration can never set `role`.** Only an existing ADMIN,
  via the guarded `/register-staff` endpoint, can create TEACHER/ADMIN
  accounts. The very first admin is bootstrapped by `prisma/seed.ts`
  (`SEED_ADMIN_EMAIL`/`SEED_ADMIN_PASSWORD` in `.env`) — a deliberate,
  idempotent answer to the chicken-and-egg problem of needing an admin to
  create an admin.
- **Login timing is constant regardless of whether the email exists** — a
  dummy bcrypt comparison runs even when no account is found, so response
  time can't be used to enumerate registered emails.
- **Changing a password revokes every other session.** A password change is
  exactly the situation where "log everyone else out" is the safe default.

## Course groups module

A `Course` (e.g. "QA Automation") can have multiple `CourseGroup`s — scheduled
live runs like "QA Automation September 2026" and "QA Automation January
2027". This was originally modeled as `Cohort`; **it's been renamed to
`CourseGroup` throughout the schema** (table, columns, every relation on
`Enrollment`, `TelegramGroup`, `Session`) to match the business terminology
directly, since this is still pre-launch with no live migrations to worry
about breaking.

**Endpoints** (all under `/api/v1/course-groups`):

| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/` | ADMIN | Create |
| GET | `/admin` | ADMIN | All groups, any status, filterable |
| GET | `/admin/:id` | ADMIN | Any group by id, any status |
| GET | `/teaching` | TEACHER or ADMIN | The caller's own assigned groups only — never trusts a query param for this |
| PATCH | `/:id` | ADMIN | Partial update; `courseId` is not updatable (see below) |
| DELETE | `/:id` | ADMIN | Blocked with a clear 409 if enrollments exist |
| GET | `/` | Public | Published-course, non-cancelled groups only |
| GET | `/:id` | Public | 404 (not 403) if the course isn't published or the group is cancelled |

**Design decisions worth knowing about:**

- **`teacherId` accepts TEACHER *or* ADMIN accounts.** Enforced twice: in
  `CourseGroupsService` (a clear 400 error) and, as the can't-be-bypassed
  backstop, a Postgres trigger in `constraints.sql` — a plain CHECK
  constraint can't reference another table, so this needed a trigger
  function. Allowing ADMIN is deliberate: Praxis's founder both builds
  courses and personally teaches some of them.
- **`schedule` is a free-text summary** ("Mon/Wed/Fri 19:00-21:00, Yerevan
  time"), not a structured day/time model. The `Session` table remains the
  actual source of truth for individual lesson occurrences and attendance;
  `schedule` is just what a listing displays.
- **`telegramGroupId` in API responses is derived, not stored.** The FK
  correctly lives on `TelegramGroup.courseGroupId` (the dependent entity
  holds the reference, standard relational practice) — adding a second,
  opposite-direction FK on `CourseGroup` would create a redundant,
  can-go-out-of-sync 1:1 relationship. The response mapper
  (`toCourseGroupResponse`) surfaces the linked `TelegramGroup.id` as
  `telegramGroupId` so API consumers get the field they expect without the
  schema paying for it twice. Creating/linking an actual Telegram group is
  deliberately out of scope here — that's a future `TelegramModule`
  concern (bot-driven, with its own verification), not something this
  CRUD's create/update DTOs manage.
- **`endDate >= startDate` is validated three times**, deliberately: the
  DTO (for the common case where both are in the same request), the
  service (against the *merged* existing+patch state, since a PATCH might
  only touch one of the two fields), and a DB `CHECK` constraint as the
  final backstop.
- **Deleting a group with enrollments is blocked** with a friendly 409
  pointing at setting `status: CANCELLED` instead — the same
  archive-don't-delete pattern used for `Course`.

## Payments module

Implements the full flow: student selects a course group → Order (`PENDING`)
→ ARCA hosted-page redirect → student pays → ARCA callback → verified →
Order (`PAID`) → Subscription created.

**Endpoints:**

| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/api/v1/orders` | Any authenticated user | Creates (or resumes) a PENDING order for a course group |
| GET | `/api/v1/orders/me` | Any authenticated user | Own orders |
| GET | `/api/v1/orders/admin` | ADMIN | All orders, filterable |
| GET | `/api/v1/orders/:id` | Owner or ADMIN | 404, not 403, for someone else's order |
| POST | `/api/v1/orders/:id/cancel` | Owner or ADMIN | Only while still PENDING |
| POST | `/api/v1/payments/initiate` | Any authenticated user | Registers the order with ARCA, returns the hosted-page URL |
| GET | `/api/v1/payments/:orderId/status` | Owner or ADMIN | Polling fallback for the browser-redirect race |
| POST | `/api/v1/payments/:orderId/refund` | ADMIN | Partial or full |
| POST | `/api/v1/payments/arca/webhook` | Public (signature-verified) | Server-to-server callback — never a JWT |

**The `PaymentProvider` abstraction** (`src/payments/providers/`):

```ts
interface PaymentProvider {
  createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult>;
  verifyPayment(input: VerifyPaymentInput): Promise<VerifyPaymentResult>;
  refundPayment(input: RefundPaymentInput): Promise<RefundPaymentResult>;
}
```

`PaymentsService` depends only on this interface, injected via the
`PAYMENT_PROVIDER` token — never on `ArcaPaymentProvider` directly (see
`payment-provider.token.ts`). Adding a second gateway later means writing a
new class and changing one binding in `PaymentsModule`, not touching
`PaymentsService`.

**⚠️ `ArcaPaymentProvider` contains placeholders that must be confirmed
against the specific issuing bank's real documentation before going live** —
this is explicitly called out in a large comment block at the top of that
file. No real ARCA sandbox/docs were available to build against, so the
implementation follows the general shape of the register.do /
getOrderStatusExtended.do / refund.do pattern common to the ArCa processing
rail (used by Ameriabank, Ardshinbank, Inecobank, ACBA, Idbank), but exact
endpoint paths, field names, and — most importantly — **the webhook's
authenticity mechanism** are assumptions, not confirmed facts.

**Why the webhook doesn't trust the callback body alone:** some banks on
this rail don't include a verifiable signature on the async callback at
all. `verifyPayment()` therefore does two things: a best-effort local HMAC
check (`ARCA_WEBHOOK_SECRET`) as a fast integrity filter, and — regardless
of that check's outcome — an authenticated, direct, server-to-server call
back to the gateway's own order-status endpoint to get the *authoritative*
status. The inbound webhook is treated as a "go check now" trigger, not a
source of truth. If the specific bank does provide a real signature, this
should be tightened to reject outright on a mismatch instead of falling
through to the status query.

**Order → Subscription linkage (the schema decision this task required):**
`Order.subscriptionId` was made **nullable** — for a student's first
payment against a course group, no `Subscription` exists yet when the
`Order` is created (that's the whole point of this flow: the Subscription
is created *after* payment succeeds). `Order.courseGroupId` is the new
required field that's always known upfront regardless of whether this is a
first payment or a renewal. `OrderStatus` was simplified to
`PENDING | PAID | EXPIRED | CANCELLED` to match the flow's own terminology
(`Payment.status`, a separate state machine for individual gateway
attempts, keeps its finer-grained `INITIATED | PENDING | SUCCEEDED | FAILED
| CANCELLED | REFUNDED`).

**Idempotency, throughout:**
- Creating a second order for a course group the student already has a
  live unexpired order for returns the *existing* order rather than a
  duplicate.
- Initiating payment a second time for an order with an outstanding gateway
  attempt returns the *same* hosted-page URL rather than re-registering.
- A webhook for an already-terminal `Payment` (retried by the bank, as they
  routinely do) is a clean no-op.
- A gateway-confirmed amount that doesn't match the `Order`'s amount is
  treated as an anomaly — logged, recorded on the webhook event, and
  **not** applied. That's a fraud/integration-bug signal, not something to
  silently accept.

**Telegram removal — the actual "prepare integration" ask:** rather than a
TODO comment, there's a real seam: `TelegramAccessPort` (interface,
`revokeAccess`/`grantAccess`), injected via a `TELEGRAM_ACCESS_PORT` token —
the same DI-token pattern as `PaymentProvider`. **This is now bound to the
real `TelegramService`** (see the Telegram module section below) rather
than a placeholder — access-revocation failures are still caught and
logged without failing the expiration/cancellation itself, since the
billing state change is the authoritative fact regardless of whether the
downstream Telegram side effect succeeds.

## Telegram module

Implements the requested flow: after a successful payment, generate a
single-use group invite link and DM the student a welcome message; when a
subscription expires (or is cancelled), remove them from the group.

**The three requested functions**, all on `TelegramService`:

```ts
createInviteLink(courseGroupId: string, userId: string): Promise<TelegramAccessGrant>
sendMessage(userId: string, text: string): Promise<void>
removeMember(userId: string, courseGroupId: string): Promise<void>
```

`TelegramBotApiClient` is the thin, separate HTTP wrapper around the actual
Telegram Bot API (`createChatInviteLink`, `sendMessage`, `banChatMember` +
`unbanChatMember`) — `TelegramService` owns *what a grant means* (DB
bookkeeping, message content, which student); the client only knows *how
to talk to Telegram correctly* (auth, timeouts, the `{ok, result}` response
envelope). Same separation `ArcaPaymentProvider`/`PaymentsService` keep.

**Wired into the flows that were waiting for it:**
- `PaymentsService.applySuccessfulPayment()` — after the DB transaction
  (Payment→SUCCEEDED, Order→PAID, Subscription created/extended) commits,
  it calls `TELEGRAM_ACCESS_PORT.grantAccess()` **outside** that
  transaction. A slow or flaky external HTTP call must never hold a DB
  transaction open, and a Telegram hiccup must never turn an
  already-successful payment into an error response back to the gateway's
  webhook.
- `SubscriptionsService` (expiration checker and cancellation) now calls
  the real `TelegramService.revokeAccess()` instead of the placeholder
  `NoopTelegramAccessProvider`, which has been deleted now that its whole
  purpose — existing until this module was built — is fulfilled. Swapping
  it in was exactly the one-line `useClass`/`useExisting` change promised
  when it was written.

**A prerequisite this task didn't explicitly ask for, but that the three
requested functions cannot work without:** Telegram has no email-based
identity, and a bot cannot message or remove a user who has never started
a conversation with it. `sendMessage()` and `removeMember()` both need a
`TelegramLink` (platform user ↔ Telegram user id) to exist first — so this
module also implements the `/start <token>` deep-link account-linking flow
the original architecture doc described but nothing had built yet:

| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/api/v1/telegram/link/request` | Any authenticated user | Issues a 15-minute deep-link token, returns `https://t.me/<bot>?start=<token>` |
| GET | `/api/v1/telegram/link/status` | Any authenticated user | `{ linked: boolean }` — narrow projection, never the stored telegramUserId |
| POST | `/api/v1/telegram/admin/link-group` | ADMIN | Links a `CourseGroup` to an already-existing Telegram chat — see below |
| POST | `/api/v1/telegram/webhook` | Public (secret-token verified) | Receives `/start` messages and `my_chat_member` updates from Telegram |

**Why a chat-linking admin endpoint exists:** Telegram bots cannot create
group chats via the API at all — a human has to create the group and add
the bot as an admin first. This is the exact operational step
`CourseGroupsService` deliberately deferred ("a future TelegramModule
concern") when `telegramGroupId` was made a derived, read-only field on
course group responses. The webhook also logs `my_chat_member` updates at
info level purely so an admin can discover a newly-added chat's id in the
logs before linking it — no automatic action is taken on that event.

**Account-linking safety property:** a Telegram account already linked to
a *different* platform user is refused, not silently re-pointed — otherwise
one Telegram account could be used to pick up another student's paid
access.

**Both webhooks in this codebase (ARCA and Telegram) share the same
posture deliberately:** always respond 200 once the payload is
structurally acceptable, verify authenticity via a constant-time secret
comparison, and never let an internal processing failure surface as a
non-2xx response — both providers retry (and can eventually disable) a
webhook URL that keeps failing, which is a worse outcome than logging an
error and handling it as a retriable/investigable event on our side.

**Still not built:** a `NotificationsModule` to actually send the queued
`NotificationLog` rows for non-Telegram channels (email) — this module
writes them (`ACCESS_GRANTED`/`ACCESS_REVOKED`/etc., `SENT` for the
Telegram-channel ones since sending *is* Telegram, `FAILED` with a reason
when linking is missing), but nothing yet processes an email backlog.
Also still true: automatically expiring stale `PENDING` orders
(`OrdersService.expireStaleOrders()`) is implemented but not wired to a
cron — that belongs to the scheduler module described in the original
architecture doc.

## Subscriptions module

The daily expiration checker and renewal logic on top of the `Subscription`
table the payments module already creates/extends.

**Schema simplification worth knowing about:** the business rule given for
this module — "every day at 02:00, if expired: status = EXPIRED" — has no
grace period or `PAST_DUE` state. Rather than build a state the spec never
asked for, `SubscriptionStatus` was simplified to
`PENDING | ACTIVE | EXPIRED | CANCELLED` (dropped `PAST_DUE`), and
`gracePeriodEndsAt`/`nextBillingDate` were dropped from the schema —
`nextBillingDate` was always identical to `expireDate` in this monthly-only
model anyway, and a grace window is a one-line addition later if the
business decides it wants one. `currentPeriodStart`/`currentPeriodEnd` were
renamed to `startDate`/`expireDate` to match the spec's own vocabulary
directly.

**`studentId`/`courseId` are derived, not stored,** despite being listed as
"database" fields in the spec — both already exist one hop away via
`Enrollment` (`Enrollment.userId`, and `Enrollment.courseGroup.courseId`).
Adding them as literal columns on `Subscription` would create two paths to
the same fact that could drift out of sync — the same reasoning already
applied to `CourseGroup.telegramGroupId` earlier in this build, kept
consistent here. `SubscriptionsService`'s response mapper
(`toSubscriptionResponse`) flattens them into every API response, so
consumers get exactly the shape the spec describes without the schema
paying for the redundancy.

**Endpoints** (all under `/api/v1/subscriptions`):

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/me` | Any authenticated user | Own subscriptions |
| GET | `/admin` | ADMIN | All subscriptions, filterable by status/user/course group |
| GET | `/:id` | Owner or ADMIN | 404, not 403, for someone else's |
| POST | `/:id/cancel` | Owner or ADMIN | Immediate — see the simplification note in the code |
| POST | `/:id/renew` | Owner or ADMIN | Creates an Order via `OrdersService`, reusing its "already paid through X" guard rather than duplicating that rule |
| POST | `/admin/run-expiration-check` | ADMIN | Manually triggers the same logic the 02:00 cron runs — for ops/support, or exercising the path without waiting for the clock |

**The expiration checker** (`SubscriptionsService.expireOverdueSubscriptions`)
queries `status = ACTIVE AND expireDate <= now` — powered by the
`[status, expireDate]` composite index on `Subscription` — and processes
each overdue row individually (not a bulk `updateMany`) because each
expiration also needs its own Telegram-revocation call and audit/
notification trail. A single row's failure is caught and logged without
aborting the rest of the sweep; that row is simply still `ACTIVE` and
still overdue, so it's picked up again the next day. The `@Cron` job
itself (`SubscriptionExpirationScheduler`, `EVERY_DAY_AT_2AM`, `Asia/Yerevan`
timezone) is a thin wrapper around this — it owns scheduling only, so the
actual business logic stays unit-testable and callable from the manual
admin endpoint without pulling in `@nestjs/schedule` at all.

**Telegram removal — the actual "prepare integration" ask:** rather than a
TODO comment, there's a real seam: `TelegramAccessPort` (interface,
`revokeAccess`/`grantAccess`), injected via a `TELEGRAM_ACCESS_PORT` token —
the same DI-token pattern as `PaymentProvider`. Since no `TelegramModule`
exists yet, the token is bound to `NoopTelegramAccessProvider`, which
doesn't call Telegram (there's nothing to call) but **does** write a
`NotificationLog` row (`status: PENDING`) recording exactly what access
change *should* happen, for a future `TelegramModule` — or an operator in
the meantime — to act on. Wiring the real Telegram Bot API integration
later is a one-line change in `SubscriptionsModule` (swap `useClass`);
nothing in `SubscriptionsService` needs to change. Access-revocation
failures are caught and logged without failing the expiration/cancellation
itself — the billing state change is the authoritative fact regardless of
whether the downstream Telegram side effect succeeds.
