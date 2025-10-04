import { Module } from '@nestjs/common';
import { FunnelService } from './funnel.service';
import { FunnelController } from './funnel.controller';
import { ClickUpService } from '../services/clickup.service';
import { SupabaseService } from '../services/supabase.service';

@Module({
  controllers: [FunnelController],
  providers: [FunnelService, ClickUpService, SupabaseService],
})
export class FunnelModule {}