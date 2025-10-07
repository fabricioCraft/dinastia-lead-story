import { Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { ScheduleModule } from '@nestjs/schedule';
import { FunnelModule } from './funnel/funnel.module';
import { SupabaseService } from './services/supabase.service';
import { KommoService } from './services/kommo.service';
import { KommoSyncWorker } from './services/kommo-sync.worker';
import { DashboardModule } from './dashboard/dashboard.module';

@Module({
  imports: [CacheModule.register({ isGlobal: true }), ScheduleModule.forRoot(), FunnelModule, DashboardModule],
  providers: [SupabaseService, KommoService, KommoSyncWorker],
  exports: [SupabaseService, KommoService],
})
export class AppModule {}