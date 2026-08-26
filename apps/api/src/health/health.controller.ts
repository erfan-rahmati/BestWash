import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
  @Get()
  getHealth() {
    return {
      status: 'ok',
      service: 'bestwash-api',
      timestamp: new Date().toISOString(),
    };
  }
}
