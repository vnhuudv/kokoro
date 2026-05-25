import { Module } from '@nestjs/common';
import { NominicationController } from './nominication.controller';
import { NominicationService } from './nominication.service';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [NominicationController],
  providers: [NominicationService],
  exports: [NominicationService],
})
export class NominicationModule {}
