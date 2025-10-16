import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from './supabase.service';

export interface DashboardSnapshot {
  id?: number;
  snapshot_type: string;
  data: any;
  execution_time: Date;
  is_from_webhook: boolean;
  created_at?: Date;
  updated_at?: Date;
}

@Injectable()
export class DashboardPersistenceService {
  private readonly logger = new Logger(DashboardPersistenceService.name);

  constructor(private readonly supabaseService: SupabaseService) {}

  /**
   * Salva um snapshot dos dados do dashboard
   */
  async saveSnapshot(
    snapshotType: string,
    data: any,
    executionTime: Date,
    isFromWebhook: boolean = false
  ): Promise<{ success: boolean; error?: string }> {
    try {
      this.logger.log(`💾 Salvando snapshot do tipo '${snapshotType}' no banco de dados...`);

      const client = this.supabaseService.getClient();
      if (!client) {
        throw new Error('Cliente Supabase não inicializado');
      }

      const snapshot: Omit<DashboardSnapshot, 'id' | 'created_at' | 'updated_at'> = {
        snapshot_type: snapshotType,
        data,
        execution_time: executionTime,
        is_from_webhook: isFromWebhook
      };

      const { data: result, error } = await client
        .from('dashboard_data_snapshots')
        .upsert([snapshot], { 
          onConflict: 'snapshot_type,execution_time',
          ignoreDuplicates: false 
        })
        .select();

      if (error) {
        this.logger.error(`❌ Erro ao salvar snapshot '${snapshotType}':`, error.message);
        return { success: false, error: error.message };
      }

      this.logger.log(`✅ Snapshot '${snapshotType}' salvo com sucesso. ID: ${result?.[0]?.id}`);
      return { success: true };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`❌ Erro inesperado ao salvar snapshot '${snapshotType}':`, errorMessage);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Recupera o snapshot mais recente de um tipo específico
   */
  async getLatestSnapshot(snapshotType: string): Promise<DashboardSnapshot | null> {
    try {
      this.logger.log(`📖 Buscando snapshot mais recente do tipo '${snapshotType}'...`);

      const client = this.supabaseService.getClient();
      if (!client) {
        throw new Error('Cliente Supabase não inicializado');
      }

      const { data, error } = await client
        .from('dashboard_data_snapshots')
        .select('*')
        .eq('snapshot_type', snapshotType)
        .order('execution_time', { ascending: false })
        .limit(1);

      if (error) {
        this.logger.error(`❌ Erro ao buscar snapshot '${snapshotType}':`, error.message);
        return null;
      }

      if (!data || data.length === 0) {
        this.logger.log(`📭 Nenhum snapshot encontrado para o tipo '${snapshotType}'`);
        return null;
      }

      const snapshot = data[0] as DashboardSnapshot;
      this.logger.log(`📊 Snapshot '${snapshotType}' encontrado. Execução: ${snapshot.execution_time}`);
      return snapshot;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`❌ Erro inesperado ao buscar snapshot '${snapshotType}':`, errorMessage);
      return null;
    }
  }

  /**
   * Recupera todos os snapshots de um tipo específico dentro de um período (por dias)
   */
  async getSnapshotsByPeriod(
    snapshotType: string,
    days: number
  ): Promise<DashboardSnapshot[]>;
  
  /**
   * Recupera todos os snapshots de um tipo específico dentro de um período (por datas)
   */
  async getSnapshotsByPeriod(
    snapshotType: string,
    startDate: Date,
    endDate: Date
  ): Promise<DashboardSnapshot[]>;
  
  /**
   * Implementação do método getSnapshotsByPeriod
   */
  async getSnapshotsByPeriod(
    snapshotType: string,
    startDateOrDays: Date | number,
    endDate?: Date
  ): Promise<DashboardSnapshot[]> {
    let startDate: Date;
    let actualEndDate: Date;
    
    if (typeof startDateOrDays === 'number') {
      // Se é um número, representa dias atrás
      actualEndDate = new Date();
      startDate = new Date();
      startDate.setDate(startDate.getDate() - startDateOrDays);
    } else {
      // Se é uma data, usa as datas fornecidas
      startDate = startDateOrDays;
      actualEndDate = endDate || new Date();
    }
    try {
        this.logger.log(`📅 Buscando snapshots do tipo '${snapshotType}' entre ${startDate.toISOString()} e ${actualEndDate.toISOString()}...`);

        const client = this.supabaseService.getClient();
        if (!client) {
          throw new Error('Cliente Supabase não inicializado');
        }

        const { data, error } = await client
          .from('dashboard_data_snapshots')
          .select('*')
          .eq('snapshot_type', snapshotType)
          .gte('execution_time', startDate.toISOString())
          .lte('execution_time', actualEndDate.toISOString())
          .order('execution_time', { ascending: false });

      if (error) {
        this.logger.error(`❌ Erro ao buscar snapshots '${snapshotType}' por período:`, error.message);
        return [];
      }

      this.logger.log(`📊 Encontrados ${data?.length || 0} snapshots do tipo '${snapshotType}' no período`);
      return (data || []) as DashboardSnapshot[];

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`❌ Erro inesperado ao buscar snapshots por período:`, errorMessage);
      return [];
    }
  }

  /**
   * Remove snapshots antigos (mais de 30 dias)
   */
  async cleanupOldSnapshots(): Promise<{ success: boolean; deletedCount: number; error?: string }> {
    try {
      this.logger.log('🧹 Iniciando limpeza de snapshots antigos...');

      const client = this.supabaseService.getClient();
      if (!client) {
        throw new Error('Cliente Supabase não inicializado');
      }

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data, error } = await client
        .from('dashboard_data_snapshots')
        .delete()
        .lt('execution_time', thirtyDaysAgo.toISOString())
        .select();

      if (error) {
        this.logger.error('❌ Erro ao limpar snapshots antigos:', error.message);
        return { success: false, deletedCount: 0, error: error.message };
      }

      const deletedCount = data?.length || 0;
      this.logger.log(`✅ Limpeza concluída. ${deletedCount} snapshots antigos removidos.`);
      return { success: true, deletedCount };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error('❌ Erro inesperado durante limpeza:', errorMessage);
      return { success: false, deletedCount: 0, error: errorMessage };
    }
  }

  /**
   * Verifica se a tabela de snapshots existe e está acessível
   */
  async checkTableHealth(): Promise<{ healthy: boolean; error?: string }> {
    try {
      const client = this.supabaseService.getClient();
      if (!client) {
        return { healthy: false, error: 'Cliente Supabase não inicializado' };
      }

      // Temporariamente usando kommo_leads_snapshot como teste de conectividade
      // TODO: Criar dashboard_data_snapshots quando tivermos chave de serviço
      const { data, error } = await client
        .from('kommo_leads_snapshot')
        .select('lead_id')
        .limit(1);

      if (error) {
        return { healthy: false, error: `Conectividade Supabase: ${error.message}` };
      }

      return { healthy: true };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return { healthy: false, error: errorMessage };
    }
  }
}