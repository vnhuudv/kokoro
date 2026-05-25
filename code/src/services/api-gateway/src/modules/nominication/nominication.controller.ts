import { Controller, Get, Post, Param, Body, Query, Logger } from '@nestjs/common';
import { NominicationService } from './nominication.service';
import type { CreateSessionDto } from './nominication.types';

@Controller('nominication')
export class NominicationController {
  private readonly logger = new Logger(NominicationController.name);
  constructor(private readonly service: NominicationService) {}

  @Get('health')
  health() { return { status: 'ok' }; }

  @Post('sessions')
  async createSession(
    @Query('tenantId') tenantId: string,
    @Query('slackUserId') slackUserId: string,
    @Body() dto: CreateSessionDto,
  ) {
    const tenant = tenantId ?? process.env.SLACK_TENANT_ID ?? 'a0000000-0000-0000-0000-000000000001';
    return this.service.createSession(tenant, slackUserId, dto);
  }

  @Get('sessions/:id')
  async getSession(
    @Param('id') id: string,
    @Query('tenantId') tenantId: string,
  ) {
    const tenant = tenantId ?? process.env.SLACK_TENANT_ID ?? 'a0000000-0000-0000-0000-000000000001';
    return this.service.getSession(id, tenant);
  }
}
