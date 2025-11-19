import { Controller, Get, Query, UseInterceptors } from '@nestjs/common';
import { CacheInterceptor } from '@nestjs/cache-manager';
import { CacheKey, CacheTTL } from '@nestjs/cache-manager';
import { DashboardService, UnifiedOriginSummaryData } from './dashboard.service';

@Controller('dashboard')
export class DashboardController {
  constructor(
    private readonly dashboardService: DashboardService
  ) {}



  @Get('daily-lead-volume')
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(3600) // 1 hora - cache para dados de agregação@Get('daily-lead-volume')
  async getDailyLeadVolume(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('days') days?: string,
  ) {
    const daysNumber = days ? parseInt(days, 10) : undefined;
    return this.dashboardService.getDailyLeadVolume(startDate, endDate, daysNumber);
  }

  @Get('scheduling-summary')
  @UseInterceptors(CacheInterceptor)
  @CacheKey('scheduling_summary_data')
  @CacheTTL(3600) // 1 hora - cache para dados de KPIs de agendamento
  async getSchedulingSummary() {
    return this.dashboardService.getSchedulingSummary();
  }

  @Get('daily-appointments')
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(3600) // 1 hora - cache para dados de agendamentos diários
  async getDailyAppointments(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('days') days?: string,
  ) {
    const daysNumber = days ? parseInt(days, 10) : undefined;
    return this.dashboardService.getDailyAppointments(startDate, endDate, daysNumber);
  }

  

  @Get('unified-origin-summary')
  @CacheTTL(3600) // 1 hour cache
  async getUnifiedOriginSummary(
    @Query('days') days?: string,
    @Query('from') from?: string,
    @Query('to') to?: string
  ): Promise<UnifiedOriginSummaryData[]> {
    const daysNumber = days ? parseInt(days, 10) : undefined;
    const fromDate = from ? new Date(from) : undefined;
    const toDate = to ? new Date(to) : undefined;
    
    return this.dashboardService.getUnifiedOriginSummary(daysNumber, fromDate, toDate);
  }

  @Get('leads-by-stage')
  @UseInterceptors(CacheInterceptor)
  @CacheKey('leads_by_stage_data')
  @CacheTTL(3600) // 1 hora - cache para dados de leads por etapa
  async getLeadsByStage() {
    return this.dashboardService.getDashboardLeadsByStage();
  }

  @Get('leads-by-classification')
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(3600)
  async getLeadsByClassification(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('days') days?: string,
  ) {
    const daysNumber = days ? parseInt(days, 10) : undefined;
    return this.dashboardService.getLeadsByClassification(startDate, endDate, daysNumber);
  }

  @Get('campaign-drilldown')
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(3600)
  async getCampaignDrilldown(
    @Query('viewBy') viewBy?: string,
    @Query('campaign') campaign?: string,
    @Query('source') source?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('days') days?: string,
  ) {
    const daysNumber = days ? parseInt(days, 10) : undefined;
    return this.dashboardService.getCampaignDrilldown(viewBy as any, campaign, source, startDate, endDate, daysNumber);
  }





}