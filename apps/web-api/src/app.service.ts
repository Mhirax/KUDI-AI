import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHealthStatus(): { status: string; service: string; timestamp: string } {
    return {
      status: 'ok',
      service: 'web-api',
      timestamp: new Date().toISOString(),
    };
  }
}
