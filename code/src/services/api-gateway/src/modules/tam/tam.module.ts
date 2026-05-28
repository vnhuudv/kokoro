import { Module } from '@nestjs/common';
import { TamController } from './tam.controller';
import { TamService } from './tam.service';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [TamController],
  providers: [TamService],
  exports: [TamService],
})
export class TamModule {}
