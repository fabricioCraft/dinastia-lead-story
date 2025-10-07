import { Controller, Get, Param, Query, UseInterceptors } from '@nestjs/common';
import { CacheInterceptor } from '@nestjs/cache-manager';
import { CacheKey, CacheTTL } from '@nestjs/cache-manager';
import { DashboardService } from './dashboard.service';
import { OriginFunnelBreakdownCacheInterceptor } from './origin-funnel-breakdown-cache.interceptor';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('origin-summary')
  @UseInterceptors(CacheInterceptor)
  @CacheKey('origin_summary_data')
  @CacheTTL(300)
  getOriginSummary(@Query('days') days?: string) {
    const d = days ? Number(days) : undefined;
    return this.dashboardService.getOriginSummary(d);
  }

  @Get('origin/:originName/funnel-breakdown')
  @UseInterceptors(OriginFunnelBreakdownCacheInterceptor)
  @CacheTTL(60)
  getFunnelBreakdownForOrigin(@Param('originName') originName: string, @Query('days') days?: string) {
    const d = days ? Number(days) : undefined;
    return this.dashboardService.getFunnelBreakdownForOrigin(originName, d);
  }
}