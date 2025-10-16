import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from './supabase.service';

export interface LeadStageHistoryEntry {
  id?: number;
  lead_id: number;
  stage_name: string;
  entered_at: Date;
  exited_at?: Date;
  duration_seconds?: number;
  pipeline_id?: number;
}

export interface StageAverageTime {
  stage_name: string;
  avg_duration_seconds: number;
  total_leads: number;
}

@Injectable()
export class LeadStageHistoryService {
  private readonly logger = new Logger(LeadStageHistoryService.name);

  constructor(private readonly supabaseService: SupabaseService) {}

  /**
   * Adiciona uma nova entrada no histórico de etapas
   */
  async addStageEntry(entry: LeadStageHistoryEntry): Promise<boolean> {
    try {
      const client = this.supabaseService.getClient();
      if (!client) {
        this.logger.error('Cliente Supabase não inicializado');
        return false;
      }

      const { data, error } = await client
        .from('lead_stage_history')
        .insert([{
          lead_id: entry.lead_id,
          stage_name: entry.stage_name,
          entered_at: entry.entered_at.toISOString(),
          exited_at: entry.exited_at?.toISOString() || null,
          pipeline_id: entry.pipeline_id
        }])
        .select();

      if (error) {
        this.logger.error(`Erro ao adicionar entrada no histórico para lead ${entry.lead_id}:`, error.message);
        return false;
      }

      this.logger.debug(`✅ Entrada adicionada no histórico: Lead ${entry.lead_id} → ${entry.stage_name}`);
      return true;

    } catch (error) {
      this.logger.error(`Erro ao adicionar entrada no histórico:`, error);
      return false;
    }
  }

  /**
   * Finaliza a etapa anterior (define exited_at) quando um lead muda de etapa
   */
  async finalizePreviousStage(leadId: number, exitedAt: Date): Promise<boolean> {
    try {
      const client = this.supabaseService.getClient();
      if (!client) {
        this.logger.error('Cliente Supabase não inicializado');
        return false;
      }

      // Buscar a última entrada sem exited_at para este lead
      const { data: currentStage, error: selectError } = await client
        .from('lead_stage_history')
        .select('*')
        .eq('lead_id', leadId)
        .is('exited_at', null)
        .order('entered_at', { ascending: false })
        .limit(1);

      if (selectError) {
        this.logger.error(`Erro ao buscar etapa atual do lead ${leadId}:`, selectError.message);
        return false;
      }

      if (!currentStage || currentStage.length === 0) {
        this.logger.debug(`Nenhuma etapa ativa encontrada para o lead ${leadId}`);
        return true; // Não é erro, apenas não há etapa para finalizar
      }

      // Atualizar a entrada com exited_at
      const { error: updateError } = await client
        .from('lead_stage_history')
        .update({ exited_at: exitedAt.toISOString() })
        .eq('id', currentStage[0].id);

      if (updateError) {
        this.logger.error(`Erro ao finalizar etapa do lead ${leadId}:`, updateError.message);
        return false;
      }

      this.logger.debug(`✅ Etapa finalizada: Lead ${leadId} saiu de "${currentStage[0].stage_name}"`);
      return true;

    } catch (error) {
      this.logger.error(`Erro ao finalizar etapa anterior:`, error);
      return false;
    }
  }

  /**
   * Registra uma mudança de etapa completa (finaliza anterior e adiciona nova)
   */
  async recordStageChange(
    leadId: number, 
    newStageName: string, 
    changedAt: Date, 
    pipelineId?: number
  ): Promise<boolean> {
    try {
      // 1. Finalizar etapa anterior
      await this.finalizePreviousStage(leadId, changedAt);

      // 2. Adicionar nova etapa
      const success = await this.addStageEntry({
        lead_id: leadId,
        stage_name: newStageName,
        entered_at: changedAt,
        pipeline_id: pipelineId
      });

      if (success) {
        this.logger.debug(`✅ Mudança de etapa registrada: Lead ${leadId} → ${newStageName}`);
      }

      return success;

    } catch (error) {
      this.logger.error(`Erro ao registrar mudança de etapa:`, error);
      return false;
    }
  }

  /**
   * Busca o histórico completo de um lead
   */
  async getLeadHistory(leadId: number): Promise<LeadStageHistoryEntry[]> {
    try {
      const client = this.supabaseService.getClient();
      if (!client) {
        this.logger.error('Cliente Supabase não inicializado');
        return [];
      }

      const { data, error } = await client
        .from('lead_stage_history')
        .select('*')
        .eq('lead_id', leadId)
        .order('entered_at', { ascending: true });

      if (error) {
        this.logger.error(`Erro ao buscar histórico do lead ${leadId}:`, error.message);
        return [];
      }

      return data.map(entry => ({
        id: entry.id,
        lead_id: entry.lead_id,
        stage_name: entry.stage_name,
        entered_at: new Date(entry.entered_at),
        exited_at: entry.exited_at ? new Date(entry.exited_at) : undefined,
        duration_seconds: entry.duration_seconds,
        pipeline_id: entry.pipeline_id
      }));

    } catch (error) {
      this.logger.error(`Erro ao buscar histórico do lead:`, error);
      return [];
    }
  }

  /**
   * Calcula tempo médio por etapa baseado no histórico
   */
  async getAverageTimePerStage(): Promise<StageAverageTime[]> {
    try {
      const client = this.supabaseService.getClient();
      if (!client) {
        this.logger.error('Cliente Supabase não inicializado');
        return [];
      }

      const { data, error } = await client
        .rpc('get_average_time_per_stage');

      if (error) {
        this.logger.error(`Erro ao calcular tempo médio por etapa:`, error.message);
        return [];
      }

      return data || [];

    } catch (error) {
      this.logger.error(`Erro ao calcular tempo médio por etapa:`, error);
      return [];
    }
  }

  /**
   * Verifica se um lead já tem histórico registrado
   */
  async hasHistory(leadId: number): Promise<boolean> {
    try {
      const client = this.supabaseService.getClient();
      if (!client) {
        this.logger.error('Cliente Supabase não inicializado');
        return false;
      }

      const { data, error } = await client
        .from('lead_stage_history')
        .select('id')
        .eq('lead_id', leadId)
        .limit(1);

      if (error) {
        this.logger.error(`Erro ao verificar histórico do lead ${leadId}:`, error.message);
        return false;
      }

      return data && data.length > 0;

    } catch (error) {
      this.logger.error(`Erro ao verificar histórico:`, error);
      return false;
    }
  }

  /**
   * Inicializa histórico para um lead existente baseado em seu estado atual
   * Usado para leads que já existiam antes da implementação do histórico
   */
  async initializeHistoryForExistingLead(
    leadId: number, 
    currentStage: string, 
    pipelineId?: number,
    estimatedEnteredAt?: Date
  ): Promise<boolean> {
    try {
      // Verificar se já tem histórico
      const hasExistingHistory = await this.hasHistory(leadId);
      if (hasExistingHistory) {
        this.logger.debug(`Lead ${leadId} já possui histórico, pulando inicialização`);
        return true;
      }

      // Usar data estimada ou data atual
      const enteredAt = estimatedEnteredAt || new Date();

      const success = await this.addStageEntry({
        lead_id: leadId,
        stage_name: currentStage,
        entered_at: enteredAt,
        pipeline_id: pipelineId
      });

      if (success) {
        this.logger.debug(`✅ Histórico inicializado para lead existente ${leadId} em "${currentStage}"`);
      }

      return success;

    } catch (error) {
      this.logger.error(`Erro ao inicializar histórico para lead existente:`, error);
      return false;
    }
  }

  /**
   * Busca leads que estão atualmente em uma etapa específica
   */
  async getLeadsInStage(stageName: string): Promise<number[]> {
    try {
      const client = this.supabaseService.getClient();
      if (!client) {
        this.logger.error('Cliente Supabase não inicializado');
        return [];
      }

      const { data, error } = await client
        .from('lead_stage_history')
        .select('lead_id')
        .eq('stage_name', stageName)
        .is('exited_at', null);

      if (error) {
        this.logger.error(`Erro ao buscar leads na etapa ${stageName}:`, error.message);
        return [];
      }

      return data.map(entry => entry.lead_id);

    } catch (error) {
      this.logger.error(`Erro ao buscar leads na etapa:`, error);
      return [];
    }
  }

  /**
   * Obtém estatísticas gerais do histórico de estágios
   */
  async getHistoryStats(): Promise<any> {
    try {
      const supabase = this.supabaseService.getClient();
      if (!supabase) {
        this.logger.error('Cliente Supabase não inicializado');
        return {
          totalEntries: 0,
          uniqueLeads: 0,
          uniqueStages: 0,
          activeLeads: 0,
          lastUpdated: new Date().toISOString(),
          error: 'Cliente Supabase não inicializado'
        };
      }

      // Total de entradas no histórico
      const { count: totalEntries } = await supabase
        .from('lead_stage_history')
        .select('*', { count: 'exact', head: true });

      // Leads únicos com histórico - usando query SQL
      const { data: uniqueLeadsData } = await supabase
        .rpc('get_unique_leads_count');

      // Estágios únicos - usando query SQL
      const { data: uniqueStagesData } = await supabase
        .rpc('get_unique_stages_count');

      // Leads atualmente ativos (sem exited_at)
      const { count: activeLeads } = await supabase
        .from('lead_stage_history')
        .select('*', { count: 'exact', head: true })
        .is('exited_at', null);

      return {
        totalEntries: totalEntries || 0,
        uniqueLeads: uniqueLeadsData?.[0]?.count || 0,
        uniqueStages: uniqueStagesData?.[0]?.count || 0,
        activeLeads: activeLeads || 0,
        lastUpdated: new Date().toISOString()
      };

    } catch (error) {
      this.logger.error('Erro ao obter estatísticas do histórico:', error);
      
      // Fallback simples se as funções SQL não existirem
      return {
        totalEntries: 0,
        uniqueLeads: 0,
        uniqueStages: 0,
        activeLeads: 0,
        lastUpdated: new Date().toISOString(),
        error: 'Tabela lead_stage_history não existe ou está vazia'
      };
    }
  }
}