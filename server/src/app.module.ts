import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CacheModule } from '@nestjs/cache-manager';
import { ScheduleModule } from '@nestjs/schedule';
import { FunnelModule } from './funnel/funnel.module';
import { SupabaseService } from './services/supabase.service';
import { SupabaseDebugService } from './services/supabase-debug.service';
import { DashboardModule } from './dashboard/dashboard.module';
import { KommoModule } from './kommo/kommo.module';
import { KommoService } from './services/kommo.service';
import { KommoSyncWorker } from './services/kommo-sync.worker';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    CacheModule.register({ isGlobal: true }),
    ScheduleModule.forRoot(),
    FunnelModule, // Restaurado
    DashboardModule, // Restaurado
    KommoModule // Restaurado
  ],
  providers: [
    SupabaseService, // Adicionado de volta
    SupabaseDebugService, // Adicionado de volta
    KommoService, // Restaurado
    KommoSyncWorker // Restaurado
  ],
  exports: [
    SupabaseService, // Adicionado de volta
    SupabaseDebugService, // Adicionado de volta
    KommoService // Restaurado
  ],
})
export class AppModule {}