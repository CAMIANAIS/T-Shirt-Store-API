import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsString } from 'class-validator';

export class UpdateOrderStatusDto {
  @ApiProperty({ enum: ['processing', 'shipped'] })
  @IsString()
  @IsIn(['processing', 'shipped'])
  status: string;
}
