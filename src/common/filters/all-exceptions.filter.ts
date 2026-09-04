import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { Response } from 'express';
import { Logger } from 'nestjs-pino';

interface HttpExceptionBody {
  message?: string;
  error?: string;
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(
    private readonly httpAdapterHost: HttpAdapterHost,
    private readonly logger: Logger,
  ) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const { httpAdapter } = this.httpAdapterHost;
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    let statusCode: number;
    let message: string;
    let error: string | undefined;

    if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
        error = undefined;
      } else {
        const body = exceptionResponse as HttpExceptionBody;
        message = body.message ?? 'Error';
        error = body.error ?? undefined;
      }
    } else {
      statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
      message = 'Internal server error';
      error = undefined;

      this.logger.error(exception, 'Unhandled exception');
    }
    const responseBody = { statusCode, message, error };
    httpAdapter.reply(response, responseBody, statusCode);
  }
}
