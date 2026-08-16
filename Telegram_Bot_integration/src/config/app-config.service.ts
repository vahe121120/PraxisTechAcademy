import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { AppConfig } from './configuration';

/**
 * Thin, typed facade over `@nestjs/config`'s `ConfigService`. Other modules
 * should inject this instead of the generic `ConfigService<AppConfig>` so
 * that every config access is a compile-time-checked property path, and so
 * that a future config restructuring only touches this one file's method
 * signatures instead of every call site across the codebase.
 */
@Injectable()
export class AppConfigService {
  constructor(private readonly configService: ConfigService<AppConfig, true>) {}

  get env(): AppConfig['app']['env'] {
    return this.configService.get('app.env', { infer: true });
  }

  get isProduction(): boolean {
    return this.env === 'production';
  }

  get port(): number {
    return this.configService.get('app.port', { infer: true });
  }

  get corsOrigins(): string[] {
    return this.configService.get('app.corsOrigins', { infer: true });
  }

  get logLevel(): string {
    return this.configService.get('app.logLevel', { infer: true });
  }

  get databaseUrl(): string {
    return this.configService.get('database.url', { infer: true });
  }

  get throttleTtlMs(): number {
    return this.configService.get('throttle.ttlMs', { infer: true });
  }

  get throttleLimit(): number {
    return this.configService.get('throttle.limit', { infer: true });
  }

  get jwtAccessSecret(): string {
    return this.configService.get('auth.accessSecret', { infer: true });
  }

  get jwtAccessExpiresIn(): string {
    return this.configService.get('auth.accessExpiresIn', { infer: true });
  }

  get jwtRefreshSecret(): string {
    return this.configService.get('auth.refreshSecret', { infer: true });
  }

  get jwtRefreshExpiresIn(): string {
    return this.configService.get('auth.refreshExpiresIn', { infer: true });
  }

  get bcryptSaltRounds(): number {
    return this.configService.get('auth.bcryptSaltRounds', { infer: true });
  }

  get cookieDomain(): string | undefined {
    return this.configService.get('auth.cookieDomain', { infer: true });
  }

  get arcaApiBaseUrl(): string {
    return this.configService.get('payments.arcaApiBaseUrl', { infer: true });
  }

  get arcaMerchantLogin(): string {
    return this.configService.get('payments.arcaMerchantLogin', { infer: true });
  }

  get arcaMerchantPassword(): string {
    return this.configService.get('payments.arcaMerchantPassword', { infer: true });
  }

  get arcaWebhookSecret(): string {
    return this.configService.get('payments.arcaWebhookSecret', { infer: true });
  }

  get arcaReturnUrl(): string {
    return this.configService.get('payments.arcaReturnUrl', { infer: true });
  }

  get arcaRequestTimeoutMs(): number {
    return this.configService.get('payments.arcaRequestTimeoutMs', { infer: true });
  }

  get orderExpiryMinutes(): number {
    return this.configService.get('payments.orderExpiryMinutes', { infer: true });
  }

  get telegramBotToken(): string {
    return this.configService.get('telegram.botToken', { infer: true });
  }

  get telegramBotUsername(): string {
    return this.configService.get('telegram.botUsername', { infer: true });
  }

  get telegramApiBaseUrl(): string {
    return this.configService.get('telegram.apiBaseUrl', { infer: true });
  }

  get telegramWebhookSecret(): string {
    return this.configService.get('telegram.webhookSecret', { infer: true });
  }

  get telegramRequestTimeoutMs(): number {
    return this.configService.get('telegram.requestTimeoutMs', { infer: true });
  }

  get telegramInviteLinkExpiryMinutes(): number {
    return this.configService.get('telegram.inviteLinkExpiryMinutes', { infer: true });
  }
}
