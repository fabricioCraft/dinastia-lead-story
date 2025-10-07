import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../services/supabase.service';

export interface EnrichedLead {
  id: string;
  name: string;
  status: string;
  origin: string | null;
}

export interface StageSummaryItem {
  stage: string;
  count: number;
}

export interface TimeInStageItem {
  stage: string;
  averageTimeInDays: number;
}

export interface OriginSummaryItem {
  origin: string;
  count: number;
}

@Injectable()
export class FunnelService {
  constructor(private supabase: SupabaseService) {}

  /**
   * Retorna resumo dos leads por estágio do funil
   * Utiliza dados da tabela kommo_leads_snapshot
   */
  async getStagesSummary(days?: number): Promise<StageSummaryItem[]> {
    const rows = await this.supabase.aggregateKommoLeadsByStatus(days);
    if (!rows || rows.length === 0) return [];
    
    const summary: StageSummaryItem[] = rows.map((r) => ({ 
      stage: r.status ?? '', 
      count: Number(r.count ?? 0) 
    }));
    
    // Ordenação alfabética para estabilidade
    summary.sort((a, b) => a.stage.localeCompare(b.stage));
    return summary;
  }

  /**
   * Retorna resumo dos leads por origem
   * Utiliza dados da tabela kommo_leads_snapshot
   */
  async getOriginSummary(days?: number): Promise<OriginSummaryItem[]> {
    const rows = await this.supabase.aggregateKommoLeadsByOrigin(days);
    if (!rows || rows.length === 0) return [];
    
    const summary: OriginSummaryItem[] = rows.map((r) => ({ 
      origin: r.origin ?? 'Sem origem', 
      count: Number(r.count ?? 0) 
    }));
    
    // Ordenação alfabética para estabilidade
    summary.sort((a, b) => a.origin.localeCompare(b.origin));
    return summary;
  }

  /**
   * Retorna tempo médio em cada estágio do funil
   * Calcula baseado nos dados históricos da tabela lead_stage_durations
   */
  async getTimeInStage(days?: number): Promise<TimeInStageItem[]> {
    const rows = await this.supabase.getAverageTimeInStageFromDurations();
    if (!rows || rows.length === 0) return [];
    
    const timeInStage: TimeInStageItem[] = rows.map((r) => ({
      stage: r.stage_name ?? '',
      averageTimeInDays: Number(r.avg_duration_seconds ?? 0) / (24 * 60 * 60) // Converter segundos para dias
    }));
    
    // Ordenação alfabética para estabilidade
    timeInStage.sort((a, b) => a.stage.localeCompare(b.stage));
    return timeInStage;
  }

  /**
   * Método legado mantido para compatibilidade
   * @deprecated Use getStagesSummary() instead
   */
  async getSummary(days?: number): Promise<EnrichedLead[]> {
    // Retorna array vazio por enquanto, será implementado quando necessário
    return [];
  }
}