import { ApiProperty } from '@nestjs/swagger';
import {
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export class ProductUpdateInputDto {
  @ApiProperty({ example: 'summer-tshirt', required: false })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @ApiProperty({
    example: 'long sleeves, 100% cotton',
    required: false,
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  description?: string;

  @ApiProperty({
    enum: ['active', 'inactive', 'discontinued'],
    required: false,
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @IsIn(['active', 'inactive', 'discontinued'])
  status?: string;

  @ApiProperty({ example: 5, required: false })
  @IsOptional()
  @IsNumber()
  categoryId?: number;
}
