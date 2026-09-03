import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class SignOutDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  token: string;
}
