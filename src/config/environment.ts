import { Type } from 'class-transformer';
import {
  IsString,
  IsNumber,
  Matches,
  Min,
  Max,
  MinLength,
} from 'class-validator';

export class EnvironmentVariables {
  @IsString()
  @Matches(/^postgres(ql)?:\/\//, {
    message:
      'DATABASE_URL must be a valid PostgreSQL connection string (postgres:// or postgresql://)',
  })
  DATABASE_URL: string;
  @IsString()
  @MinLength(32, {
    message:
      'JWT_SECRET must be at least 32 characters — generate one with `openssl rand -hex 32`',
  })
  JWT_SECRET: string;
  @Type(() => Number)
  @IsNumber()
  @Min(60)
  @Max(86400)
  JWT_EXPIRATION: number;
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(65535)
  PORT: number;

  @IsString()
  NODE_ENV: string;
}
