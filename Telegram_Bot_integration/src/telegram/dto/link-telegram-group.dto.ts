import { Transform } from 'class-transformer';
import { IsString, IsUUID, Length, Matches } from 'class-validator';

export class LinkTelegramGroupDto {
  @IsUUID('4', { message: 'courseGroupId must be a valid course group id' })
  courseGroupId!: string;

  // Telegram chat ids for supergroups are large negative integers (e.g.
  // -1001234567890) — sent as a string since JSON numbers lose precision
  // beyond 2^53 and a raw negative bigint isn't valid JSON input anyway.
  @IsString()
  @Matches(/^-?\d{1,20}$/, { message: 'telegramChatId must be a numeric Telegram chat id' })
  telegramChatId!: string;

  @IsString()
  @Length(1, 150)
  @Transform(({ value }: { value: string }) => value?.trim())
  title!: string;
}
