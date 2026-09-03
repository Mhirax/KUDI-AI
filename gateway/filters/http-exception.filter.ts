import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { DomainException } from '../../shared/exceptions/domain.exception';

/**
 * Normalizes all thrown exceptions into a consistent enterprise error
 * envelope: { statusCode, error, message, path, timestamp }.
 *
 * Three exception shapes are handled, in order:
 * 1. `DomainException` (and subclasses) — framework-agnostic business
 *    rule violations raised by domain/application layers. Mapped using
 *    the exception's own `httpStatus`/`code`, so a module author only
 *    has to set those once on the exception class, not re-implement
 *    HTTP mapping in every controller.
 * 2. `HttpException` — standard NestJS/framework exceptions.
 * 3. Anything else — treated as an unexpected 500, with no internal
 *    detail leaked to the client.
 *
 * Case 3 is logged with its stack before the response is sent. The client
 * still learns nothing beyond "Internal server error", but the server keeps
 * a record: without it an unexpected failure leaves no trace anywhere, and a
 * 500 in production becomes unreproducible guesswork. Expected failures
 * (cases 1 and 2) are not logged as errors — a rejected login is not an
 * incident, and logging it as one trains people to ignore the error log.
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest();
    const url = request?.url ?? 'unknown';
    const method = request?.method ?? 'UNKNOWN';

    if (exception instanceof DomainException) {
      response.status(exception.httpStatus).json({
        statusCode: exception.httpStatus,
        error: exception.code,
        message: exception.message,
        path: url,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const status =
      exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

    let message: unknown = 'Internal server error';
    if (exception instanceof HttpException) {
      const resp = exception.getResponse();
      message = typeof resp === 'object' ? (resp as any).message ?? resp : resp;
    } else {
      this.logger.error(
        `Unhandled exception on ${method} ${url}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    response.status(status).json({
      statusCode: status,
      error: HttpStatus[status] || 'ERROR',
      message,
      path: url,
      timestamp: new Date().toISOString(),
    });
  }
}
