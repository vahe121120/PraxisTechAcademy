import * as Joi from 'joi';

/**
 * Every environment variable the application reads must be declared here.
 * `ConfigModule.forRoot({ validate })` runs this against `process.env`
 * *before* the Nest application context is created — an invalid or missing
 * variable throws and the process exits immediately, instead of the app
 * starting up in a half-configured state and failing unpredictably on the
 * first request that touches the missing value.
 */
export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'test', 'production').default('development'),

  PORT: Joi.number().port().default(3000),

  // Comma-separated list of allowed origins, e.g. "https://app.praxis.am,https://admin.praxis.am".
  // No default in production: an empty/misconfigured CORS origin must be a
  // deliberate, explicit decision, never an accidental wildcard.
  CORS_ORIGIN: Joi.string()
    .required()
    .when('NODE_ENV', {
      is: 'production',
      then: Joi.string().disallow('*'),
    }),

  LOG_LEVEL: Joi.string().valid('fatal', 'error', 'warn', 'info', 'debug', 'trace').default('info'),

  DATABASE_URL: Joi.string()
    .uri({ scheme: ['postgresql', 'postgres'] })
    .required(),

  DIRECT_URL: Joi.string()
    .uri({ scheme: ['postgresql', 'postgres'] })
    .required(),

  THROTTLE_TTL_MS: Joi.number().integer().positive().default(60000),
  THROTTLE_LIMIT: Joi.number().integer().positive().default(100),

  // --- Auth -------------------------------------------------------------
  // Deliberately separate secrets for access vs. refresh tokens: a leak of
  // one key must not compromise the other token type. Both required in
  // every environment, with a minimum length enforced so a short/guessable
  // secret can never accidentally make it into production.
  JWT_ACCESS_SECRET: Joi.string().min(32).required(),
  JWT_ACCESS_EXPIRES_IN: Joi.string().default('15m'),
  JWT_REFRESH_SECRET: Joi.string().min(32).required(),
  JWT_REFRESH_EXPIRES_IN: Joi.string().default('30d'),

  BCRYPT_SALT_ROUNDS: Joi.number().integer().min(10).max(15).default(12),

  // Cookie domain for the refresh-token cookie, e.g. ".praxis.am" so it's
  // shared between app.praxis.am and api.praxis.am. Left undefined in
  // development (defaults to the request's own host).
  COOKIE_DOMAIN: Joi.string().optional().allow(''),

  // Seed script (see prisma/seed.ts) — creates the first ADMIN account.
  // Only required when the seed is actually run, not at normal app boot,
  // so it's validated separately inside the seed script itself rather than
  // added here (adding it here would force every environment to define an
  // admin password just to start the API).

  // --- Payments (ARCA) ----------------------------------------------------
  // No defaults for any of these — a payment integration must never fall
  // back to a placeholder credential. Every one of these must be supplied
  // by the specific issuing bank's merchant onboarding process; see
  // ArcaPaymentProvider for the parts of the integration that still need
  // confirming against that bank's actual API documentation.
  ARCA_API_BASE_URL: Joi.string().uri().required(),
  ARCA_MERCHANT_LOGIN: Joi.string().min(1).required(),
  ARCA_MERCHANT_PASSWORD: Joi.string().min(1).required(),
  // Shared secret for verifying the authenticity of inbound ARCA webhook
  // callbacks (HMAC). Minimum length enforced so a trivial/guessable
  // secret can't silently make it into production.
  ARCA_WEBHOOK_SECRET: Joi.string().min(32).required(),
  // Where the student's browser is redirected after leaving ARCA's hosted
  // payment page — the frontend's own landing route, not this API.
  ARCA_RETURN_URL: Joi.string().uri().required(),
  ARCA_REQUEST_TIMEOUT_MS: Joi.number().integer().positive().default(15000),
  // How long an unpaid Order remains payable before it's considered
  // expired and must be recreated.
  ORDER_EXPIRY_MINUTES: Joi.number().integer().positive().default(30),
}).unknown(true); // allow other process.env vars (PATH, HOME, etc.) to pass through untouched
