import { IsUUID } from 'class-validator';

export class CreateOrderDto {
  @IsUUID('4', { message: 'courseGroupId must be a valid course group id' })
  courseGroupId!: string;
}
