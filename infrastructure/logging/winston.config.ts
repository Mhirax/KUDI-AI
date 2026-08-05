import { WinstonModuleOptions } from 'nest-winston';
import * as winston from 'winston';

/**
 * Structured JSON logging configuration for production observability
 * (shipped to ELK/Loki via the configured transport).
 */
export const winstonConfig: WinstonModuleOptions = {
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json(),
  ),
  transports: [new winston.transports.Console()],
};
