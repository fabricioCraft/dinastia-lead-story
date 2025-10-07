import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../services/supabase.service';

@Injectable()
export class DashboardService {
  constructor(private readonly supabase: SupabaseService) {}

  async getOriginSummary(days?: number) {
    // Pré-agregação total no banco via SupabaseService
    const [totalLeads, leadsByOrigin, leadsByCampaign] = await Promise.all([
      this.supabase.getTotalKommoLeads(),
      this.supabase.aggregateLeadsByOrigin(),
      this.supabase.aggregateLeadsByCampaign(),
    ]);

    // Normaliza origem nula como "outros" e agrega origens com menos de 10 leads em "outros"
    const threshold = 10;
    const normalized = leadsByOrigin.map((x) => ({ origem: x.origem ?? 'outros', count: x.count }));

    let outrosCount = 0;
    const aggregated = normalized.reduce<{ origem: string; count: number }[]>((acc, item) => {
      const isOutrosLabel = (item.origem || '').toLowerCase() === 'outros';
      if (isOutrosLabel || item.count < threshold) {
        outrosCount += item.count;
        return acc;
      }
      acc.push(item);
      return acc;
    }, []);

    if (outrosCount > 0) {
      aggregated.push({ origem: 'outros', count: outrosCount });
    }

    return {
      kpis: { totalLeads },
      leadsByOrigin: aggregated,
      leadsByCampaign: [],
    };
  }

  /**
   * Novo método: breakdown do funil para uma origem específica
   * Utiliza dados da tabela kommo_leads_snapshot
   */
  async getFunnelBreakdownForOrigin(origin: string, days?: number): Promise<{ status: string; count: number }[]> {
    const ids = await this.supabase.findKommoIdsByOrigin(origin);
    if (!ids || ids.length === 0) {
      return [];
    }
    
    // Usar snapshot filtrado por data se days for especificado
    if (days && Number.isFinite(days) && days > 0) {
      const recentIds = await this.supabase.getRecentKommoLeadIds(days);
      const filteredIds = ids.filter(id => recentIds.includes(id));
      if (filteredIds.length === 0) return [];
      
      return await this.supabase.aggregateOriginsForKommoIds(filteredIds);
    }
    
    // Fallback para todos os leads da origem sem filtro de data
    return await this.supabase.aggregateOriginsForKommoIds(ids);
  }
}