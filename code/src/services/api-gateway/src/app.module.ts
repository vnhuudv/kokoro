import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { AnnotationsModule } from './modules/annotations/annotations.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { DatabaseModule } from './modules/database/database.module';
import { InochiModule } from './modules/inochi/inochi.module';
import { NominicationModule } from './modules/nominication/nominication.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    DatabaseModule,
    AuthModule,
    UsersModule,
    AnnotationsModule,
    DashboardModule,
    InochiModule,
    NominicationModule,
  ],
})
export class AppModule {}
