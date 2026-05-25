import { Controller, Get, Post, Patch, Param, Body, Query, Logger } from '@nestjs/common';
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

  @Post('sessions/:id/attend')
  async markAttendance(
    @Param('id') id: string,
    @Query('tenantId') tenantId: string,
    @Body('slackUserId') slackUserId: string,
  ) {
    const tenant = tenantId ?? process.env.SLACK_TENANT_ID ?? 'a0000000-0000-0000-0000-000000000001';
    await this.service.markAttendance(id, tenant, slackUserId);
    return { ok: true };
  }

  @Get('nudges/pending')
  async getPendingNudges(@Query('tenantId') tenantId: string) {
    const tenant = tenantId ?? process.env.SLACK_TENANT_ID ?? 'a0000000-0000-0000-0000-000000000001';
    return this.service.getPendingNudges(tenant);
  }

  @Patch('nudges/:id')
  async updateNudgeStatus(
    @Param('id') id: string,
    @Query('tenantId') tenantId: string,
    @Body('status') status: string,
  ) {
    const tenant = tenantId ?? process.env.SLACK_TENANT_ID ?? 'a0000000-0000-0000-0000-000000000001';
    await this.service.updateNudgeStatus(id, tenant, status as any);
    return { ok: true };
  }
}
