import { ApiProperty } from '@nestjs/swagger';

export class ErrorDto {
  @ApiProperty({ example: 404 })
  statusCode: number;

  @ApiProperty({ example: 'Product not found' })
  message: string;

  @ApiProperty({ example: 'Not Found', required: false })
  error?: string;
}
