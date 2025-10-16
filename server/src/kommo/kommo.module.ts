import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { KommoService } from '../services/kommo.service';
import { SyncService } from '../services/sync.service';
import { KommoSyncWorker } from '../services/kommo-sync.worker';
import { SupabaseService } from '../services/supabase.service';
import { LeadStageHistoryService } from '../services/lead-stage-history.service';
import { LeadMigrationService } from '../services/lead-migration.service';
import { KommoController } from './kommo.controller';
import { LeadMigrationController } from '../controllers/lead-migration.controller';

@Module({
  imports: [ConfigModule, ScheduleModule.forRoot()],
  providers: [
    KommoService, 
    SyncService, 
    KommoSyncWorker, 
    SupabaseService,
    LeadStageHistoryService,
    LeadMigrationService
  ],
  controllers: [KommoController, LeadMigrationController],
  exports: [
    KommoService, 
    SyncService, 
    KommoSyncWorker, 
    SupabaseService,
    LeadStageHistoryService,
    LeadMigrationService
  ],
})
export class KommoModule {}