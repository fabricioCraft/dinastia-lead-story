import { Injectable } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';

export interface KommoLead {
  id: number;
  name: string;
  status_id: number;
  pipeline_id: number;
  responsible_user_id: number;
  created_at: number;
  updated_at: number;
  custom_fields_values?: Array<{
    field_id: number;
    field_name: string;
    field_code: string;
    field_type: string;
    values: Array<{
      value: string;
      enum_id?: number;
      enum_code?: string;
    }>;
  }>;
  _embedded?: {
    tags?: Array<{
      id: number;
      name: string;
    }>;
  };
}

export interface KommoPipeline {
  id: number;
  name: string;
  sort: number;
  is_main: boolean;
  is_unsorted_on: boolean;
  is_archive: boolean;
  account_id: number;
  _embedded?: {
    statuses?: Array<{
      id: number;
      name: string;
      sort: number;
      is_editable: boolean;
      pipeline_id: number;
      color: string;
      type: number;
      account_id: number;
    }>;
  };
}

export interface KommoUser {
  id: number;
  name: string;
  email: string;
  lang: string;
  rights: {
    leads: string;
    contacts: string;
    companies: string;
    tasks: string;
    mail_access: boolean;
    catalog_access: boolean;
    status_rights: Array<{
      entity_type: string;
      pipeline_id: number;
      status_id: number;
      rights: {
        view: string;
        edit: string;
        add: string;
        delete: string;
        export: string;
      };
    }>;
  };
}

export interface KommoEvent {
  id: string;
  type: string;
  entity_id: number;
  entity_type: string;
  created_at: number;
  created_by: number;
  value_after?: {
    lead_status?: {
      id: number;
      name: string;
      pipeline_id: number;
    };
  };
  value_before?: {
    lead_status?: {
      id: number;
      name: string;
      pipeline_id: number;
    };
  };
}

@Injectable()
export class KommoService {
  private client: AxiosInstance;
  private accessToken: string;
  private refreshToken: string;
  private subdomain: string;
  private clientId: string;
  private clientSecret: string;
  private redirectUri: string;

  constructor() {
    this.subdomain = process.env.KOMMO_SUBDOMAIN || '';
    this.clientId = process.env.KOMMO_CLIENT_ID || '';
    this.clientSecret = process.env.KOMMO_CLIENT_SECRET || '';
    this.redirectUri = process.env.KOMMO_REDIRECT_URI || '';
    this.accessToken = process.env.KOMMO_ACCESS_TOKEN || '';
    this.refreshToken = process.env.KOMMO_REFRESH_TOKEN || '';

    this.client = axios.create({
      baseURL: `https://${this.subdomain}.kommo.com/api/v4`,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Dinastia Lead Story Integration/1.0',
      },
    });

    // Interceptor para adicionar token de autorização
    this.client.interceptors.request.use((config) => {
      if (this.accessToken) {
        config.headers.Authorization = `Bearer ${this.accessToken}`;
      }
      return config;
    });

    // Interceptor para renovar token automaticamente em caso de 401
    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response?.status === 401 && this.refreshToken) {
          try {
            await this.refreshAccessToken();
            // Retry the original request with new token
            const originalRequest = error.config;
            originalRequest.headers.Authorization = `Bearer ${this.accessToken}`;
            return this.client.request(originalRequest);
          } catch (refreshError) {
            console.error('Failed to refresh Kommo access token:', refreshError);
            throw error;
          }
        }
        throw error;
      }
    );
  }

  // Renovar token de acesso usando refresh token
  private async refreshAccessToken(): Promise<void> {
    try {
      const response = await axios.post(`https://${this.subdomain}.amocrm.ru/oauth2/access_token`, {
        client_id: this.clientId,
        client_secret: this.clientSecret,
        grant_type: 'refresh_token',
        refresh_token: this.refreshToken,
        redirect_uri: this.redirectUri,
      });

      this.accessToken = response.data.access_token;
      this.refreshToken = response.data.refresh_token;

      console.log('Kommo access token refreshed successfully');
    } catch (error: any) {
      console.error('Error refreshing Kommo access token:', error.response?.data || error.message);
      throw new Error('Failed to refresh Kommo access token');
    }
  }

  // Buscar informações da conta
  async getAccountInfo(): Promise<any> {
    try {
      const response = await this.client.get('/account');
      return response.data;
    } catch (error: any) {
      console.error('Error fetching Kommo account info:', error.response?.data || error.message);
      throw error;
    }
  }

  // Buscar todos os pipelines
  async getPipelines(): Promise<KommoPipeline[]> {
    try {
      const response = await this.client.get('/leads/pipelines', {
        params: {
          with: 'statuses',
        },
      });
      return response.data._embedded?.pipelines || [];
    } catch (error: any) {
      console.error('Error fetching Kommo pipelines:', error.response?.data || error.message);
      throw error;
    }
  }

  // Buscar usuários
  async getUsers(): Promise<KommoUser[]> {
    try {
      const response = await this.client.get('/users');
      return response.data._embedded?.users || [];
    } catch (error: any) {
      console.error('Error fetching Kommo users:', error.response?.data || error.message);
      throw error;
    }
  }

  // Buscar leads de um pipeline específico com paginação
  async getLeadsFromPipeline(pipelineId?: number, limit: number = 250): Promise<KommoLead[]> {
    try {
      const allLeads: KommoLead[] = [];
      let page = 1;
      let hasMore = true;

      while (hasMore) {
        const params: any = {
          limit,
          page,
          with: 'custom_fields,tags',
        };

        if (pipelineId) {
          params['filter[pipeline_id]'] = pipelineId;
        }

        const response = await this.client.get('/leads', { params });
        const leads = response.data._embedded?.leads || [];
        
        allLeads.push(...leads);

        // Verificar se há mais páginas
        hasMore = leads.length === limit;
        page++;

        // Limite de segurança para evitar loops infinitos
        if (page > 100) {
          console.warn('Kommo pagination limit reached (100 pages)');
          break;
        }

        // Rate limiting - aguardar um pouco entre requests
        if (hasMore) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      console.log(`Fetched ${allLeads.length} leads from Kommo${pipelineId ? ` (pipeline ${pipelineId})` : ''}`);
      return allLeads;
    } catch (error: any) {
      console.error('Error fetching Kommo leads:', error.response?.data || error.message);
      throw error;
    }
  }

  // Buscar leads atualizados recentemente
  async getRecentlyUpdatedLeads(sinceTimestamp: number, pipelineId?: number): Promise<KommoLead[]> {
    try {
      const allLeads: KommoLead[] = [];
      let page = 1;
      let hasMore = true;

      while (hasMore) {
        const params: any = {
          limit: 250,
          page,
          with: 'custom_fields,tags',
          'filter[updated_at][from]': sinceTimestamp,
        };

        if (pipelineId) {
          params['filter[pipeline_id]'] = pipelineId;
        }

        const response = await this.client.get('/leads', { params });
        const leads = response.data._embedded?.leads || [];
        
        allLeads.push(...leads);

        hasMore = leads.length === 250;
        page++;

        if (page > 50) {
          console.warn('Kommo recent leads pagination limit reached (50 pages)');
          break;
        }

        if (hasMore) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      console.log(`Fetched ${allLeads.length} recently updated leads from Kommo`);
      return allLeads;
    } catch (error: any) {
      console.error('Error fetching recently updated Kommo leads:', error.response?.data || error.message);
      throw error;
    }
  }

  // Buscar eventos/histórico de um lead específico
  async getLeadEvents(leadId: number): Promise<KommoEvent[]> {
    try {
      const allEvents: KommoEvent[] = [];
      let page = 1;
      let hasMore = true;

      while (hasMore) {
        const response = await this.client.get('/events', {
          params: {
            filter: {
              entity: 'lead',
              entity_id: leadId,
              type: 'lead_status_changed'
            },
            page,
            limit: 250
          }
        });

        const events = response.data._embedded?.events || [];
        allEvents.push(...events);

        // Verificar se há mais páginas
        const totalPages = Math.ceil((response.data._page?.total || 0) / 250);
        hasMore = page < totalPages;
        page++;

        // Rate limiting - aguardar 100ms entre requisições
        if (hasMore) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      return allEvents;
    } catch (error: any) {
      console.error(`Error fetching events for lead ${leadId}:`, error.response?.data || error.message);
      throw error;
    }
  }

  // Calcular durações históricas por etapa baseado nos eventos
  calculateStageDurations(events: KommoEvent[], currentStageId: number, pipelines: KommoPipeline[]): Array<{
    lead_id: string;
    stage_id: string;
    stage_name: string;
    duration_seconds: number;
  }> {
    const durations: Array<{
      lead_id: string;
      stage_id: string;
      stage_name: string;
      duration_seconds: number;
    }> = [];

    if (events.length === 0) {
      return durations;
    }

    // Ordenar eventos por data (mais antigo primeiro)
    const sortedEvents = events
      .filter(event => event.type === 'lead_status_changed' && event.value_after?.lead_status)
      .sort((a, b) => a.created_at - b.created_at);

    const leadId = events[0].entity_id.toString();

    // Processar cada transição de status
    for (let i = 0; i < sortedEvents.length; i++) {
      const currentEvent = sortedEvents[i];
      const nextEvent = sortedEvents[i + 1];
      
      const stageId = currentEvent.value_after?.lead_status?.id;
      const pipelineId = currentEvent.value_after?.lead_status?.pipeline_id;
      
      if (!stageId || !pipelineId) continue;

      // Encontrar o nome da etapa
      const pipeline = pipelines.find(p => p.id === pipelineId);
      const stage = pipeline?._embedded?.statuses?.find(s => s.id === stageId);
      const stageName = stage?.name || `Stage ${stageId}`;

      let durationSeconds: number;

      if (nextEvent) {
        // Duração até o próximo evento
        durationSeconds = nextEvent.created_at - currentEvent.created_at;
      } else {
        // Último evento - duração até agora
        durationSeconds = Math.floor(Date.now() / 1000) - currentEvent.created_at;
      }

      durations.push({
        lead_id: leadId,
        stage_id: stageId.toString(),
        stage_name: stageName,
        duration_seconds: durationSeconds
      });
    }

    return durations;
  }

  // Mapear lead do Kommo para formato do snapshot
  mapLeadToSnapshot(
    lead: KommoLead, 
    pipelines: KommoPipeline[], 
    users: KommoUser[]
  ): {
    lead_id: string;
    name?: string;
    status: string;
    pipeline_id?: string;
    pipeline_name?: string;
    stage_id?: string;
    stage_name?: string;
    responsible_user_id?: string;
    responsible_user_name?: string;
    created_at?: string;
    updated_at?: string;
    last_updated_at: string;
    custom_fields?: any;
    tags?: string[];
    origin?: string;
    created_at_snapshot: string;
  } {
    // Encontrar pipeline e status
    const pipeline = pipelines.find(p => p.id === lead.pipeline_id);
    const status = pipeline?._embedded?.statuses?.find(s => s.id === lead.status_id);
    
    // Encontrar usuário responsável
    const user = users.find(u => u.id === lead.responsible_user_id);
    
    // Extrair origem do campo customizado específico 1285517
    let origin: string | undefined;
    if (lead.custom_fields_values) {
      const originField = lead.custom_fields_values.find(
        field => field.field_id === 1285517
      );
      if (originField && originField.values && originField.values.length > 0) {
        origin = originField.values[0].value;
      }
    }

    // Extrair tags
    const tags = lead._embedded?.tags?.map(tag => tag.name) || [];

    return {
      lead_id: lead.id.toString(),
      name: lead.name,
      status: status?.name || `Status ${lead.status_id}`,
      pipeline_id: lead.pipeline_id?.toString(),
      pipeline_name: pipeline?.name,
      stage_id: lead.status_id?.toString(),
      stage_name: status?.name,
      responsible_user_id: lead.responsible_user_id?.toString(),
      responsible_user_name: user?.name,
      created_at: lead.created_at ? new Date(lead.created_at * 1000).toISOString() : undefined,
      updated_at: lead.updated_at ? new Date(lead.updated_at * 1000).toISOString() : undefined,
      last_updated_at: new Date().toISOString(),
      custom_fields: lead.custom_fields_values,
      tags: tags.length > 0 ? tags : undefined,
      origin,
      created_at_snapshot: new Date().toISOString(),
    };
  }
}