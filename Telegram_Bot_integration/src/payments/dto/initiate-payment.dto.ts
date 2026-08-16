import { IsUUID } from 'class-validator';

export class InitiatePaymentDto {
  @IsUUID('4', { message: 'orderId must be a valid order id' })
  orderId!: string;
}
