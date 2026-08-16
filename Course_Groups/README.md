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
