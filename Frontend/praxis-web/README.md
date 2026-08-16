# praxis-web

Next.js frontend for Praxis Tech Academy. Talks to `praxis-api` over REST;
see that repo's README for the backend.

## Stack

- Next.js 16 (App Router), React 19, TypeScript (strict)
- Tailwind CSS v4 (CSS-first theme, no `tailwind.config.js` — tokens live in
  `app/globals.css`)
- `react-hook-form` + `zod` for all forms
- `lucide-react` for icons

## Setup

```bash
npm install
cp .env.example .env.local   # set NEXT_PUBLIC_API_URL to your praxis-api instance
npm run dev
```

`praxis-api` must be running and reachable at `NEXT_PUBLIC_API_URL`, with
`CORS_ORIGIN` on the API set to this app's origin and credentials allowed —
auth relies on a cross-origin cookie for the refresh token.

## Scripts

- `npm run dev` — dev server
- `npm run build` / `npm run start` — production build/serve
- `npm run typecheck` — `tsc --noEmit`
- `npm run lint` — ESLint

## Architecture notes

**Auth.** The access token lives in memory only (`context/AuthContext.tsx`)
— never `localStorage`, never a client-readable cookie. The refresh token is
an httpOnly cookie set by the API; the browser sends it automatically via
`credentials: "include"` (the default in `lib/api/http.ts`). On mount,
`AuthProvider` attempts a silent `/auth/refresh` to restore a session.
**Every authenticated call should go through `callWithAuth()`** from
`useAuth()` rather than reading `accessToken` directly — it retries once on
a 401 by refreshing, so an expired-but-refreshable session never surfaces
as an error.

Route protection (`components/auth/AuthGate.tsx`) is client-side, not Next
middleware, because there is nothing for edge middleware to read — the
access token is never in a cookie. Middleware could check the refresh
cookie's mere presence, but that only proves a token exists, not that the
caller is authorized for the specific route; the real check happens once
the client has resolved a verified user via `AuthContext`. If this
constraint changes (e.g. a decision to move to httpOnly access-token
cookies), middleware-based protection becomes viable and `AuthGate` could
be simplified or removed.

**API layer.** One module per backend resource under `lib/api/`, all built
on the shared `lib/api/http.ts` wrapper, which normalizes every non-2xx
response into a typed `ApiError` (`isUnauthorized`, `isNotFound`,
`isValidation` helpers). `lib/types.ts` hand-mirrors backend response
shapes — there's no codegen from the NestJS DTOs yet; if the backend
contract changes, these types need updating by hand. Worth automating
later (e.g. via `@nestjs/swagger` + `openapi-typescript`) once the API is
stable.

**Money.** All amounts from the API are integers in minor units, matching
the backend's convention. `lib/money.ts#formatMoney` is the *only* place
that divides by 100 — never do that conversion inline elsewhere.

**Validation.** `lib/validation.ts` zod schemas deliberately mirror the
backend's `class-validator` rules (password policy, phone format via
`libphonenumber-js`, the same library the backend uses) so a form that
passes client-side won't get rejected server-side for a rule the client
didn't know about. If the backend's password/phone rules change, update
both sides together.

**Payment return flow.** `/payment/return` polls
`GET /payments/:orderId/status` rather than trusting the redirect alone,
because the ARCA webhook confirming payment can arrive slightly before or
after the browser returns from the hosted payment page. The order id is
carried via `sessionStorage` (set by `PurchaseButton` right before
redirecting) because the backend's `ARCA_RETURN_URL` is a single fixed
URL, not parameterized per order.

## Validation performed

`npm install`, `npx tsc --noEmit`, and `npx eslint .` were all run for real
in the environment that produced this codebase — not assumed clean. Both
now exit 0. Fixing the ESLint findings surfaced two real things worth
knowing about:

- **`eslint-config-next`'s subpath exports have no `.js` extension**
  (`eslint-config-next/core-web-vitals`, not
  `eslint-config-next/core-web-vitals.js`) in the actually-published
  16.3.0 package — an easy mistake since most Node subpath exports do
  include the extension.
- **`eslint-plugin-react-hooks` 7.x's `set-state-in-effect` rule flags the
  ordinary "reset loading/error state, then kick off an async fetch"
  pattern**, not just synchronous derived-state anti-patterns. Every
  flagged call site (`AuthContext`, `StudentSearch`, `StudentDetail`,
  `DashboardContent`, `PaymentReturnContent`) is the standard, sanctioned
  fetch-on-mount/dependency-change pattern — suppressed narrowly at each
  site with a comment, not restructured.

**`npx next build` has *not* been completed successfully** — this sandbox
blocks network access to `fonts.googleapis.com`, and `next/font/google`
(used for Geist/Geist Mono, per the original scaffold) fails to fetch at
build time as a result. This is a sandbox networking limitation, not a
code defect — the fonts setup is standard `next/font/google` usage and
will build normally with real internet access. If a font-fetch-blocked
environment needs to build this repo, either self-host the fonts via
`next/font/local` or set `HTTP_PROXY`/`HTTPS_PROXY`. Whoever picks this up
next should run a real `next build` (and ideally `next dev` against a live
`praxis-api`) before treating this as proven end-to-end — `tsc`/`eslint`
passing is necessary, not sufficient, same caveat the backend handoff
raised for itself.

## Known gaps / next steps

- **No automated tests.** Nothing beyond `tsc`/`eslint` has been run
  against this code — no unit tests, no e2e. Adding Playwright coverage
  for the purchase flow and admin actions (the two flows with real side
  effects) would be the highest-value next addition.
- **Admin course/course-group management UI doesn't exist.** `/admin`
  currently covers student search/detail, suspend/reactivate, and
  subscription activate/deactivate — the backend also exposes full CRUD
  for courses and course-groups (`lib/api/courses.ts`,
  `lib/api/course-groups.ts` already have `create`/`update`/`delete`
  functions) but there's no UI for it yet; course/group management would
  currently have to happen via direct API calls or a future admin page.
- **No optimistic updates.** Admin mutations (suspend, activate/deactivate)
  wait for the response before updating the UI. Fine for an internal admin
  tool at this scale; would be worth revisiting if it ever feels slow.
- **ESLint pinned to 9.39.5**, not 10.x — `eslint-plugin-react` 7.37.5
  (vendored inside `eslint-config-next`) calls a rule-context method
  (`context.getFilename()`) that ESLint 10 removed, and its own
  `peerDependencies` cap below ESLint 10 anyway. Re-check when
  `eslint-plugin-react` ships ESLint 10 support; the pin can likely come
  off at that point.
- **Never run against a live backend.** Only `tsc --noEmit` and `eslint .`
  have been exercised (both pass, see below). This has not been proven to
  work end-to-end against a running `praxis-api` instance.
