import { Controller, Get, UseInterceptors, Query } from '@nestjs/common';
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
  async getTimeInStage(
    @Query('days') days?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('campaign') campaign?: string,
    @Query('source') source?: string,
    @Query('content') content?: string,
    @Query('classification') classification?: string,
  ): Promise<TimeInStageItem[]> {
    try {
      const daysNumber = days ? parseInt(days, 10) : undefined;
      const fromDate = from ? new Date(from) : undefined;
      const toDate = to ? new Date(to) : undefined;
      const data = await this.funnelService.getTimeInStage(daysNumber, fromDate, toDate, { campaign, source, content, classification });
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
      // Verificar tabela leads2 do Supabase
      const client = this.supabaseService.getClient();
      if (!client) {
        throw new Error('Cliente Supabase não inicializado');
      }
      const { data, error } = await client
        .from('leads2')
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
      console.error('Error checking leads2 table:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}
