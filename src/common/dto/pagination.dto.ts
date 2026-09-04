import { IsNumber, IsOptional, Max, Min } from 'class-validator';

export class PaginationParamsDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(50)
  limit?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  offset?: number;
}
