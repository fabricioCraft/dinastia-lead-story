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
  @CacheKey('daily_lead_volume_data')
  @CacheTTL(3600) // 1 hora - cache para dados de agregação@Get('daily-lead-volume')
  async getDailyLeadVolume(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.dashboardService.getDailyLeadVolume(startDate, endDate);
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
  @CacheKey('daily_appointments_data')
  @CacheTTL(3600) // 1 hora - cache para dados de agendamentos diários
  async getDailyAppointments(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.dashboardService.getDailyAppointments(startDate, endDate);
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





}