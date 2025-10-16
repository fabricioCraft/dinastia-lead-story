import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import axios, { AxiosInstance } from 'axios';
import { SupabaseService } from './supabase.service';

export interface KommoLead {
  id: number;
  name: string;
  status_id: number;
  pipeline_id: number;
  created_at: number;
  updated_at: number;
  custom_fields_values?: any[];
}

export interface KommoPipeline {
  id: number;
  name: string;
  statuses: KommoStatus[];
}

export interface KommoStatus {
  id: number;
  name: string;
  sort: number;
  is_editable: boolean;
  pipeline_id: number;
  color: string;
}

export interface LeadStageHistory {
  lead_id: number;
  stage_name: string;
  entered_at: Date;
  exited_at?: Date;
  duration_hours?: number;
}

@Injectable()
export class KommoService {
  private readonly logger = new Logger(KommoService.name);
  private readonly supabase: SupabaseClient;
  private readonly apiClient: AxiosInstance;
  private readonly pipelineId: number;

  constructor(
    private configService: ConfigService,
    private supabaseService: SupabaseService
  ) {
    // Configuração do Supabase
    const supabaseUrl = this.configService.get<string>('SUPABASE_URL');
    const supabaseKey = this.configService.get<string>('SUPABASE_ANON_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase configuration is missing');
    }

    this.supabase = createClient(supabaseUrl, supabaseKey);
    
    // Configurações do Kommo
    const subdomain = this.configService.get<string>('KOMMO_SUBDOMAIN');
    const accessToken = this.configService.get<string>('KOMMO_ACCESS_TOKEN');
    this.pipelineId = parseInt(this.configService.get<string>('KOMMO_PIPELINE_ID') || '0');

    if (!subdomain || !accessToken || !this.pipelineId) {
      throw new Error('Kommo configuration is incomplete. Check KOMMO_SUBDOMAIN, KOMMO_ACCESS_TOKEN, and KOMMO_PIPELINE_ID');
    }

    // Criar cliente Axios simples com Bearer Token
    this.apiClient = axios.create({
      baseURL: `https://${subdomain}.kommo.com/api/v4`,
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });

    this.logger.log('KommoService initialized with direct Bearer Token authentication');
  }

  /**
   * Testa a conexão com a API do Kommo buscando alguns leads
   */
  async testFetchLeads() {
    try {
      this.logger.log('Testing Kommo API connection...');
      
      const response = await this.apiClient.get('/leads', {
        params: {
          limit: 5,
          with: 'custom_fields',
          filter: {
            pipeline_id: this.pipelineId
          }
        }
      });

      const leads = response.data._embedded?.leads || [];
      
      this.logger.log(`Successfully fetched ${leads.length} leads from Kommo`);
      
      return {
        success: true,
        message: `Successfully connected to Kommo API. Found ${leads.length} leads.`,
        data: {
          leads: leads,
          pipeline_id: this.pipelineId,
          total_count: leads.length
        }
      };

    } catch (error) {
      this.logger.error('Error testing Kommo API connection:', error.response?.data || error.message);
      
      return {
        success: false,
        error: error.response?.data?.detail || error.message,
        status: error.response?.status,
        details: {
          pipeline_id: this.pipelineId,
          baseURL: this.apiClient.defaults.baseURL
        }
      };
    }
  }

  /**
   * Busca leads do Kommo com parâmetros personalizados
   */
  async getLeads(params: {
    limit?: number;
    page?: number;
    filter?: Record<string, any>;
    with?: string[];
  } = {}): Promise<KommoLead[]> {
    try {
      const queryParams = {
        limit: params.limit || 250,
        page: params.page || 1,
        ...params.filter,
      };

      if (params.with && params.with.length > 0) {
        queryParams['with'] = params.with.join(',');
      }

      const response = await this.apiClient.get('/leads', { params: queryParams });
      return response.data._embedded?.leads || [];
    } catch (error) {
      this.logger.error('Error fetching leads from Kommo:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Busca eventos de um lead específico
   */
  async getLeadEvents(leadId: number): Promise<any[]> {
    try {
      // Primeiro tenta o endpoint de events
      const response = await this.apiClient.get(`/leads/${leadId}/events`);
      const events = response.data._embedded?.events || [];
      
      if (events.length > 0) {
        return events;
      }
      
      // Se não há eventos, tenta buscar notes que podem conter histórico
      const notesResponse = await this.apiClient.get(`/leads/${leadId}/notes`);
      const notes = notesResponse.data._embedded?.notes || [];
      
      // Filtra notes que podem indicar mudanças de status
      const statusChangeNotes = notes.filter(note => 
        note.note_type === 'service_message' || 
        (note.params && note.params.text && note.params.text.includes('status'))
      );
      
      return statusChangeNotes;
      
    } catch (error) {
      this.logger.error(`Error fetching events for lead ${leadId}:`, error.response?.data || error.message);
      return [];
    }
  }

  /**
   * Busca pipelines do Kommo
   */
  async getPipelines(): Promise<KommoPipeline[]> {
    try {
      const response = await this.apiClient.get('/leads/pipelines');
      return response.data._embedded?.pipelines || [];
    } catch (error) {
      this.logger.error('Error fetching pipelines from Kommo:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * PARTE 1: Busca o mapa de status de um pipeline específico
   * Retorna um Map para consulta rápida: status_id -> status_name
   */
  async getPipelineStatusMap(pipelineId?: number): Promise<Map<number, string>> {
    try {
      const targetPipelineId = pipelineId || this.pipelineId;
      this.logger.log(`🔍 Buscando mapa de status para pipeline ${targetPipelineId}...`);
      
      // Chamada GET à API de Pipelines do Kommo
      const response = await this.apiClient.get(`/leads/pipelines/${targetPipelineId}`);
      
      // Verificar se a resposta contém os status
      if (!response.data || !response.data._embedded || !response.data._embedded.statuses) {
        this.logger.warn(`⚠️ Pipeline ${targetPipelineId} não contém status na resposta`);
        return new Map<number, string>();
      }
      
      // Transformar array de status em Map para consulta rápida
      const statusMap = new Map<number, string>();
      const statuses = response.data._embedded.statuses;
      
      statuses.forEach((status: any) => {
        statusMap.set(status.id, status.name);
        this.logger.debug(`📋 Status mapeado: ${status.id} -> "${status.name}"`);
      });
      
      this.logger.log(`✅ Mapa de status criado com ${statusMap.size} status para pipeline ${targetPipelineId}`);
      return statusMap;
      
    } catch (error) {
      this.logger.error(`💥 Erro ao buscar mapa de status do pipeline:`, error.response?.data || error.message);
      
      // Em caso de erro, retorna Map vazio para não quebrar o fluxo
      this.logger.warn(`⚠️ Retornando mapa vazio devido ao erro`);
      return new Map<number, string>();
    }
  }

  /**
   * Busca TODOS os IDs de leads do pipeline com paginação completa
   * Implementação do Passo 1 do guia
   */
  async getAllLeadIdsFromPipeline(): Promise<number[]> {
    try {
      this.logger.log(`Fetching ALL lead IDs from pipeline ${this.pipelineId} with pagination...`);
      
      const allLeadIds: number[] = [];
      let nextUrl: string | null = null;
      let page = 1;
      
      do {
        this.logger.log(`Fetching page ${page} of leads...`);
        
        const params = {
          limit: 250, // Máximo permitido pela API
          filter: { pipeline_id: this.pipelineId },
          with: 'contacts'
        };
        
        const response = await this.apiClient.get('/leads', { params });
        const leads = response.data._embedded?.leads || [];
        
        // Adicionar IDs dos leads ao array
        leads.forEach(lead => {
          allLeadIds.push(lead.id);
        });
        
        this.logger.log(`Page ${page}: found ${leads.length} leads (total so far: ${allLeadIds.length})`);
        
        // Verificar se há próxima página
        nextUrl = response.data._links?.next?.href || null;
        page++;
        
        // Pequeno delay para não sobrecarregar a API
        if (nextUrl) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        
      } while (nextUrl);
      
      this.logger.log(`Successfully fetched ${allLeadIds.length} lead IDs from pipeline ${this.pipelineId}`);
      return allLeadIds;
      
    } catch (error) {
      this.logger.error('Error fetching all lead IDs from pipeline:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Busca TODOS os eventos de um lead com paginação completa
   * Implementação do Passo 2 do guia
   */
  async getAllLeadEvents(leadId: number): Promise<any[]> {
    try {
      const allEvents: any[] = [];
      let nextUrl: string | null = null;
      let page = 1;
      
      do {
        const response = await this.apiClient.get(`/leads/${leadId}/events`, {
          params: { limit: 250, page }
        });
        
        const events = response.data._embedded?.events || [];
        allEvents.push(...events);
        
        // Verificar se há próxima página
        nextUrl = response.data._links?.next?.href || null;
        page++;
        
        // Pequeno delay para não sobrecarregar a API
        if (nextUrl) {
          await new Promise(resolve => setTimeout(resolve, 50));
        }
        
      } while (nextUrl);
      
      return allEvents;
      
    } catch (error) {
      this.logger.warn(`Error fetching events for lead ${leadId}:`, error.response?.data || error.message);
      return []; // Retornar array vazio em caso de erro
    }
  }

  /**
   * Mapeamento manual de status IDs para nomes (fallback quando API não retorna status)
   */
  private getStatusNameById(statusId: number): string {
    // Mapeamento manual baseado nos status conhecidos do sistema
    // Este mapeamento deve ser atualizado conforme necessário
    const statusIdToNameMap = new Map<number, string>([
      // Adicionar mapeamentos conforme descobrimos os IDs
      // Por enquanto, vamos usar uma lógica de descoberta automática
    ]);

    // Se temos o mapeamento, usar ele
    if (statusIdToNameMap.has(statusId)) {
      return statusIdToNameMap.get(statusId)!;
    }

    // Fallback: tentar inferir baseado em padrões ou usar um nome genérico
    // Por enquanto, vamos assumir que todos os leads estão em "Leads Novos" 
    // até descobrirmos os IDs corretos
    return 'Leads Novos';
  }

  /**
   * Busca leads do pipeline configurado (método específico para o sync worker)
   */
  async getLeadsFromPipeline(): Promise<any[]> {
    try {
      this.logger.log(`Fetching ALL leads from pipeline ${this.pipelineId} with pagination...`);
      
      // Tentar buscar os pipelines para obter os status (método preferido)
      let statusMap = new Map();
      try {
        const pipelinesResponse = await this.apiClient.get('/leads/pipelines');
        const pipelines = pipelinesResponse.data._embedded?.pipelines || [];
        const currentPipeline = pipelines.find(p => p.id === this.pipelineId);
        
        if (currentPipeline && currentPipeline.statuses && Array.isArray(currentPipeline.statuses)) {
          currentPipeline.statuses.forEach(status => {
            statusMap.set(status.id, status.name);
          });
          this.logger.log(`✅ Status obtidos via API: ${statusMap.size} status encontrados`);
        } else {
          this.logger.warn('⚠️ API não retornou status nos pipelines, usando mapeamento manual');
        }
      } catch (error) {
        this.logger.warn('⚠️ Erro ao buscar pipelines, usando mapeamento manual:', error.message);
      }
      
      // Implementar paginação para buscar TODOS os leads
      const allLeads: KommoLead[] = [];
      let page = 1;
      const limit = 250; // Máximo permitido pela API do Kommo
      let hasMorePages = true;

      while (hasMorePages) {
        this.logger.log(`📄 Buscando página ${page} (limite: ${limit})...`);
        
        const response = await this.apiClient.get('/leads', {
          params: {
            limit: limit,
            page: page,
            with: 'custom_fields',
            filter: {
              pipeline_id: this.pipelineId
            }
          }
        });

        const leads = response.data._embedded?.leads || [];
        allLeads.push(...leads);
        
        this.logger.log(`📄 Página ${page}: ${leads.length} leads encontrados`);
        
        // Log específico para verificar se o lead 10731492 está na página
        const leadIds = leads.map(lead => lead.id);
        if (leadIds.includes(10731492)) {
          this.logger.log(`🎯 LEAD 10731492 ENCONTRADO NA PÁGINA ${page}!`);
        }
        this.logger.log(`📋 IDs da página ${page}: ${leadIds.slice(0, 10).join(', ')}${leadIds.length > 10 ? '...' : ''}`);
        
        // Verificar se há mais páginas
        // A API do Kommo retorna menos leads que o limite quando chegamos ao fim
        if (leads.length < limit) {
          hasMorePages = false;
          this.logger.log(`✅ Última página alcançada (página ${page})`);
        } else {
          page++;
        }
        
        // Proteção contra loop infinito
        if (page > 100) {
          this.logger.warn('⚠️ Limite de 100 páginas atingido, interrompendo busca');
          break;
        }
      }
      
      // Transformar para o formato esperado pelo SupabaseService
      const transformedLeads = allLeads.map(lead => {
        let statusName = statusMap.get(lead.status_id);
        
        // Se não conseguimos o nome via API, usar mapeamento manual
        if (!statusName) {
          statusName = this.getStatusNameById(lead.status_id);
        }
        
        // Log específico para o lead 10731492
        if (lead.id === 10731492) {
          this.logger.log(`🔍 LEAD 10731492 ENCONTRADO NA SINCRONIZAÇÃO:`);
          this.logger.log(`   - Status ID: ${lead.status_id}`);
          this.logger.log(`   - Status Name: ${statusName}`);
          this.logger.log(`   - Pipeline ID: ${lead.pipeline_id}`);
          this.logger.log(`   - Updated At: ${new Date(lead.updated_at * 1000).toISOString()}`);
          this.logger.log(`   - Raw Updated At: ${lead.updated_at}`);
        }
        
        return {
          lead_id: lead.id,
          status_name: statusName,
          pipeline_id: lead.pipeline_id,
          updated_at: new Date(lead.updated_at * 1000).toISOString()
        };
      });

      this.logger.log(`✅ Successfully fetched ${transformedLeads.length} leads from pipeline ${this.pipelineId} (${page - 1} páginas processadas)`);
      
      return transformedLeads;

    } catch (error) {
      this.logger.error('Error fetching leads from pipeline:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Calcula durações dos leads por estágio
   */
  async calculateLeadStageDurations(): Promise<any> {
    try {
      this.logger.log('Starting lead stage duration calculation...');

      // Buscar leads do pipeline configurado
      const leads = await this.getLeads({
        filter: { pipeline_id: this.pipelineId },
        with: ['custom_fields']
      });

      this.logger.log(`Found ${leads.length} leads to process`);

      const stageHistories: LeadStageHistory[] = [];

      // Processar cada lead
      for (const lead of leads) {
        try {
          const events = await this.getLeadEvents(lead.id);
          
          // Processar eventos para extrair mudanças de estágio
          // Esta lógica pode ser expandida conforme necessário
          const stageChanges = events.filter(event => 
            event.type === 'lead_status_changed'
          );

          // Adicionar histórico de estágios
          for (const change of stageChanges) {
            stageHistories.push({
              lead_id: lead.id,
              stage_name: change.value_after?.name || 'Unknown',
              entered_at: new Date(change.created_at * 1000),
              // exited_at será calculado baseado no próximo evento
            });
          }

        } catch (error) {
          this.logger.warn(`Error processing lead ${lead.id}:`, error.message);
        }
      }

      this.logger.log(`Processed ${stageHistories.length} stage history records`);

      return {
        success: true,
        processed_leads: leads.length,
        stage_histories: stageHistories.length,
        data: stageHistories
      };

    } catch (error) {
      this.logger.error('Error calculating lead stage durations:', error);
      throw error;
    }
  }

  /**
   * Verifica estrutura da tabela (mantido para compatibilidade)
   */
  private async checkTableStructure(): Promise<any> {
    try {
      const { data, error } = await this.supabase
        .from('lead_stage_durations')
        .select('*')
        .limit(1);

      if (error) {
        return { exists: false, error: error.message };
      }

      return { exists: true, sample: data };
    } catch (error) {
      return { exists: false, error: error.message };
    }
  }

  /**
   * Busca um lead específico por ID da API do Kommo
   */
  async getLeadById(leadId: number): Promise<any | null> {
    try {
      this.logger.log(`Fetching lead ${leadId} from Kommo API...`);
      
      const response = await this.apiClient.get(`/leads/${leadId}`, {
        params: {
          with: 'custom_fields,contacts'
        }
      });

      const lead = response.data;
      
      if (!lead) {
        this.logger.warn(`Lead ${leadId} not found in Kommo`);
        return null;
      }

      // Buscar informações do status para enriquecer os dados
      let statusName = 'Unknown';
      try {
        const statusResponse = await this.apiClient.get(`/leads/pipelines/${lead.pipeline_id}/statuses`);
        const statuses = statusResponse.data._embedded?.statuses || [];
        const statusMap = new Map<number, string>(statuses.map(status => [status.id, status.name]));
        statusName = statusMap.get(lead.status_id) ?? 'Unknown';
      } catch (statusError) {
        this.logger.warn(`Could not fetch status name for lead ${leadId}, using fallback`);
        statusName = this.getStatusNameById(lead.status_id);
      }

      return {
        lead_id: lead.id,
        current_status_name: statusName,
        status_id: lead.status_id,
        pipeline_id: lead.pipeline_id,
        updated_at: new Date(lead.updated_at * 1000).toISOString(),
        created_at: new Date(lead.created_at * 1000).toISOString(),
        name: lead.name,
        price: lead.price,
        responsible_user_id: lead.responsible_user_id
      };
      
    } catch (error) {
      this.logger.error(`Error fetching lead ${leadId} from Kommo:`, error.response?.data || error.message);
      return null;
    }
  }

  /**
   * PARTE 2: Implementação da Carga Histórica (Backfill)
   * Processa todos os leads existentes e calcula durações históricas
   */
  async backfillHistoricalDurations(): Promise<{ success: boolean; processed: number; errors: string[] }> {
    this.logger.log('🚀 INICIANDO CARGA HISTÓRICA DE DURAÇÕES...');
    
    const startTime = Date.now();
    let processedLeads = 0;
    const errors: string[] = [];
    const allDurations: Array<{ lead_id: number; stage_name: string; duration_seconds: number }> = [];

    try {
      // PASSO 1: Buscar todos os IDs de leads do pipeline
      this.logger.log('📋 PASSO 1: Buscando todos os IDs de leads...');
      const leadIds = await this.getAllLeadIdsFromPipeline();
      this.logger.log(`✅ Encontrados ${leadIds.length} leads para processar`);

      // PASSO 2: Buscar mapa de status para conversão ID -> Nome
      this.logger.log('🗺️ PASSO 2: Buscando mapa de status...');
      const statusMap = await this.getPipelineStatusMap();
      this.logger.log(`✅ Mapa de status criado com ${statusMap.size} status`);

      // PASSO 3: Processar cada lead individualmente
      this.logger.log('🔄 PASSO 3: Processando histórico de cada lead...');
      
      for (let i = 0; i < leadIds.length; i++) {
        const leadId = leadIds[i];
        
        try {
          // Log de progresso a cada 50 leads
          if (i % 50 === 0) {
            this.logger.log(`📊 Progresso: ${i}/${leadIds.length} leads processados (${Math.round((i/leadIds.length)*100)}%)`);
          }

          // PASSO 3.1: Buscar eventos históricos do lead
          const events = await this.getAllLeadEvents(leadId);
          
          // PASSO 3.2: Filtrar apenas eventos de mudança de status
          const statusChangeEvents = events.filter(event => 
            event.type === 'lead_status_changed' || 
            event.entity_type === 'lead' && event.type === 'status_changed'
          );

          if (statusChangeEvents.length === 0) {
            // Se não há eventos de mudança, assumir que o lead está na etapa atual desde a criação
            const currentLead = await this.getLeadById(leadId);
            if (currentLead) {
              const createdAt = new Date(currentLead.created_at);
              const now = new Date();
              const durationSeconds = Math.floor((now.getTime() - createdAt.getTime()) / 1000);
              
              allDurations.push({
                lead_id: leadId,
                stage_name: currentLead.current_status_name,
                duration_seconds: durationSeconds
              });
            }
            continue;
          }

          // PASSO 3.3: Ordenar eventos por data
          statusChangeEvents.sort((a, b) => a.created_at - b.created_at);

          // PASSO 3.4: Calcular durações entre mudanças de status
          for (let j = 0; j < statusChangeEvents.length; j++) {
            const currentEvent = statusChangeEvents[j];
            const nextEvent = statusChangeEvents[j + 1];
            
            // Obter nome do status anterior
            const previousStatusId = currentEvent.value_before?.[0]?.lead_status?.id || 
                                   currentEvent.value_before?.status_id;
            const previousStatusName = statusMap.get(previousStatusId) || 'Status Desconhecido';
            
            // Calcular duração na etapa anterior
            let durationSeconds: number;
            
            if (nextEvent) {
              // Duração = próximo evento - evento atual
              durationSeconds = nextEvent.created_at - currentEvent.created_at;
            } else {
              // Última mudança: duração = agora - evento atual
              durationSeconds = Math.floor(Date.now() / 1000) - currentEvent.created_at;
            }

            // Adicionar duração calculada
            if (durationSeconds > 0 && previousStatusName !== 'Status Desconhecido') {
              allDurations.push({
                lead_id: leadId,
                stage_name: previousStatusName,
                duration_seconds: durationSeconds
              });
            }
          }

          // PASSO 3.5: Calcular duração na etapa atual
          const lastEvent = statusChangeEvents[statusChangeEvents.length - 1];
          const currentStatusId = lastEvent.value_after?.[0]?.lead_status?.id || 
                                lastEvent.value_after?.status_id;
          const currentStatusName = statusMap.get(currentStatusId) || 'Status Desconhecido';
          
          if (currentStatusName !== 'Status Desconhecido') {
            const currentDuration = Math.floor(Date.now() / 1000) - lastEvent.created_at;
            if (currentDuration > 0) {
              allDurations.push({
                lead_id: leadId,
                stage_name: currentStatusName,
                duration_seconds: currentDuration
              });
            }
          }

          processedLeads++;

        } catch (leadError) {
          const errorMsg = `Erro ao processar lead ${leadId}: ${leadError.message}`;
          this.logger.warn(errorMsg);
          errors.push(errorMsg);
        }

        // Pequeno delay para não sobrecarregar a API
        if (i % 10 === 0) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      // PASSO 4: Upsert em massa na tabela lead_stage_durations
      this.logger.log(`💾 PASSO 4: Salvando ${allDurations.length} registros de duração...`);
      
      if (allDurations.length > 0) {
        await this.upsertLeadStageDurations(allDurations);
      }

      const endTime = Date.now();
      const totalTimeMinutes = Math.round((endTime - startTime) / 60000);

      this.logger.log(`✅ CARGA HISTÓRICA CONCLUÍDA!`);
      this.logger.log(`📊 Estatísticas:`);
      this.logger.log(`   - Leads processados: ${processedLeads}/${leadIds.length}`);
      this.logger.log(`   - Durações calculadas: ${allDurations.length}`);
      this.logger.log(`   - Erros: ${errors.length}`);
      this.logger.log(`   - Tempo total: ${totalTimeMinutes} minutos`);

      return {
        success: true,
        processed: processedLeads,
        errors: errors
      };

    } catch (error) {
      this.logger.error('❌ ERRO CRÍTICO na carga histórica:', error);
      return {
        success: false,
        processed: processedLeads,
        errors: [...errors, error.message]
      };
    }
  }

  /**
   * Método auxiliar para fazer upsert em massa na tabela lead_stage_durations
   */
  private async upsertLeadStageDurations(durations: Array<{ lead_id: number; stage_name: string; duration_seconds: number }>): Promise<void> {
    try {
      const chunkSize = 500; // Processar em chunks para evitar timeouts
      
      for (let i = 0; i < durations.length; i += chunkSize) {
        const chunk = durations.slice(i, i + chunkSize);
        
        this.logger.log(`💾 Salvando chunk ${Math.floor(i/chunkSize) + 1}/${Math.ceil(durations.length/chunkSize)} (${chunk.length} registros)...`);
        
        const { error } = await this.supabase
          .from('lead_stage_durations')
          .upsert(chunk, { 
            onConflict: 'lead_id,stage_name',
            ignoreDuplicates: false 
          });

        if (error) {
          throw new Error(`Erro no upsert: ${error.message}`);
        }

        // Pequeno delay entre chunks
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      this.logger.log(`✅ Todos os ${durations.length} registros foram salvos com sucesso`);

    } catch (error) {
      this.logger.error('❌ Erro ao salvar durações no banco:', error);
      throw error;
    }
  }

  /**
   * Método público para acessar informações de pipelines
   */
  async getPipelinesInfo() {
    try {
      const pipelinesResponse = await this.apiClient.get('/leads/pipelines');
      const pipelines = pipelinesResponse.data._embedded?.pipelines || [];
      
      return {
        success: true,
        pipelineId: this.pipelineId,
        totalPipelines: pipelines.length,
        pipelines: pipelines.map(p => ({
          id: p.id,
          name: p.name,
          statusCount: p.statuses?.length || 0,
          statuses: p.statuses?.map(s => ({ id: s.id, name: s.name })) || []
        }))
      };
    } catch (error) {
      this.logger.error('Erro ao buscar informações de pipelines:', error);
      throw error;
    }
  }

  /**
   * Método público para obter o ID do pipeline configurado
   */
  getPipelineId(): number {
    return this.pipelineId;
  }
}