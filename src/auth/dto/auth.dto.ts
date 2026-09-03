import { ApiProperty } from '@nestjs/swagger';

export class AuthDto {
  @ApiProperty()
  access_token: string;

  @ApiProperty()
  refresh_token: string;
}
