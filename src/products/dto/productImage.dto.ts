import { IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateProductImageDto {
  @IsOptional()
  @IsNumber()
  displayOrder: number;

  @IsOptional()
  @IsString()
  altText: string;
}
