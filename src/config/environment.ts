import { Type } from 'class-transformer';
import {
  IsString,
  IsNumber,
  Matches,
  Min,
  Max,
  MinLength,
  IsEmail,
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

  @IsString()
  @Matches(/^sk_(test|live)_/, {
    message:
      'STRIPE_SECRET_KEY must be a real Stripe secret key (sk_test_... or sk_live_...)',
  })
  STRIPE_SECRET_KEY: string;

  @IsString()
  @Matches(/^whsec_/, {
    message:
      'STRIPE_WEBHOOK_SECRET must be a real Stripe webhook signing secret (whsec_...)',
  })
  STRIPE_WEBHOOK_SECRET: string;

  @IsString()
  EMAIL_HOST: string;

  @Type(() => Number)
  @IsNumber()
  EMAIL_PORT: number;

  @IsEmail()
  EMAIL_USER: string;

  @IsString()
  EMAIL_PASSWORD: string;

  @IsString()
  EMAIL_FROM: string;
}
