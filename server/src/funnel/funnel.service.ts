import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../services/supabase.service';
import { LeadStageHistoryService } from '../services/lead-stage-history.service';

export interface StageSummaryItem {
  stage: string;
  count: number;
}

export interface TimeInStageItem {
  stage: string;
  averageTimeInDays: number;
  averageTimeInSeconds: number;
}

@Injectable()
export class FunnelService {
  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly leadStageHistoryService: LeadStageHistoryService
  ) {}

  /**
   * Retorna contagem de leads por etapa
   * Dados obtidos das tabelas principais do Supabase
   */
  async getStagesSummary(): Promise<StageSummaryItem[]> {
    try {
      // Usar dados da tabela lead_stage_history para obter estágios atuais
      const client = this.supabaseService.getClient();
      if (!client) {
        throw new Error('Cliente Supabase não inicializado');
      }
      const { data, error } = await client
        .from('lead_stage_history')
        .select('stage_name')
        .is('exited_at', null); // Apenas estágios atuais (não finalizados)

      if (error) {
        console.error('Erro ao buscar resumo de estágios:', error);
        throw new Error(`Erro na consulta: ${error.message}`);
      }

      // Agrupar por stage_name
      const stageCounts = new Map<string, number>();
      data?.forEach(record => {
        if (record.stage_name) {
          stageCounts.set(record.stage_name, (stageCounts.get(record.stage_name) || 0) + 1);
        }
      });

      return Array.from(stageCounts.entries()).map(([stage, count]) => ({
        stage,
        count
      }));
      
    } catch (error) {
      console.error('Error fetching stages summary:', error);
      throw error;
    }
  }

  /**
   * Retorna o tempo médio que leads passam em cada etapa
   * Nova arquitetura: usa histórico de estágios da tabela lead_stage_history
   * Inclui durações em andamento para leads que ainda estão em suas etapas atuais
   */
  async getTimeInStage(days?: number, fromDate?: Date, toDate?: Date, filters?: { campaign?: string; source?: string; content?: string; classification?: string; }): Promise<TimeInStageItem[]> {
    try {
      // Primeiro tenta usar o novo sistema de histórico
      const historyData = await this.leadStageHistoryService.getAverageTimePerStage();
      
      if (historyData && historyData.length > 0) {
        return historyData.map(item => ({
          stage: item.stage_name,
          averageTimeInDays: Math.round((item.avg_duration_seconds / 86400) * 10) / 10,
          averageTimeInSeconds: Math.round(item.avg_duration_seconds)
        }));
      }
      
      // Fallback para o sistema baseado em timestamps COM durações em andamento
      console.log('Nenhum dado de histórico encontrado, usando fallback para timestamps com durações em andamento');
      const timestampData = await this.supabaseService.getAverageTimeInStageWithOngoing(days, fromDate, toDate, filters);
      
      return timestampData.map(item => ({
        stage: item.stage_name,
        averageTimeInDays: Math.round((item.avg_duration_seconds / 86400) * 10) / 10,
        averageTimeInSeconds: Math.round(item.avg_duration_seconds)
      }));
      
    } catch (error) {
      console.error('Error fetching time in stage:', error);
      throw error;
    }
  }

  /**
   * Retorna a taxa de agendamento
   * Calcula a proporção de leads únicos que chegaram na etapa de agendamento
   */
  async getSchedulingRate(): Promise<{ schedulingRate: number }> {
    try {
      const data = await this.supabaseService.getSchedulingRate();
      
      // Extrair o valor da taxa de agendamento ou retornar 0 se não houver dados
      const schedulingRate = data.length > 0 && data[0].scheduling_rate !== null 
        ? data[0].scheduling_rate 
        : 0;
      
      return { schedulingRate };
      
    } catch (error) {
      console.error('Error fetching scheduling rate:', error);
      throw error;
    }
  }
}
