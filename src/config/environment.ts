import { Type } from 'class-transformer';
import { IsString, IsNumber, Matches, Min, Max } from 'class-validator';

export class EnvironmentVariables {
  @IsString()
  @Matches(/^postgres(ql)?:\/\//, {
    message:
      'DATABASE_URL must be a valid PostgreSQL connection string (postgres:// or postgresql://)',
  })
  DATABASE_URL: string;
  @IsString()
  JWT_SECRET: string;
  @Type(() => Number)
  JWT_EXPIRATION: number;
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(65535)
  PORT: number;

  @IsString()
  NODE_ENV: string;
}
