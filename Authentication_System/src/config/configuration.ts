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
});
