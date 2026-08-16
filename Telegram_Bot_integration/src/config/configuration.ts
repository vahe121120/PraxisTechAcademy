export interface AppConfig {
  app: {
    env: 'development' | 'test' | 'production';
    port: number;
    corsOrigins: string[];
    logLevel: string;
  };
  database: {
    url: string;
    directUrl: string;
  };
  throttle: {
    ttlMs: number;
    limit: number;
  };
  auth: {
    accessSecret: string;
    accessExpiresIn: string;
    refreshSecret: string;
    refreshExpiresIn: string;
    bcryptSaltRounds: number;
    cookieDomain: string | undefined;
  };
  payments: {
    arcaApiBaseUrl: string;
    arcaMerchantLogin: string;
    arcaMerchantPassword: string;
    arcaWebhookSecret: string;
    arcaReturnUrl: string;
    arcaRequestTimeoutMs: number;
    orderExpiryMinutes: number;
  };
  telegram: {
    botToken: string;
    botUsername: string;
    apiBaseUrl: string;
    webhookSecret: string;
    requestTimeoutMs: number;
    inviteLinkExpiryMinutes: number;
  };
}

/**
 * Transforms raw `process.env` (already validated by `envValidationSchema`)
 * into a nested, typed config object. Every other module in the app injects
 * `AppConfigService` (see app-config.service.ts) rather than reading
 * `process.env` directly, so config shape changes happen in exactly one
 * place.
 */
export default (): AppConfig => ({
  app: {
    env: (process.env.NODE_ENV as AppConfig['app']['env']) ?? 'development',
    port: parseInt(process.env.PORT ?? '3000', 10),
    corsOrigins: (process.env.CORS_ORIGIN ?? '')
      .split(',')
      .map((origin) => origin.trim())
      .filter((origin) => origin.length > 0),
    logLevel: process.env.LOG_LEVEL ?? 'info',
  },
  database: {
    url: process.env.DATABASE_URL ?? '',
    directUrl: process.env.DIRECT_URL ?? '',
  },
  throttle: {
    ttlMs: parseInt(process.env.THROTTLE_TTL_MS ?? '60000', 10),
    limit: parseInt(process.env.THROTTLE_LIMIT ?? '100', 10),
  },
  auth: {
    accessSecret: process.env.JWT_ACCESS_SECRET ?? '',
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? '15m',
    refreshSecret: process.env.JWT_REFRESH_SECRET ?? '',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '30d',
    bcryptSaltRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS ?? '12', 10),
    cookieDomain:
      process.env.COOKIE_DOMAIN && process.env.COOKIE_DOMAIN.length > 0
        ? process.env.COOKIE_DOMAIN
        : undefined,
  },
  payments: {
    arcaApiBaseUrl: process.env.ARCA_API_BASE_URL ?? '',
    arcaMerchantLogin: process.env.ARCA_MERCHANT_LOGIN ?? '',
    arcaMerchantPassword: process.env.ARCA_MERCHANT_PASSWORD ?? '',
    arcaWebhookSecret: process.env.ARCA_WEBHOOK_SECRET ?? '',
    arcaReturnUrl: process.env.ARCA_RETURN_URL ?? '',
    arcaRequestTimeoutMs: parseInt(process.env.ARCA_REQUEST_TIMEOUT_MS ?? '15000', 10),
    orderExpiryMinutes: parseInt(process.env.ORDER_EXPIRY_MINUTES ?? '30', 10),
  },
  telegram: {
    botToken: process.env.TELEGRAM_BOT_TOKEN ?? '',
    botUsername: process.env.TELEGRAM_BOT_USERNAME ?? '',
    apiBaseUrl: process.env.TELEGRAM_API_BASE_URL ?? 'https://api.telegram.org',
    webhookSecret: process.env.TELEGRAM_WEBHOOK_SECRET ?? '',
    requestTimeoutMs: parseInt(process.env.TELEGRAM_REQUEST_TIMEOUT_MS ?? '10000', 10),
    inviteLinkExpiryMinutes: parseInt(
      process.env.TELEGRAM_INVITE_LINK_EXPIRY_MINUTES ?? '1440',
      10,
    ),
  },
});
