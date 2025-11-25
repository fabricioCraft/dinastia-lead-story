import { Controller, Get, Query, UseInterceptors } from '@nestjs/common';
import { CacheInterceptor } from '@nestjs/cache-manager';
import { CacheKey, CacheTTL } from '@nestjs/cache-manager';
import { DashboardService, UnifiedOriginSummaryData } from './dashboard.service';
import { CampaignSummaryCacheInterceptor } from './campaign-summary-cache.interceptor';

@Controller('dashboard')
export class DashboardController {
  constructor(
    private readonly dashboardService: DashboardService
  ) { }



  @Get('daily-lead-volume')
  // @UseInterceptors(CampaignSummaryCacheInterceptor)
  async getDailyLeadVolume(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('days') days?: string,
    @Query('campaign') campaign?: string,
    @Query('source') source?: string,
    @Query('content') content?: string,
    @Query('classification') classification?: string,
    @Query('origin') origin?: string,
    @Query('scheduler') scheduler?: string,
  ) {
    const daysNumber = days ? parseInt(days, 10) : undefined;
    return this.dashboardService.getDailyLeadVolume(startDate, endDate, daysNumber, { campaign, source, content, classification, origin, scheduler });
  }

  @Get('scheduling-summary')
  @UseInterceptors(CampaignSummaryCacheInterceptor)
  async getSchedulingSummary(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('days') days?: string,
    @Query('campaign') campaign?: string,
    @Query('source') source?: string,
    @Query('content') content?: string,
    @Query('classification') classification?: string,
    @Query('origin') origin?: string,
    @Query('scheduler') scheduler?: string,
  ) {
    const daysNumber = days ? parseInt(days, 10) : undefined;
    return this.dashboardService.getSchedulingSummary(startDate, endDate, daysNumber, { campaign, source, content, classification, origin, scheduler });
  }

  @Get('daily-appointments')
  @UseInterceptors(CampaignSummaryCacheInterceptor)
  async getDailyAppointments(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('days') days?: string,
    @Query('campaign') campaign?: string,
    @Query('source') source?: string,
    @Query('content') content?: string,
    @Query('classification') classification?: string,
    @Query('origin') origin?: string,
    @Query('scheduler') scheduler?: string,
  ) {
    const daysNumber = days ? parseInt(days, 10) : undefined;
    return this.dashboardService.getDailyAppointments(startDate, endDate, daysNumber, { campaign, source, content, classification, origin, scheduler });
  }

  @Get('appointments-by-person')
  @UseInterceptors(CampaignSummaryCacheInterceptor)
  async getAppointmentsByPerson(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('days') days?: string,
    @Query('campaign') campaign?: string,
    @Query('source') source?: string,
    @Query('content') content?: string,
    @Query('classification') classification?: string,
    @Query('origin') origin?: string,
    @Query('scheduler') scheduler?: string,
  ) {
    const daysNumber = days ? parseInt(days, 10) : undefined;
    return this.dashboardService.getAppointmentsByPerson(startDate, endDate, daysNumber, { campaign, source, content, classification, origin, scheduler });
  }

  @Get('appointments-by-person-per-day')
  @UseInterceptors(CampaignSummaryCacheInterceptor)
  async getAppointmentsByPersonPerDay(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('days') days?: string,
    @Query('campaign') campaign?: string,
    @Query('source') source?: string,
    @Query('content') content?: string,
    @Query('classification') classification?: string,
    @Query('origin') origin?: string,
    @Query('scheduler') scheduler?: string,
  ) {
    const daysNumber = days ? parseInt(days, 10) : undefined;
    return this.dashboardService.getAppointmentsByPersonPerDay(startDate, endDate, daysNumber, { campaign, source, content, classification, origin, scheduler });
  }

  @Get('unified-origin-summary')
  @UseInterceptors(CampaignSummaryCacheInterceptor)
  async getUnifiedOriginSummary(
    @Query('days') days?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('campaign') campaign?: string,
    @Query('source') source?: string,
    @Query('content') content?: string,
    @Query('classification') classification?: string,
    @Query('origin') origin?: string,
    @Query('scheduler') scheduler?: string,
  ): Promise<UnifiedOriginSummaryData[]> {
    const daysNumber = days ? parseInt(days, 10) : undefined;
    const fromDate = from ? new Date(from) : undefined;
    const toDate = to ? new Date(to) : undefined;

    return this.dashboardService.getUnifiedOriginSummary(daysNumber, fromDate, toDate, { campaign, source, content, classification, origin, scheduler });
  }

  @Get('leads-by-stage')
  @UseInterceptors(CampaignSummaryCacheInterceptor)
  async getLeadsByStage(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('days') days?: string,
    @Query('campaign') campaign?: string,
    @Query('source') source?: string,
    @Query('content') content?: string,
    @Query('classification') classification?: string,
    @Query('origin') origin?: string,
    @Query('scheduler') scheduler?: string,
  ) {
    const daysNumber = days ? parseInt(days, 10) : undefined;
    return this.dashboardService.getDashboardLeadsByStage(startDate, endDate, daysNumber, { campaign, source, content, classification, origin, scheduler });
  }

  @Get('leads-by-classification')
  @UseInterceptors(CampaignSummaryCacheInterceptor)
  async getLeadsByClassification(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('days') days?: string,
    @Query('campaign') campaign?: string,
    @Query('source') source?: string,
    @Query('content') content?: string,
    @Query('classification') classification?: string,
    @Query('origin') origin?: string,
    @Query('scheduler') scheduler?: string,
  ) {
    const daysNumber = days ? parseInt(days, 10) : undefined;
    return this.dashboardService.getLeadsByClassification(startDate, endDate, daysNumber, { campaign, source, content, classification, origin, scheduler });
  }

  @Get('summary-by-campaign')
  // @UseInterceptors(CampaignSummaryCacheInterceptor)
  async getSummaryByCampaign(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('days') days?: string,
    @Query('campaign') campaign?: string,
    @Query('source') source?: string,
    @Query('content') content?: string,
    @Query('classification') classification?: string,
    @Query('origin') origin?: string,
    @Query('scheduler') scheduler?: string,
  ) {
    const daysNumber = days ? parseInt(days, 10) : undefined;
    return this.dashboardService.getSummaryByCampaign(startDate, endDate, daysNumber, { campaign, source, content, classification, origin, scheduler });
  }

  @Get('summary-by-source')
  // @UseInterceptors(CampaignSummaryCacheInterceptor)
  async getSummaryBySource(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('days') days?: string,
    @Query('campaign') campaign?: string,
    @Query('source') source?: string,
    @Query('content') content?: string,
    @Query('classification') classification?: string,
    @Query('origin') origin?: string,
    @Query('scheduler') scheduler?: string,
  ) {
    const daysNumber = days ? parseInt(days, 10) : undefined;
    return this.dashboardService.getSummaryBySource(startDate, endDate, daysNumber, { campaign, source, content, classification, origin, scheduler });
  }

  @Get('summary-by-content')
  // @UseInterceptors(CampaignSummaryCacheInterceptor)
  async getSummaryByContent(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('days') days?: string,
    @Query('campaign') campaign?: string,
    @Query('source') source?: string,
    @Query('content') content?: string,
    @Query('classification') classification?: string,
    @Query('origin') origin?: string,
    @Query('scheduler') scheduler?: string,
  ) {
    const daysNumber = days ? parseInt(days, 10) : undefined;
    return this.dashboardService.getSummaryByContent(startDate, endDate, daysNumber, { campaign, source, content, classification, origin, scheduler });
  }
}
