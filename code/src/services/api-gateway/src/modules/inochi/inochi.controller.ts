import { Controller, Get, Post, Body, Query, HttpCode, UseGuards, Req } from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { InochiService } from './inochi.service';
import { InochiSyncJob } from './inochi-sync.job';
import { CreateOffsetDto } from './inochi.types';

function currentMonthUTC(): string {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
}

function lastMonthFirstDayUTC(): string {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1))
    .toISOString()
    .slice(0, 10);
}

@UseGuards(JwtAuthGuard)
@Controller('inochi')
export class InochiController {
  constructor(
    private readonly inochiService: InochiService,
    private readonly syncJob: InochiSyncJob,
  ) {}

  @Get('carbon/me')
  getPersonalCarbon(
    @Req() req: Request,
    @Query('month') month = currentMonthUTC(),
  ) {
    return this.inochiService.getPersonalCarbon(req.user!.user_id, month);
  }

  @Get('carbon/me/history')
  getPersonalHistory(@Req() req: Request) {
    return this.inochiService.getPersonalHistory(req.user!.user_id);
  }

  @Get('carbon/company')
  getCompanyCarbon(@Query('month') month = currentMonthUTC()) {
    return this.inochiService.getCompanyCarbon(month);
  }

  @Get('offsets')
  listOffsets() {
    return this.inochiService.listOffsets();
  }

  @Post('offsets')
  @HttpCode(201)
  createOffset(@Body() dto: CreateOffsetDto, @Req() req: Request) {
    return this.inochiService.createOffset(dto, req.user!.user_id);
  }

  @Post('sync')
  @HttpCode(200)
  async triggerSync() {
    const periodDate = lastMonthFirstDayUTC();
    try {
      const result = await this.syncJob.syncEstimates(periodDate);
      return { ok: true, period: periodDate, ...result };
    } catch (err) {
      return { ok: false, period: periodDate, error: String(err) };
    }
  }
}
