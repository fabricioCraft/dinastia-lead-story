import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CacheModule } from '@nestjs/cache-manager';
import { DashboardService } from './dashboard.service';
import { DashboardController } from './dashboard.controller';
import { SupabaseService } from '../services/supabase.service';
import { DashboardPersistenceService } from '../services/dashboard-persistence.service';

@Module({
  imports: [CacheModule.register()],
  controllers: [DashboardController],
  providers: [DashboardService, SupabaseService, DashboardPersistenceService],
})
export class DashboardModule {}