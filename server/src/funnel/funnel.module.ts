import { Module } from '@nestjs/common';
import { FunnelService } from './funnel.service';
import { FunnelController } from './funnel.controller';
import { SupabaseService } from '../services/supabase.service';
import { KommoService } from '../services/kommo.service';

@Module({
  controllers: [FunnelController],
  providers: [FunnelService, SupabaseService, KommoService],
})
export class FunnelModule {}