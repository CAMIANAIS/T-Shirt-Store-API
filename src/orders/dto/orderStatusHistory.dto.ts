import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsIn, IsNotEmpty, IsString } from 'class-validator';

export class OrderStatusHistoryDto {
  @ApiProperty({
    enum: ['pending', 'paid', 'processing', 'shipped', 'cancelled'],
  })
  @IsString()
  @IsNotEmpty()
  @IsIn(['pending', 'paid', 'processing', 'shipped', 'cancelled'])
  status?: string;

  @ApiProperty({ example: '2026-01-01T00:00:00.000Z', nullable: true })
  @IsDateString()
  @IsNotEmpty()
  changedAt: Date | null;

  @ApiProperty({ example: 'manager@store.com' })
  @IsString()
  @IsNotEmpty()
  changedBy: string;
}
