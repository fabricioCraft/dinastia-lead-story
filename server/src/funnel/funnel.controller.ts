import { Controller, Get, Query, Res, UseInterceptors } from '@nestjs/common';
import { CacheInterceptor, CacheTTL, CacheKey } from '@nestjs/cache-manager';
import { Response } from 'express';
import { FunnelService, StageSummaryItem, TimeInStageItem, OriginSummaryItem } from './funnel.service';

@Controller('funnel')
export class FunnelController {
  constructor(private readonly funnelService: FunnelService) {}

  @Get('summary')
  async getSummary(@Res() res: Response, @Query('days') days?: string) {
    // Evita cache no navegador (os dados não devem ficar expostos via cache do browser)
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    // Aguarda cálculo completo para garantir retorno de dados reais
    const d = days ? Number(days) : undefined;
    const data = await this.funnelService.getSummary(d);
    return res.json(data);
  }

  @UseInterceptors(CacheInterceptor)
  @CacheKey('funnel-origin-summary')
  @CacheTTL(300) // 5 minutos
  @Get('origin-summary')
  async getOriginSummary(@Query('days') days?: string): Promise<OriginSummaryItem[]> {
    try {
      const d = days ? Number(days) : undefined;
      const data = await this.funnelService.getOriginSummary(d);
      return data;
    } catch (err) {
      return [];
    }
  }

  @UseInterceptors(CacheInterceptor)
  @CacheKey('funnel-stages-summary')
  @CacheTTL(60)
  @Get('stages-summary')
  async getStagesSummary(@Query('days') days?: string): Promise<StageSummaryItem[]> {
    try {
      const d = days ? Number(days) : undefined;
      const data = await this.funnelService.getStagesSummary(d);
      return data;
    } catch (err) {
      return [];
    }
  }

  @UseInterceptors(CacheInterceptor)
  @CacheKey('funnel-time-in-stage')
  @CacheTTL(300) // 5 minutos
  @Get('time-in-stage')
  async getTimeInStage(@Query('days') days?: string): Promise<TimeInStageItem[]> {
    try {
      const d = days ? Number(days) : undefined;
      const data = await this.funnelService.getTimeInStage(d);
      return data;
    } catch (err) {
      return [];
    }
  }

  // Endpoint removido - seed do ClickUp não é mais necessário
}