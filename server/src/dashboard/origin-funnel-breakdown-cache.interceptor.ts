import { CacheInterceptor } from '@nestjs/cache-manager';
import { ExecutionContext, Injectable } from '@nestjs/common';

@Injectable()
export class OriginFunnelBreakdownCacheInterceptor extends CacheInterceptor {
  protected trackBy(context: ExecutionContext): string | undefined {
    const request = context.switchToHttp().getRequest();
    if (request.method !== 'GET') {
      return undefined;
    }
    const originName: string | undefined = request?.params?.originName;
    if (!originName) {
      // Fallback para chave padrão baseada em URL quando não há parâmetro
      return super.trackBy(context);
    }
    return `funnel_breakdown_for_${originName}`;
  }
}