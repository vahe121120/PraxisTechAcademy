import { IsDateString, IsOptional } from 'class-validator';

export class ActivateSubscriptionDto {
  /** Optional override — defaults to one month from now (the standard billing period) when omitted. Must be a future date. */
  @IsOptional()
  @IsDateString({}, { message: 'expireDate must be a valid ISO 8601 date' })
  expireDate?: string;
}
