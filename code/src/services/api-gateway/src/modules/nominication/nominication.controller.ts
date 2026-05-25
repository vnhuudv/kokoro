import { Controller, Get, Logger } from '@nestjs/common';
import { NominicationService } from './nominication.service';

@Controller('nominication')
export class NominicationController {
  private readonly logger = new Logger(NominicationController.name);
  constructor(private readonly service: NominicationService) {}

  @Get('health')
  health() { return { status: 'ok' }; }
}
