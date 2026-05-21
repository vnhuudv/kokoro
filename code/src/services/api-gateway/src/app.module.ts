import { Module } from '@nestjs/common';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { AnnotationsModule } from './modules/annotations/annotations.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { DatabaseModule } from './modules/database/database.module';

@Module({
  imports: [DatabaseModule, AuthModule, UsersModule, AnnotationsModule, DashboardModule],
})
export class AppModule {}
