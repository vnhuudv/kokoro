import { Module } from '@nestjs/common';
import { InochiController } from './inochi.controller';
import { InochiService } from './inochi.service';
import { InochiSyncJob } from './inochi-sync.job';

@Module({
  controllers: [InochiController],
  providers: [InochiService, InochiSyncJob],
  exports: [InochiService],
})
export class InochiModule {}
