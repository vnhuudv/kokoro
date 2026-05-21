import { Controller, Get, Post, Body, Query, HttpCode } from '@nestjs/common';
import { InochiService } from './inochi.service';
import { InochiSyncJob } from './inochi-sync.job';
import { CreateOffsetDto } from './inochi.types';

const DEMO_USER_ID = '00000000-0000-0000-0000-000000000001';

function currentMonth(): string {
  return new Date().toISOString().slice(0, 7);
}

@Controller('inochi')
export class InochiController {
  constructor(
    private readonly inochiService: InochiService,
    private readonly syncJob: InochiSyncJob,
  ) {}

  @Get('carbon/me')
  getPersonalCarbon(
    @Query('user_id') userId = DEMO_USER_ID,
    @Query('month') month = currentMonth(),
  ) {
    return this.inochiService.getPersonalCarbon(userId, month);
  }

  @Get('carbon/me/history')
  getPersonalHistory(@Query('user_id') userId = DEMO_USER_ID) {
    return this.inochiService.getPersonalHistory(userId);
  }

  @Get('carbon/company')
  getCompanyCarbon(@Query('month') month = currentMonth()) {
    return this.inochiService.getCompanyCarbon(month);
  }

  @Get('offsets')
  listOffsets() {
    return this.inochiService.listOffsets();
  }

  @Post('offsets')
  @HttpCode(201)
  createOffset(@Body() dto: CreateOffsetDto) {
    return this.inochiService.createOffset(dto, DEMO_USER_ID);
  }

  @Post('sync')
  @HttpCode(200)
  async triggerSync() {
    const now = new Date();
    const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const periodDate = lastMonthDate.toISOString().slice(0, 10);
    const result = await this.syncJob.syncEstimates(periodDate);
    return { ok: true, period: periodDate, ...result };
  }
}
