import { IsString, IsNotEmpty } from 'class-validator';

export class SignOutDto {
  @IsString()
  @IsNotEmpty()
  token: string;
}
