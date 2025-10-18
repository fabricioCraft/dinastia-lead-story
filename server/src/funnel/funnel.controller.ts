import { Controller, Get, UseInterceptors } from '@nestjs/common';
import { CacheInterceptor, CacheTTL, CacheKey } from '@nestjs/cache-manager';
import { FunnelService, StageSummaryItem, TimeInStageItem } from './funnel.service';
import { SupabaseService } from '../services/supabase.service';

@Controller('funnel')
export class FunnelController {
  constructor(
    private readonly funnelService: FunnelService,
    private readonly supabaseService: SupabaseService
  ) {}

  @UseInterceptors(CacheInterceptor)
  @CacheKey('funnel-stages-summary')
  @CacheTTL(21600) // 6 horas - cache alinhado com sincronização bi-diária (7h e 14h BRT)
  @Get('stages-summary')
  async getStagesSummary(): Promise<StageSummaryItem[]> {
    try {
      const data = await this.funnelService.getStagesSummary();
      return data;
    } catch (err) {
      console.error('Error in getStagesSummary endpoint:', err);
      return [];
    }
  }

  @UseInterceptors(CacheInterceptor)
  @CacheKey('funnel-time-in-stage')
  @CacheTTL(21600) // 6 horas - cache alinhado com sincronização bi-diária (7h e 14h BRT)
  @Get('time-in-stage')
  async getTimeInStage(): Promise<TimeInStageItem[]> {
    try {
      const data = await this.funnelService.getTimeInStage();
      return data;
    } catch (err) {
      console.error('Error in getTimeInStage endpoint:', err);
      return [];
    }
  }

  @UseInterceptors(CacheInterceptor)
  @CacheKey('funnel-scheduling-rate')
  @CacheTTL(21600) // 6 horas - cache alinhado com sincronização bi-diária (7h e 14h BRT)
  @Get('scheduling-rate')
  async getSchedulingRate(): Promise<{ schedulingRate: number }> {
    try {
      const data = await this.funnelService.getSchedulingRate();
      return data;
    } catch (err) {
      console.error('Error in getSchedulingRate endpoint:', err);
      return { schedulingRate: 0 };
    }
  }

  @Get('check-table')
  async checkTable() {
    try {
      // Verificar tabelas principais do Supabase
      const client = this.supabaseService.getClient();
      if (!client) {
        throw new Error('Cliente Supabase não inicializado');
      }
      const { data, error } = await client
        .from('px_leads')
        .select('*', { count: 'exact', head: true });
      
      return {
        success: true,
        tableInfo: {
          exists: !error,
          count: data?.length || 0,
          error: error?.message
        }
      };
    } catch (error) {
      console.error('Error checking px_leads table:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}