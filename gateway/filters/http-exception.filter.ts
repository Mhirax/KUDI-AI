import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
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
 */

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    console.error('UNHANDLED EXCEPTION:', exception);
    const ctx = host.switchToHttp();
    console.error('UNHANDLED EXCEPTION:', exception);
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest();
    const url = request?.url ?? 'unknown';

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
      message = typeof resp === 'object' ? ((resp as any).message ?? resp) : resp;
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
