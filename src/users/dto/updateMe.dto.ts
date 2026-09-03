import {
  IsDateString,
  IsOptional,
  IsString,
  IsNotEmpty,
} from 'class-validator';

export class UpdateMeDto {
  /** New username, must still be unique */
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  username?: string;

  @IsOptional()
  @IsDateString()
  birthdate?: string;
}
