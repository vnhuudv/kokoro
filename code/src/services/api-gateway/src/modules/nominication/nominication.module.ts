import { Module } from '@nestjs/common';
import { NomicationController } from './nominication.controller';
import { NomicationService } from './nominication.service';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [NomicationController],
  providers: [NomicationService],
})
export class NomicationModule {}
