import { Module } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { DashboardController } from './dashboard.controller';
import { SupabaseService } from '../services/supabase.service';
import { KommoService } from '../services/kommo.service';

@Module({
  controllers: [DashboardController],
  providers: [DashboardService, SupabaseService, KommoService],
})
export class DashboardModule {}