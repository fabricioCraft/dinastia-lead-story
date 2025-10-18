import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CacheModule } from '@nestjs/cache-manager';
import { ScheduleModule } from '@nestjs/schedule';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
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
    ServeStaticModule.forRoot({
      // A pasta 'client' conterá nosso build do React
      rootPath: join(__dirname, '..', 'client'),
      // Garante que rotas desconhecidas pela API retornem o index.html (para o React Router funcionar)
      exclude: ['/api*'],
    }),
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