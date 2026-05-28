import { Module } from '@nestjs/common';
import { MakotoController } from './makoto.controller';
import { MakotoService } from './makoto.service';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [MakotoController],
  providers: [MakotoService],
  exports: [MakotoService],
})
export class MakotoModule {}
