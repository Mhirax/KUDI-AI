import { HttpStatus } from '@nestjs/common';

/**
 * Base exception for all domain-layer rule violations. Framework-agnostic
 * (no HttpException dependency in constructor logic) — but carries an
 * `httpStatus` hint so the presentation-layer filter
 * (/gateway/filters/http-exception.filter.ts) can translate it into the
 * correct HTTP response without every module reimplementing that
 * mapping. Subclasses override `httpStatus` to match their semantics
 * (409 for conflicts, 404 for not-found, 422 for business-rule
 * violations like insufficient funds, etc.). Defaults to 400.
 */
export class DomainException extends Error {
  public readonly httpStatus: number = HttpStatus.BAD_REQUEST;

  constructor(
    message: string,
    public readonly code: string = 'DOMAIN_ERROR',
  ) {
    super(message);
    this.name = 'DomainException';
  }
}
