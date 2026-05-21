import { Controller, Get } from '@nestjs/common';
import { AnnotationsService } from './annotations.service';
@Controller('annotations')
export class AnnotationsController {
  constructor(private readonly annotationsService: AnnotationsService) {}
  @Get('health') health() { return { status: 'ok' }; }
}
