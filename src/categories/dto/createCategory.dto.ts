import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateCategoryDto {
  /** Category name, e.g. "t-shirts" */
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  name: string;
}
