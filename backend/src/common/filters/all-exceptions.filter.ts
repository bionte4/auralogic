import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { Response } from 'express';
import { reportException, type ErrorContext } from '../monitoring/error-monitor';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      reportException(exception, requestContext(host, status));
      const body = exception.getResponse();
      response.status(status).json(typeof body === 'string' ? { statusCode: status, message: body } : body);
      return;
    }

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      const mapped = mapPrismaError(exception);
      reportException(exception, requestContext(host, mapped.status));
      response.status(mapped.status).json({
        statusCode: mapped.status,
        message: mapped.message,
        error: mapped.error,
      });
      return;
    }

    if (isOversizedUpload(exception)) {
      response.status(HttpStatus.BAD_REQUEST).json({
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Materials must be 20 MB or smaller.',
        error: 'Bad Request',
      });
      return;
    }

    if (exception instanceof Prisma.PrismaClientValidationError) {
      reportException(exception, requestContext(host, HttpStatus.BAD_REQUEST));
      response.status(HttpStatus.BAD_REQUEST).json({
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Invalid data for this operation.',
        error: 'Bad Request',
      });
      return;
    }

    this.logger.error(exception instanceof Error ? exception.stack : 'Unhandled exception');
    reportException(exception, requestContext(host, HttpStatus.INTERNAL_SERVER_ERROR));
    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Internal server error.',
      error: 'Internal Server Error',
    });
  }
}

function requestContext(host: ArgumentsHost, status: number): ErrorContext {
  const request = host.switchToHttp().getRequest<{ method?: string; originalUrl?: string; url?: string }>();
  return {
    method: request.method ?? 'GET',
    path: request.originalUrl ?? request.url ?? '',
    status,
  };
}

function isOversizedUpload(exception: unknown): boolean {
  return (
    typeof exception === 'object' &&
    exception !== null &&
    'name' in exception &&
    'code' in exception &&
    exception.name === 'MulterError' &&
    exception.code === 'LIMIT_FILE_SIZE'
  );
}

function mapPrismaError(exception: Prisma.PrismaClientKnownRequestError): {
  status: number;
  message: string;
  error: string;
} {
  if (exception.code === 'P2002') {
    return {
      status: HttpStatus.CONFLICT,
      message: 'A record with this unique value already exists.',
      error: 'Conflict',
    };
  }

  if (exception.code === 'P2003') {
    return {
      status: HttpStatus.CONFLICT,
      message: 'This record is still referenced and cannot be changed.',
      error: 'Conflict',
    };
  }

  if (exception.code === 'P2025') {
    return {
      status: HttpStatus.NOT_FOUND,
      message: 'Record not found.',
      error: 'Not Found',
    };
  }

  return {
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    message: 'Internal server error.',
    error: 'Internal Server Error',
  };
}
