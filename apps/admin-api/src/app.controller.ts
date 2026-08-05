import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { Public } from '../../../shared/decorators/public.decorator';

/**
 * Health/root controller. Marked @Public() so Kubernetes liveness/
 * readiness probes succeed without a JWT, even though JwtAuthGuard is
 * registered globally for this application.
 */
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Public()
  @Get('health')
  getHealth() {
    return this.appService.getHealthStatus();
  }
}
