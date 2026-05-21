import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { InochiController } from './inochi.controller';
import { InochiService } from './inochi.service';
import { InochiSyncJob } from './inochi-sync.job';

@Module({
  imports: [AuthModule],
  controllers: [InochiController],
  providers: [InochiService, InochiSyncJob],
  exports: [InochiService],
})
export class InochiModule {}
