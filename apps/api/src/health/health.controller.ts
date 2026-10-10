import { Controller, Get } from '@nestjs/common';
import type { HealthResponse } from '@repo/shared';
import { PrismaService } from '../prisma/prisma.service';

@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async check(): Promise<HealthResponse> {
    const dbUp = await this.prisma.$queryRaw`SELECT 1`.then(
      () => true,
      () => false,
    );
    return {
      status: dbUp ? 'ok' : 'error',
      db: dbUp ? 'up' : 'down',
      timestamp: new Date().toISOString(),
    };
  }
}
