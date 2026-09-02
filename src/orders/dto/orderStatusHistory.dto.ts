import { IsDateString, IsIn, IsNotEmpty, IsString } from 'class-validator';

export class OrderStatusHistoryDto {
  @IsString()
  @IsNotEmpty()
  @IsIn(['pending', 'paid', 'processing', 'shipped', 'cancelled'])
  status?: string;

  @IsDateString()
  @IsNotEmpty()
  changedAt: Date | null;

  @IsString()
  @IsNotEmpty()
  changedBy: string;
}
