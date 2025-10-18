import { Injectable } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class SupabaseService {
  private client: SupabaseClient | null = null;
  constructor() {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_ANON_KEY;
    if (url && key) {
      this.client = createClient(url, key);
    }
  }

  /**
   * Retorna o cliente Supabase para uso direto
   */
  getClient(): SupabaseClient | null {
    return this.client;
  }







  // Calcula tempo médio na etapa atual para cada status
  async getAverageTimeInStage(): Promise<Array<{ status_name: string; avg_duration: string }>> {
    if (!this.client) return [];
    try {
      const { data, error } = await this.client
        .rpc('calculate_avg_time_in_stage');
      
      if (error) {
        console.error('Supabase getAverageTimeInStage error:', error.message);
        return [];
      }
      
      return data || [];
    } catch (e: any) {
      console.error('Supabase getAverageTimeInStage error:', e?.message ?? String(e));
      return [];
    }
  }

  /**
   * Upsert em massa de dados de duração de etapas
   * Implementação do Passo 3 do guia - Upsert em massa no Supabase
   */
  async upsertLeadStageDurations(rows: Array<{ 
    lead_id: number; 
    stage_name: string; 
    entered_at: string; 
    duration_seconds: number; 
  }>): Promise<{ inserted: number; error?: any }> {
    if (!this.client) {
      console.error('❌ Supabase client not initialized');
      return { inserted: 0, error: 'Client not initialized' };
    }
    
    if (rows.length === 0) {
      console.log('⚠️ No rows to insert');
      return { inserted: 0 };
    }
    
    console.log(`💾 Iniciando upsert em massa de ${rows.length} registros...`);
    console.log('📋 Amostra do primeiro registro:', JSON.stringify(rows[0], null, 2));
    
    try {
      // Processar em chunks para evitar timeouts
      const chunkSize = 100;
      let totalInserted = 0;
      
      for (let i = 0; i < rows.length; i += chunkSize) {
        const chunk = rows.slice(i, i + chunkSize);
        const chunkNumber = Math.floor(i / chunkSize) + 1;
        const totalChunks = Math.ceil(rows.length / chunkSize);
        
        console.log(`🔄 Processando chunk ${chunkNumber}/${totalChunks} (${chunk.length} registros)...`);
        
        const { data, error } = await this.client
          .from('lead_stage_durations')
          .upsert(chunk, {
            onConflict: 'lead_id,stage_name,entered_at',
            ignoreDuplicates: false
          })
          .select();
        
        if (error) {
          console.error(`❌ Erro no chunk ${chunkNumber}:`, error);
          return { inserted: totalInserted, error };
        }
        
        const insertedCount = data?.length || chunk.length;
        totalInserted += insertedCount;
        
        console.log(`✅ Chunk ${chunkNumber} processado: ${insertedCount} registros`);
        
        // Pequeno delay entre chunks para não sobrecarregar
        if (i + chunkSize < rows.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
      
      console.log(`🎉 Upsert em massa concluído: ${totalInserted} registros processados com sucesso!`);
      return { inserted: totalInserted };
      
    } catch (e: any) {
      console.error('💥 Erro fatal no upsert em massa:', e?.message ?? String(e));
      return { inserted: 0, error: e };
    }
  }

  /**
   * Calcula tempo médio por etapa usando dados históricos da tabela lead_stage_durations
   * Usa SQL para calcular diferenças entre timestamps de entrada e saída
   */
  async getAverageTimeInStageFromHistory(): Promise<Array<{ stage_name: string; avg_duration_seconds: number }>> {
    if (!this.client) return [];
    
    try {
      // Verificar se a tabela existe
      const { data: tableCheck, error: tableError } = await this.client
        .from('lead_stage_durations')
        .select('stage_name')
        .limit(1);
      
      if (tableError) {
        console.log('Table does not exist, returning empty array');
        return [];
      }
      
      // Query SQL que calcula a média das diferenças entre timestamps
      const { data, error } = await this.client.rpc('calculate_avg_stage_durations');
      
      if (error) {
        console.error('Supabase getAverageTimeInStageFromHistory error:', error.message);
        return [];
      }
      
      if (!data || data.length === 0) {
        console.log('No historical data found, returning empty array');
        return [];
      }
      
      return data;
      
    } catch (e: any) {
      console.error('Supabase getAverageTimeInStageFromHistory error:', e?.message ?? String(e));
      return [];
    }
  }



  /**
   * Calcula tempo médio por etapa usando timestamps da nova arquitetura
   * Usa SQL para calcular diferenças entre colunas de timestamp
   */
  async getAverageTimeInStageFromTimestamps(): Promise<Array<{ stage_name: string; avg_duration_seconds: number }>> {
    if (!this.client) return [];
    
    try {
      // Query SQL que calcula a média das diferenças entre timestamps
      const { data, error } = await this.client.rpc('calculate_stage_durations_from_timestamps');
      
      if (error) {
        console.error('Supabase getAverageTimeInStageFromTimestamps error:', error.message);
        return [];
      }
      
      if (!data || data.length === 0) {
        console.log('No timestamp data found, returning empty array');
        return [];
      }
      
      return data;
      
    } catch (e: any) {
      console.error('Supabase getAverageTimeInStageFromTimestamps error:', e?.message ?? String(e));
      return [];
    }
  }

  /**
   * Calcula tempo médio por etapa incluindo durações em andamento
   * Implementação expandida para todas as etapas do funil
   */
  async getAverageTimeInStageWithOngoing(): Promise<Array<{ stage_name: string; avg_duration_seconds: number }>> {
    if (!this.client) return [];
    
    try {
      // Buscar todos os dados necessários
      const { data, error } = await this.client
        .from('kommo_leads_snapshot')
        .select('ts_novos_leads, ts_tentado_conexao, ts_conectado_qualificacao, ts_noshow, ts_reuniao, ts_oportunidade, ts_negociacao, ts_venda_realizada');
      
      if (error) {
        console.error('Erro ao buscar dados para cálculo de duração:', error.message);
        return [];
      }

      if (!data || data.length === 0) {
        console.log('No timestamp data found for ongoing calculations, returning empty array');
        return [];
      }

      const results: Array<{ stage_name: string; avg_duration_seconds: number }> = [];

      // Definir as etapas e suas transições
      const stages = [
        { name: 'Novos Leads', current: 'ts_novos_leads', next: 'ts_tentado_conexao' },
        { name: 'Tentado Conexão', current: 'ts_tentado_conexao', next: 'ts_conectado_qualificacao' },
        { name: 'Conectado/Qualificação', current: 'ts_conectado_qualificacao', next: 'ts_oportunidade' },
        { name: 'Oportunidade', current: 'ts_oportunidade', next: 'ts_negociacao' },
        { name: 'Negociação', current: 'ts_negociacao', next: null }
      ];

      // Calcular duração para cada etapa
      for (const stage of stages) {
        const recordsInStage = data.filter(record => record[stage.current] !== null);
        
        if (recordsInStage.length === 0) {
          continue; // Pular etapas sem dados
        }

        const durations = recordsInStage.map(record => {
          const startTime = new Date(record[stage.current]);
          const endTime = stage.next && record[stage.next] 
            ? new Date(record[stage.next])
            : new Date(); // Usar NOW() se ainda não passou para próxima etapa ou é a última etapa
          
          return (endTime.getTime() - startTime.getTime()) / 1000; // Duração em segundos
        });

        const avgDuration = durations.reduce((sum, duration) => sum + duration, 0) / durations.length;

        results.push({
          stage_name: stage.name,
          avg_duration_seconds: Math.round(avgDuration)
        });
      }

      return results;
      
    } catch (e: any) {
      console.error('Supabase getAverageTimeInStageWithOngoing error:', e?.message ?? String(e));
      return [];
    }
  }

  /**
   * Calcula a taxa de agendamento (scheduling rate)
   * Retorna a proporção de leads únicos que chegaram na etapa de agendamento
   */
  async getSchedulingRate(): Promise<Array<{ scheduling_rate: number | null }>> {
    if (!this.client) return [];
    
    try {
      // Buscar total de leads únicos na tabela px_leads
      const { count: totalLeads, error: totalError } = await this.client
        .from('px_leads')
        .select('id', { count: 'exact', head: true });
      
      if (totalError) {
        console.error('Supabase getSchedulingRate totalLeads error:', totalError.message);
        return [{ scheduling_rate: null }];
      }
      
      // Buscar leads que têm agendamento na tabela lead_stage_history
      const { count: scheduledLeads, error: scheduledError } = await this.client
        .from('lead_stage_history')
        .select('lead_id', { count: 'exact', head: true })
        .eq('stage_name', 'Agendado');
      
      if (scheduledError) {
        console.error('Supabase getSchedulingRate scheduledLeads error:', scheduledError.message);
        return [{ scheduling_rate: null }];
      }
      
      // Calcular a taxa de agendamento
      const schedulingRate = totalLeads && totalLeads > 0 
        ? (scheduledLeads || 0) / totalLeads 
        : null;
      
      return [{ scheduling_rate: schedulingRate }];
      
    } catch (e: any) {
      console.error('Supabase getSchedulingRate error:', e?.message ?? String(e));
      return [];
    }
  }

  // Métodos para testes - evitar acesso direto ao client privado
  async insertTestRecord(tableName: string, record: any): Promise<{ data: any; error: any }> {
    if (!this.client) return { data: null, error: { message: 'Supabase client not initialized' } };
    
    try {
      const { data, error } = await this.client
        .from(tableName)
        .insert([record])
        .select();
      
      return { data, error };
    } catch (e: any) {
      return { data: null, error: { message: e?.message ?? String(e) } };
    }
  }

  async deleteTestRecord(tableName: string, column: string, value: any): Promise<{ error: any }> {
    if (!this.client) return { error: { message: 'Supabase client not initialized' } };
    
    try {
      const { error } = await this.client
        .from(tableName)
        .delete()
        .eq(column, value);
      
      return { error };
    } catch (e: any) {
      return { error: { message: e?.message ?? String(e) } };
    }
  }

  async deleteTestRecords(tableName: string, column: string, values: any[]): Promise<{ error: any }> {
    if (!this.client) return { error: { message: 'Supabase client not initialized' } };
    
    try {
      const { error } = await this.client
        .from(tableName)
        .delete()
        .in(column, values);
      
      return { error };
    } catch (e: any) {
      return { error: { message: e?.message ?? String(e) } };
    }
  }

  async selectFromTable(tableName: string, limit?: number): Promise<{ data: any; error: any }> {
    if (!this.client) return { data: null, error: { message: 'Supabase client not initialized' } };
    
    try {
      let query = this.client.from(tableName).select('*');
      
      if (limit) {
        query = query.limit(limit);
      }
      
      const { data, error } = await query;
      
      return { data, error };
    } catch (e: any) {
      return { data: null, error: { message: e?.message ?? String(e) } };
    }
  }

  async testColumnExists(tableName: string, column: string, testValue: any): Promise<boolean> {
    if (!this.client) return false;
    
    try {
      const testData: any = { lead_id: 999999 };
      
      // Adicionar a coluna específica para teste
      if (column.startsWith('ts_') || column.includes('_at')) {
        testData[column] = new Date().toISOString();
      } else if (column === 'pipeline_id') {
        testData[column] = 123456;
      } else if (column.includes('status') || column === 'origin') {
        testData[column] = 'teste';
      } else {
        testData[column] = testValue || 'teste';
      }
      
      // Tentar inserir
      const { error: insertError } = await this.client
        .from(tableName)
        .insert(testData);
      
      if (!insertError) {
        // Se inseriu com sucesso, deletar o registro de teste
        await this.client
          .from(tableName)
          .delete()
          .eq('lead_id', testData.lead_id);
        
        return true;
      }
      
      return false;
    } catch (e: any) {
      return false;
    }
  }

  /**
   * Faz uma consulta vazia para verificar o schema de uma tabela
   */
  async getTableSchema(tableName: string): Promise<{ data: any; error: any }> {
    if (!this.client) {
      return { data: null, error: { message: 'Supabase client not initialized' } };
    }
    return await this.client
      .from(tableName)
      .select('*')
      .limit(0);
  }

  /**
   * Executa uma consulta SQL personalizada
   */
  async executeRawQuery(query: string): Promise<{ data: any; error: any }> {
    if (!this.client) {
      return { data: null, error: { message: 'Supabase client not initialized' } };
    }
    return await this.client.rpc('execute_sql', { query });
  }

}