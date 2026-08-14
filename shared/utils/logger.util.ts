/**
 * Thin wrapper placeholder around the platform logger. The concrete
 * transport (Winston/Pino) is configured in infrastructure/logging.
 */
export class AppLogger {
  static log(message: string, context?: string): void {
    // eslint-disable-next-line no-console
    console.log(`[${context ?? 'App'}] ${message}`);
  }

  static error(message: string, trace?: string, context?: string): void {
    // eslint-disable-next-line no-console
    console.error(`[${context ?? 'App'}] ${message}`, trace);
  }
}
