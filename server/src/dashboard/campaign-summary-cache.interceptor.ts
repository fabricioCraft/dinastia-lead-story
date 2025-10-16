import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Inject } from '@nestjs/common';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

@Injectable()
export class CampaignSummaryCacheInterceptor implements NestInterceptor {
  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();
    const { startDate, endDate } = request.query;

    // Gerar chave de cache baseada nos parâmetros de data
    const cacheKey = this.generateCacheKey(startDate, endDate);
    
    // Tentar buscar do cache
    const cachedResult = await this.cacheManager.get(cacheKey);
    if (cachedResult) {
      return of(cachedResult);
    }

    // Se não estiver no cache, executar a requisição
    return next.handle().pipe(
      tap(async (response) => {
        // Definir TTL baseado no período solicitado
        const ttl = this.calculateTTL(startDate, endDate);
        await this.cacheManager.set(cacheKey, response, ttl);
      })
    );
  }

  private generateCacheKey(startDate?: string, endDate?: string): string {
    // Normalizar datas para garantir consistência no cache
    const start = startDate ? new Date(startDate).toISOString().split('T')[0] : 'default';
    const end = endDate ? new Date(endDate).toISOString().split('T')[0] : 'default';
    return `campaign_summary_${start}_${end}`;
  }

  private calculateTTL(startDate?: string, endDate?: string): number {
    const now = new Date();
    const end = endDate ? new Date(endDate) : now;
    
    // Se a data final é hoje ou no futuro, cache por menos tempo (30 minutos)
    if (end >= now) {
      return 30 * 60; // 30 minutos em segundos
    }
    
    // Se é dados históricos, cache por mais tempo (2 horas)
    return 2 * 60 * 60; // 2 horas em segundos
  }
}