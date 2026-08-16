import { IsInt, Min } from 'class-validator';

export class RefundPaymentDto {
  /** Integer minor units — must not exceed the original order amount (enforced in PaymentsService). */
  @IsInt()
  @Min(1)
  amount!: number;
}
