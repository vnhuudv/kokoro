import { Controller, Get, Query, HttpException, HttpStatus } from '@nestjs/common';
import { DashboardService } from './dashboard.service';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('team')
  getTeam(@Query('tenant_id') tenantId = 'default') {
    return this.dashboardService.getTeamMetrics(tenantId);
  }

  @Get('trend')
  getTrend(@Query('tenant_id') tenantId = 'default') {
    return this.dashboardService.getTrend(tenantId);
  }

  @Get('cases')
  getCases(
    @Query('tenant_id') tenantId = 'default',
    @Query('limit') limit = 10,
  ) {
    return this.dashboardService.getRecentCases(tenantId, Number(limit));
  }

  @Get('personal')
  getPersonal(@Query('user_id') userId = 'demo') {
    return this.dashboardService.getPersonalMetrics(userId);
  }

  @Get('public')
  getPublic() {
    return this.dashboardService.getPublicSummary();
  }

  @Get('inochi/carbon')
  async getCarbon() {
    return this.dashboardService.getCarbonFootprint();
  }

  @Get('en-score')
  async getEnScore(
    @Query('userId') userId: string,
    @Query('tenantId') tenantId: string,
  ) {
    const tenant = tenantId ?? process.env.SLACK_TENANT_ID ?? 'a0000000-0000-0000-0000-000000000001';
    return this.dashboardService.getEnScore(tenant, userId);
  }
}
