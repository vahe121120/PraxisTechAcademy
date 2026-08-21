# Logging strategy

## What's implemented

**Backend:** structured JSON logging via `nestjs-pino`
(`src/config/logger.module.ts`), swapped in as Nest's app-wide logger in
`main.ts` (`app.useLogger(app.get(Logger))`). This is a transparent
replacement, not a rewrite — every existing `new Logger('Context')` call
site across the codebase (every service, every guard, including
`ArcaWebhookGuard`/`TelegramWebhookGuard` and the rest added during the
earlier security review) keeps its exact call signature and now emits
structured JSON automatically.

- **Production:** one JSON object per line to stdout — no pretty-printing
  transform, since that would require `pino-pretty` (a devDependency,
  correctly not present in the production image) and because JSON-per-line
  is what every log aggregator (Loki, CloudWatch Logs, Datadog, ELK)
  expects natively, with no custom parsing rule needed.
- **Development:** colorized, single-line, human-readable output via
  `pino-pretty`.
- **Correlation:** every log line for a given request carries the same
  `x-request-id` the app's existing `RequestIdMiddleware` already
  generates/propagates — `pino-http`'s `genReqId` reads the same header
  and constant (`REQUEST_ID_HEADER`) rather than an independent ID scheme,
  so a single failed request is findable by filtering logs on one id, not
  reconciling two different generators.
- **Redaction:** `Authorization`, `Cookie`, `Set-Cookie`, the ARCA
  signature header, the Telegram secret-token header, and any
  `password`/`token`-shaped field are replaced with `[Redacted]` before a
  log line is ever emitted — not filtered after the fact, not relying on
  every call site remembering not to log a secret.
- **Existing access-log line** (`common/interceptors/logging.interceptor.ts`)
  is unchanged in behavior — one line per request with method, path, status,
  latency, and request id — and now also outputs as structured JSON for
  free, since it already goes through Nest's `Logger`.

**Frontend:** no server-side structured logging added — Next.js's own
build/runtime console output is left as-is. If custom server-side logging
becomes necessary (e.g. logging route-handler errors with context), the
same pino pattern applies; nothing about the frontend today generates log
volume that needs more than what the platform already gives you via
`docker compose logs frontend`.

## Log levels — what goes where

`LOG_LEVEL` (env var, default `info` in production per `.env.example`,
`debug` in local dev) controls the floor. Guidance for choosing a level on
a given log call, for whoever adds the next one:

| Level | Use for |
|---|---|
| `error` | Something failed and needs a human to look at it — an uncaught exception, a payment webhook that couldn't be applied (see `PaymentsService`'s `markWebhookError`), a failed backup. |
| `warn` | Recoverable but noteworthy — a rejected webhook signature, a 4xx-range access-log line, a rate limit triggered. |
| `log`/`info` | Normal operation — the access log line, "server started," "migration completed." |
| `debug` | Anything useful only when actively investigating something — `pino-http`'s full request/response metadata (deliberately pinned to `debug` regardless of the configured floor, so it never floods production logs by default but is one env var away when needed). |

## What's deliberately NOT logged

- Full request/response bodies — `pino-http` in this configuration logs
  headers and metadata only, never the body. If body-logging is ever
  turned on for debugging, the redaction list in `logger.module.ts` must
  be extended *before* that change ships, not after — a DTO with a
  `password` or `refreshToken` field would otherwise land in plaintext in
  every log aggregator with access to these logs, which is typically a much
  larger set of people than have database access.
- Raw card data / full PAN — not something the application ever receives
  in the first place (ARCA's hosted checkout page handles card entry;
  see `SECURITY_REVIEW_VERIFIED.md`'s open item on `rawGatewayResponse`),
  so there's nothing here to specifically scrub, but worth re-confirming
  this stays true if the payment integration ever changes shape.
- Full JWTs — logging middleware here works at the header level
  (`Authorization` redacted wholesale), not by trying to selectively log
  "everything except the token part" of a bearer header, which is a much
  easier rule to get right than a parsing-based partial redaction.

## Aggregation and retention

Nothing in this repo ships logs anywhere — every container's logs go to
its own stdout/stderr, captured by Docker's default `json-file` log driver
and readable via `docker compose logs`. That's sufficient for a single-host
deployment during initial launch, but doesn't survive a container being
recreated (Docker's default driver has no built-in retention/shipping) and
doesn't provide any cross-service search.

**Before this goes to real production traffic, point Docker's logging at
an aggregator** — this is an infrastructure choice this repo intentionally
doesn't make for you (Loki + Grafana, CloudWatch Logs, Datadog, or
anything else the team already operates), but concretely, whichever is
chosen, do it via Docker's `logging:` driver config on each service in
`docker-compose.yml` (e.g. the `loki` or `awslogs` driver) rather than
adding a shipping agent inside each container — that keeps every
container's job scoped to "run the app and log to stdout," which is the
right boundary and is what the JSON-per-line format above was chosen to
make trivial to consume however you plug it in.

Whatever's chosen, set an explicit retention window (30 days is a common
default for operational logs; longer if there's a compliance reason tied
to the payment flow specifically) — "keep forever by default because no
one configured otherwise" is how log storage costs quietly become a
line item nobody remembers deciding on.
