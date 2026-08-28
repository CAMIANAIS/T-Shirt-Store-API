import {
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export class ProductUpdateInputDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  description: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @IsIn(['active', 'inactive', 'discontinued'])
  status: string;

  @IsOptional()
  @IsNumber()
  categoryId: number;
}
