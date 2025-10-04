import { Module } from '@nestjs/common';
import { FunnelModule } from './funnel/funnel.module';
import { ClickUpService } from './services/clickup.service';
import { SupabaseService } from './services/supabase.service';

@Module({
  imports: [FunnelModule],
  providers: [ClickUpService, SupabaseService],
  exports: [ClickUpService, SupabaseService],
})
export class AppModule {}