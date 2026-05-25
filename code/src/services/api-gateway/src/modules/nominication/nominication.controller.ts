import { Controller, Get, Logger } from '@nestjs/common';
import { NomicationService } from './nominication.service';

@Controller('nominication')
export class NomicationController {
  private readonly logger = new Logger(NomicationController.name);
  constructor(private readonly service: NomicationService) {}

  @Get('health')
  health() { return { status: 'ok' }; }
}
