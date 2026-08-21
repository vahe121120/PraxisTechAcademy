# Security review — PraxisTechAcademy (code-verified)

This supersedes `SECURITY_REVIEW.md` from earlier in this conversation, which
was written without access to the actual source. This one is based on
reading the real code in `vahe121120/PraxisTechAcademy`, specifically the
`Admin_Panel_Backend/` folder — confirmed as the most complete, cumulative
backend snapshot (104 source files vs. 56–95 in the other feature-named
folders, which appear to be earlier/partial snapshots from the same build
process rather than separate services).

**Headline finding: this codebase is well-engineered.** Almost everything
the earlier blind review flagged as "unconfirmed, verify this" turns out to
already be handled correctly. Two real, narrow issues were found and fixed
directly in the cloned repo (diff: `applied-fixes.diff`). Everything else
below is either a confirmed non-issue (stated so the finding doesn't need
re-litigating) or a genuinely open item for you to decide on.

---

## What's already correct (verified by reading the code, not assumed)

- **Auth**: timing-safe login (dummy-hash comparison for nonexistent
  emails), generic error messages (no account-enumeration oracle),
  bcrypt with 12 salt rounds, refresh-token rotation with reuse/theft
  detection that revokes the whole token family, refresh cookie is
  `httpOnly` + `secure` (prod) + `sameSite=strict`, scoped to
  `/api/v1/auth` only. Rate limiting is applied (`@Throttle` on
  register/login) — this resolves what was the earlier review's top
  "fix now" item; it was already done.
- **Payments**: ARCA's webhook is correctly *not* trusted as a source of
  truth — `ArcaPaymentProvider.verifyPayment()` uses the inbound callback
  only to identify which order to check, then re-confirms via an
  authenticated server-to-server `getOrderStatusExtended.do` call. This is
  a stronger guarantee than HMAC signature verification would be (it can't
  be spoofed by anyone who doesn't have the merchant credentials), and it's
  explicitly documented in the code as a deliberate choice for a bank rail
  that doesn't reliably sign its async callbacks. Amount/currency is
  re-validated against the stored Order before confirming.
- **SQL injection**: no exposure found. Only one raw query exists
  (`admin-dashboard.service.ts`, popular-courses aggregation) — a tagged
  template with a fixed server-side `LIMIT` constant, no interpolated user
  input. Everything else goes through Prisma's query builder.
- **Telegram**: webhook secret-token check uses `timingSafeEqual`. The
  account-linking token (`/start <token>`) is 24 random bytes, 15-minute
  TTL, single-use (`consumedAt`), and explicitly refuses to re-point an
  already-linked Telegram account to a different platform user. Invite
  links are `member_limit: 1` and time-boxed — a forwarded link can't leak
  paid access. `createInviteLink`/`removeMember` are never exposed as
  direct routes; only reachable via the internal `TELEGRAM_ACCESS_PORT`
  from `PaymentsService`/`SubscriptionsService`.
- **Authorization**: ownership checks (`resource.userId !== requester.id
  && role !== ADMIN` → 404) are applied consistently across orders,
  payments, and subscriptions — not just in one place. `findTeaching()` is
  correctly scoped to `where: { teacherId }`, not all course groups. Every
  admin controller has `@Roles(ADMIN) @UseGuards(RolesGuard)` at the
  controller level (not per-handler), so new handlers added later inherit
  the guard by default. `JwtAuthGuard` is registered as a global
  `APP_GUARD`, so every route requires auth unless explicitly `@Public()`
  — and every `@Public()` route was checked individually: auth entry
  points, the public course/course-group catalog, and the two
  server-to-server webhooks. Nothing else.
- **API hardening**: `helmet()`, `compression()`, strict CORS (env-driven
  allowlist, `disallow('*')` enforced in production by the Joi schema),
  `trust proxy` set correctly for the throttler/`req.ip` to work behind a
  load balancer, `ValidationPipe` with `whitelist` + `forbidNonWhitelisted`
  + `transform` + `forbidUnknownValues` all on, pagination clamped
  (`@Max(100)`) globally via a shared DTO. `AllExceptionsFilter` never
  leaks raw error text or Prisma internals to the client in production.
  JWT secrets enforced at 32+ chars by Joi before the app will even boot.
  Seed script refuses to create an admin with a password under 12 chars.
- **Frontend**: access token is in-memory only (`useRef`, never
  `localStorage`/`sessionStorage`/a readable cookie) — the two
  `sessionStorage` uses in the repo are just a pending-order-id bridge
  through the ARCA redirect, not sensitive. `AuthGate` supports an `allow`
  role list and the existing `/admin` page already uses
  `allow={["ADMIN"]}` correctly.

---

## Real findings, fixed

### 1. JWT algorithm not explicitly pinned — Low severity
`jwt.strategy.ts` and `jwt-refresh.strategy.ts` passed `secretOrKey` to
passport-jwt without an explicit `algorithms` allowlist. Not a demonstrated
exploit against this specific setup (both secrets are plain HMAC strings,
and modern `jsonwebtoken` restricts algorithm families somewhat based on
key shape) — but algorithm confusion is a well-known JWT attack class, and
pinning `algorithms: ['HS256']` costs nothing and removes any ambiguity.

**Fixed**: added `algorithms: ['HS256']` to both strategies.

### 2. Payment webhook idempotency race condition — Medium severity
`PaymentsService.handleWebhook()`'s idempotency check
(`TERMINAL_PAYMENT_STATUSES.includes(payment.status)`) was a plain read,
not a lock. Two concurrent deliveries of the same webhook callback — normal
gateway retry behavior, not something an attacker needs to engineer — could
both read the payment as non-terminal and both call
`applySuccessfulPayment()` before either one's transaction committed.

For a first-time payment (`order.subscriptionId` still null), both
executions would reach the "create a new Subscription" branch. Since
`Subscription.enrollmentId` is `@unique`, the second transaction throws a
Prisma `P2002`. That exception wasn't caught anywhere between
`applySuccessfulPayment()` and the controller — unlike the `verifyPayment()`
call a few lines above it, which *was* already wrapped in try/catch for
exactly this reason. `AllExceptionsFilter` correctly turns the uncaught
`P2002` into a 409, which breaks the webhook controller's own documented
contract ("Always responds 200... even when processing fails internally").
Repeated enough in production, a bank on this rail disabling the merchant's
webhook after non-2xx responses would silently stop *all* future payment
confirmations — a self-inflicted denial of service on the entire revenue
pipeline, not just a cosmetic race.

**Fixed**, two layers:
- The status transition is now claimed atomically inside the transaction
  via `tx.payment.updateMany({ where: { id, status: { notIn: TERMINAL } },
  ... })` — the database's `WHERE` clause is the concurrency guard, not two
  racing application-level reads. The losing execution's `count` comes back
  `0` and it returns immediately, before ever reaching the
  `Subscription.create` call that used to throw.
- The dispatch to `applySuccessfulPayment`/`applyFailedPayment` is now
  wrapped in try/catch, mirroring the existing pattern around
  `verifyPayment()`, as a second independent layer — so the "always 200"
  contract holds even for a failure mode nobody anticipated yet.

**Verification note, stated honestly**: I traced the types by hand
(`$transaction`'s inferred return type becomes `Promise<string | null>`,
narrowed correctly by the `=== null` guard before the non-nullable
`subscriptionId` field is used in `grantAccess()`) and I'm confident in the
change, but I could not run an actual `tsc`/`npm run build` against it — this
sandbox's network allowlist doesn't include `binaries.prisma.sh`, which
`npm ci` needs to fetch Prisma's engine binaries. That's a sandbox
limitation, not something wrong with your project. **Please run `npm run
build` (or at least `npx tsc --noEmit`) in `Admin_Panel_Backend` before
merging** — this is manually-verified, not compiler-verified.

Full diff: `applied-fixes.diff`, or the two files directly in
`Admin_Panel_Backend/src/`:
`auth/strategies/jwt.strategy.ts`,
`auth/strategies/jwt-refresh.strategy.ts`,
`payments/payments.service.ts`.

---

## Open items — genuinely worth a decision, not fixed here

- **Multiple project folders with overlapping scaffolding.** The repo has
  9 separate NestJS app folders (`ARCA_Payment_System`,
  `Authentication_System`, `Backend_Initialization`, `Course_Groups`,
  `Course_Management`, `Payment_Telegram_Automation`,
  `Subscription_System`, `Telegram_Bot_integration`,
  `Admin_Panel_Backend`), each with its own `package.json`, `prisma/`
  schema, and `Dockerfile`, all committed within about 15 minutes of each
  other. `Admin_Panel_Backend` is the most complete and is what this
  review and both fixes target — but if any of the *other* folders are
  what's actually deployed, or if they get merged/copied from later, the
  same two bugs (and only the two bugs fixed here) would need
  reapplying there. Worth confirming which folder is the real
  deployment target, and probably deleting or clearly archiving the
  rest so a future edit doesn't accidentally land in a stale copy.
- **Dead/superseded `Database_Design/schema.prisma`.** This file at the
  repo root has `Order.subscriptionId` as required (`String`, no `?`),
  while `Admin_Panel_Backend/prisma/schema.prisma` has it as optional
  (`String?`) — the two schemas have diverged. The optional version is
  what the actual application code depends on (the "first-time payment"
  branch in `applySuccessfulPayment` reads as unreachable dead code
  against the first schema and as real, load-bearing code against the
  second — it's the second). Same recommendation: pick one schema as
  canonical and remove or clearly label the other before anyone edits
  the wrong copy.
- **`Payment.rawGatewayResponse` and `Payment.cardMask`** are stored
  verbatim from the gateway response. `cardMask` is fine (masked by
  definition, e.g. "4** **** **** 1234" per the schema comment) — worth a
  five-minute check that `rawGatewayResponse` (stored as `Json?`) never
  actually contains a full PAN or CVV from ARCA's response in practice,
  since it's persisted to the database as-is. The interface comment says
  checkout happens on ARCA's hosted page so full card data should never
  reach this system at all — just worth confirming against a real
  response payload once you have bank sandbox access, since that's not
  something I can verify from the code alone.
