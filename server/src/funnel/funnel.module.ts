import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { FunnelController } from './funnel.controller';
import { FunnelService } from './funnel.service';
import { TestSqlController } from './test-sql.controller';
import { SupabaseService } from '../services/supabase.service';
import { LeadStageHistoryService } from '../services/lead-stage-history.service';

@Module({
  imports: [ConfigModule],
  controllers: [FunnelController, TestSqlController],
  providers: [FunnelService, SupabaseService, LeadStageHistoryService],
})
export class FunnelModule {}