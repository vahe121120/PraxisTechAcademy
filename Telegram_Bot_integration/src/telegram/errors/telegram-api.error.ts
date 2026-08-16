export class TelegramApiError extends Error {
  constructor(
    message: string,
    public readonly errorCode?: number,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'TelegramApiError';
  }
}
