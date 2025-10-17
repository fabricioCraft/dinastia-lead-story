import { Injectable, Logger } from '@nestjs/common';
import { N8nAnalyticsService } from '../services/n8n-analytics.service';
import { SupabaseService } from '../services/supabase.service';

export interface CampaignSummaryData {
  utm_campaign: string;
  lead_count: number;
  percentage: number;
}

export interface CampaignSummaryResponse {
  kpis: {
    totalLeads: number;
    totalCampaigns: number;
  };
  campaigns: CampaignSummaryData[];
  period: {
    startDate: string;
    endDate: string;
  };
}

export interface DailyLeadVolumeData {
  day: string; // formato YYYY-MM-DD
  total_leads_per_day: number;
}

export interface SchedulingSummaryData {
  totalLeads: number;
  totalAppointments: number;
  schedulingRate: number;
}

export interface DailyAppointmentsData {
  day: string; // formato YYYY-MM-DD
  appointments_per_day: number;
}

export interface LeadsByStageData {
  stage_name: string;
  lead_count: number;
}

export interface UnifiedOriginSummaryData {
  origin_name: string;
  lead_count: number;
}

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  constructor(
    private readonly n8nAnalyticsService: N8nAnalyticsService,
    private readonly supabaseService: SupabaseService
  ) {}

  async getOriginSummary(days?: number) {
    // Redirecionar para o N8nAnalyticsService que tem os dados corretos
    const utmData = await this.n8nAnalyticsService.getLeadsByUtmSource(days);
    
    return {
      kpis: utmData.kpis,
      leadsByOrigin: utmData.leadsByOrigin,
      leadsByCampaign: utmData.leadsByOrigin, // Usar os mesmos dados para campanhas
    };
  }

  async getFunnelBreakdownForOrigin(origin: string, days?: number): Promise<{ status: string; count: number }[]> {
    // Método removido - dados agora vêm do N8N
    return [];
  }

  async getCampaignSummaryFromPxLeads(
    startDate?: string,
    endDate?: string
  ): Promise<CampaignSummaryResponse> {
    try {
      // Definir período padrão (últimos 30 dias) se não fornecido
      const now = new Date();
      const start = startDate
        ? new Date(`${startDate}T00:00:00.000Z`)
        : new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      // Fim exclusivo: somar 1 dia ao fim para incluir todo o dia final
      const endExclusive = endDate
        ? new Date(`${endDate}T00:00:00.000Z`)
        : new Date(now);
      endExclusive.setUTCDate(endExclusive.getUTCDate() + 1);

      // Formatar datas para ISO string (inicio inclusivo, fim exclusivo)
      const startDateISO = start.toISOString();
      const endExclusiveISO = endExclusive.toISOString();
      const endInclusiveISO = new Date(endExclusive.getTime() - 1).toISOString();

      this.logger.log(
        `Buscando dados de campanha para período inclusivo: ${startDateISO} até ${endInclusiveISO}`
      );

      const client = this.supabaseService.getClient();
      if (!client) {
        throw new Error('Cliente Supabase não inicializado');
      }

      // Query para agregar dados por utm_campaign usando API nativa do Supabase
      const { data: campaignData, error } = await client
        .from('px_leads')
        .select('utm_campaign')
        .gte('post_date', startDateISO)
        .lt('post_date', endExclusiveISO)
        .not('utm_campaign', 'is', null)
        .neq('utm_campaign', '');

      if (error) {
        this.logger.error('Erro ao buscar dados de campanha:', error);
        throw new Error(`Erro na consulta: ${error.message}`);
      }

      // Query para total de leads no período inclusivo
      const { count: totalLeadsCount, error: totalError } = await client
        .from('px_leads')
        .select('*', { count: 'exact', head: true })
        .gte('post_date', startDateISO)
        .lt('post_date', endExclusiveISO);

      if (totalError) {
        this.logger.error('Erro ao executar query de total:', totalError);
        throw new Error(`Erro na consulta de total: ${totalError.message}`);
      }

      const totalLeads = totalLeadsCount || 0;

      // Agregar dados por utm_campaign manualmente
      const campaignCounts = new Map<string, number>();
      (campaignData || []).forEach((lead: any) => {
        const campaign = lead.utm_campaign || 'Sem Campanha';
        campaignCounts.set(campaign, (campaignCounts.get(campaign) || 0) + 1);
      });

      // Converter para array e ordenar por contagem
      const campaigns: CampaignSummaryData[] = Array.from(campaignCounts.entries())
        .map(([utm_campaign, lead_count]) => ({
          utm_campaign,
          lead_count,
          percentage: totalLeads > 0 ? Math.round((lead_count / totalLeads) * 100) : 0,
        }))
        .sort((a, b) => b.lead_count - a.lead_count);

      return {
        kpis: {
          totalLeads,
          totalCampaigns: campaigns.length,
        },
        campaigns,
        period: {
          startDate: startDateISO,
          endDate: endInclusiveISO,
        },
      };
    } catch (error) {
      this.logger.error('Erro ao buscar dados de campanha:', error);
      throw error;
    }
  }

  async getDailyLeadVolume(
    startDate?: string,
    endDate?: string
  ): Promise<DailyLeadVolumeData[]> {
    try {
      this.logger.log('Buscando dados de volume diário de leads');
      this.logger.log(`Filtros recebidos - startDate: ${startDate}, endDate: ${endDate}`);

      // Usar diretamente o método fallback que tem lógica mais confiável
      // A função execute_sql pode não estar aplicando os filtros corretamente
      return await this.getDailyLeadVolumeFallback(startDate, endDate);

    } catch (error) {
      this.logger.error('Erro ao buscar dados de volume diário:', error);
      throw error;
    }
  }

  private async getDailyLeadVolumeFallback(
    startDate?: string,
    endDate?: string
  ): Promise<DailyLeadVolumeData[]> {
    try {
      this.logger.log('Usando método fallback para volume diário de leads');

      const client = this.supabaseService.getClient();
      if (!client) {
        throw new Error('Cliente Supabase não inicializado');
      }

      // Buscar TODOS os dados de leads2 usando paginação
      const leads2Data: any[] = [];
      let page = 0;
      const pageSize = 1000; // Máximo permitido pelo Supabase
      let hasMoreLeads2 = true;

      while (hasMoreLeads2) {
        let query1 = client
          .from('leads2')
          .select('datacriacao')
          .not('datacriacao', 'is', null)
          .range(page * pageSize, (page + 1) * pageSize - 1);

        if (startDate) {
          query1 = query1.gte('datacriacao', `${startDate}T00:00:00.000Z`);
        }
        if (endDate) {
          const endExclusive = new Date(`${endDate}T00:00:00.000Z`);
          endExclusive.setUTCDate(endExclusive.getUTCDate() + 1);
          query1 = query1.lt('datacriacao', endExclusive.toISOString());
        }

        const { data: pageData, error: pageError } = await query1;
        
        if (pageError) {
          this.logger.error(`Erro ao buscar página ${page} de leads2:`, pageError);
          throw new Error(`Erro na consulta leads2 página ${page}: ${pageError.message}`);
        }

        if (pageData && pageData.length > 0) {
          leads2Data.push(...pageData);
          this.logger.log(`Página ${page} de leads2: ${pageData.length} registros`);
        }

        hasMoreLeads2 = pageData && pageData.length === pageSize;
        page++;
      }

      // Buscar TODOS os dados de MR_base_leads usando paginação
      const mrLeadsData: any[] = [];
      page = 0;
      let hasMoreMrLeads = true;

      while (hasMoreMrLeads) {
        let query2 = client
          .from('MR_base_leads')
          .select('created_at')
          .not('created_at', 'is', null)
          .range(page * pageSize, (page + 1) * pageSize - 1);

        if (startDate) {
          query2 = query2.gte('created_at', `${startDate}T00:00:00.000Z`);
        }
        if (endDate) {
          const endExclusive = new Date(`${endDate}T00:00:00.000Z`);
          endExclusive.setUTCDate(endExclusive.getUTCDate() + 1);
          query2 = query2.lt('created_at', endExclusive.toISOString());
        }

        const { data: pageData, error: pageError } = await query2;
        
        if (pageError) {
          this.logger.error(`Erro ao buscar página ${page} de MR_base_leads:`, pageError);
          throw new Error(`Erro na consulta MR_base_leads página ${page}: ${pageError.message}`);
        }

        if (pageData && pageData.length > 0) {
          mrLeadsData.push(...pageData);
          this.logger.log(`Página ${page} de MR_base_leads: ${pageData.length} registros`);
        }

        hasMoreMrLeads = pageData && pageData.length === pageSize;
        page++;
      }

      this.logger.log(`Total de registros coletados - leads2: ${leads2Data.length}, MR_base_leads: ${mrLeadsData.length}`);

      // Combinar e agregar os dados manualmente
      const dailyCounts = new Map<string, number>();

      // Processar leads2
      (leads2Data || []).forEach((lead: any) => {
        const date = new Date(lead.datacriacao);
        // Usar fuso horário brasileiro (UTC-3) para evitar problemas de data
        const day = new Date(date.getTime() - (3 * 60 * 60 * 1000)).toISOString().split('T')[0]; // YYYY-MM-DD
        dailyCounts.set(day, (dailyCounts.get(day) || 0) + 1);
      });

      // Processar MR_base_leads
      (mrLeadsData || []).forEach((lead: any) => {
        const date = new Date(lead.created_at);
        // Usar fuso horário brasileiro (UTC-3) para evitar problemas de data
        const day = new Date(date.getTime() - (3 * 60 * 60 * 1000)).toISOString().split('T')[0]; // YYYY-MM-DD
        dailyCounts.set(day, (dailyCounts.get(day) || 0) + 1);
      });

      // Converter para array e ordenar
      const result: DailyLeadVolumeData[] = Array.from(dailyCounts.entries())
        .map(([day, total_leads_per_day]) => ({
          day,
          total_leads_per_day
        }))
        .sort((a, b) => a.day.localeCompare(b.day));

      this.logger.log(`Fallback retornando ${result.length} registros de volume diário`);
      return result;

    } catch (error) {
      this.logger.error('Erro no método fallback de volume diário:', error);
      throw error;
    }
  }

  /**
   * Busca resumo dos KPIs de agendamento
   * Calcula total de leads, total de agendamentos e taxa de agendamento
   */
  async getSchedulingSummary(): Promise<SchedulingSummaryData> {
    try {
      this.logger.log('Buscando resumo de KPIs de agendamento');

      const client = this.supabaseService.getClient();
      if (!client) {
        throw new Error('Cliente Supabase não inicializado');
      }

      // Buscar total de leads
      const { count: totalLeads, error: totalError } = await client
        .from('MR_base_leads')
        .select('*', { count: 'exact', head: true });

      if (totalError) {
        this.logger.error('Erro ao buscar total de leads:', totalError);
        throw new Error(`Erro na consulta de total de leads: ${totalError.message}`);
      }

      // Buscar total de agendamentos (leads com data_do_agendamento não nulo)
      const { count: totalAppointments, error: appointmentsError } = await client
        .from('MR_base_leads')
        .select('*', { count: 'exact', head: true })
        .not('data_do_agendamento', 'is', null);

      if (appointmentsError) {
        this.logger.error('Erro ao buscar total de agendamentos:', appointmentsError);
        throw new Error(`Erro na consulta de agendamentos: ${appointmentsError.message}`);
      }

      const totalLeadsCount = totalLeads || 0;
      const totalAppointmentsCount = totalAppointments || 0;
      const schedulingRate = totalLeadsCount > 0 ? totalAppointmentsCount / totalLeadsCount : 0;

      this.logger.log(`Resumo de agendamentos: ${totalAppointmentsCount}/${totalLeadsCount} leads (${(schedulingRate * 100).toFixed(2)}%)`);

      return {
        totalLeads: totalLeadsCount,
        totalAppointments: totalAppointmentsCount,
        schedulingRate
      };

    } catch (error) {
      this.logger.error('Erro ao buscar resumo de agendamentos:', error);
      throw error;
    }
  }

  /**
   * Busca volume diário de agendamentos
   * Agrupa agendamentos por dia baseado na data_do_agendamento
   * @param startDate Data de início (formato YYYY-MM-DD)
   * @param endDate Data de fim (formato YYYY-MM-DD)
   */
  async getDailyAppointments(
    startDate?: string,
    endDate?: string
  ): Promise<DailyAppointmentsData[]> {
    try {
      const periodInfo = startDate || endDate ? ` (${startDate || 'início'} até ${endDate || 'fim'})` : '';
      this.logger.log(`Buscando volume diário de agendamentos${periodInfo}`);

      const client = this.supabaseService.getClient();
      if (!client) {
        throw new Error('Cliente Supabase não inicializado');
      }

      // Query SQL unificada para buscar agendamentos diários de ambas as tabelas
      // com conversão de texto para timestamp e deduplicação
      let query = `
        -- Passo 4: Contagem final de agendamentos únicos por dia 
        SELECT 
            day, 
            COUNT(*) as appointments_per_day 
        FROM ( 
            -- Passo 3: Garante que cada lead (identificado pelo whatsapp normalizado) seja contado apenas uma vez por dia 
            SELECT DISTINCT ON (day, normalized_whatsapp) 
                day 
            FROM ( 
                -- Passo 2: Extrai o dia do agendamento e o whatsapp normalizado de cada evento 
                SELECT 
                    DATE_TRUNC('day', appointment_timestamp)::date AS day, 
                    normalized_whatsapp 
                FROM ( 
                    -- Passo 1: Unifica os dados de agendamento, convertendo a data e normalizando o whatsapp 
                    SELECT 
                        to_timestamp(data_do_agendamento, 'DD/MM/YYYY, HH24:MI:SS') AS appointment_timestamp, 
                        -- Remove todos os caracteres não numéricos do chatid para normalizá-lo 
                        regexp_replace(chatid, '\\D', '', 'g') AS normalized_whatsapp 
                    FROM public.leads2 
                    WHERE data_do_agendamento IS NOT NULL AND data_do_agendamento <> '' AND chatid IS NOT NULL AND chatid <> '' 

                    UNION ALL 

                    SELECT 
                        to_timestamp(data_do_agendamento, 'DD/MM/YYYY, HH24:MI:SS') AS appointment_timestamp, 
                        -- Faz o mesmo para a coluna whatsapp 
                        regexp_replace(whatsapp, '\\D', '', 'g') AS normalized_whatsapp 
                    FROM public."MR_base_leads" 
                    WHERE data_do_agendamento IS NOT NULL AND data_do_agendamento <> '' AND whatsapp IS NOT NULL AND whatsapp <> '' 
                ) as all_appointment_events 
            ) as daily_appointments 
            WHERE normalized_whatsapp IS NOT NULL 
        ) as unique_daily_appointments
      `;

      // Adicionar filtros de data se fornecidos
      const params: any[] = [];
      if (startDate) {
        query = query.replace(
          'WHERE normalized_whatsapp IS NOT NULL',
          `WHERE normalized_whatsapp IS NOT NULL AND day >= $${params.length + 1}`
        );
        params.push(startDate);
      }
      if (endDate) {
        const whereClause = params.length > 0 ? 'AND' : 'WHERE';
        query = query.replace(
          'WHERE normalized_whatsapp IS NOT NULL',
          `WHERE normalized_whatsapp IS NOT NULL ${whereClause} day <= $${params.length + 1}`
        );
        params.push(endDate);
      }

      query += `
        GROUP BY day 
        ORDER BY day ASC
      `;

      this.logger.log(`Executando query de agendamentos diários: ${query}`);
      if (params.length > 0) {
        this.logger.log(`Parâmetros: ${JSON.stringify(params)}`);
      }

      // Executar a query usando rpc para SQL customizado
      const { data, error } = await client.rpc('execute_sql', {
        sql_query: query,
        params: params
      });

      if (error) {
        this.logger.error('Erro ao executar query de agendamentos diários:', error);
        // Fallback: usar processamento no lado da aplicação com lógica corrigida
        return await this.getDailyAppointmentsFallback(startDate, endDate);
      }

      if (!data || data.length === 0) {
        this.logger.warn('Nenhum dado de agendamentos diários encontrado');
        return [];
      }

      // Transformar os dados para o formato esperado
      const appointmentsData: DailyAppointmentsData[] = (data || []).map((row: any) => ({
        day: row.day,
        appointments_per_day: parseInt(row.appointments_per_day, 10)
      }));

      // Preencher lacunas de datas com 0 agendamentos se startDate e endDate forem fornecidos
      const result = this.fillDateGapsForAppointments(appointmentsData, startDate, endDate);

      this.logger.log(`Retornando ${result.length} registros de agendamentos diários (incluindo dias com 0 agendamentos)`);
      return result;

    } catch (error) {
      this.logger.error('Erro ao buscar agendamentos diários:', error);
      // Em caso de erro, tentar fallback
      return await this.getDailyAppointmentsFallback(startDate, endDate);
    }
  }

  /**
   * Fallback para buscar agendamentos diários quando execute_sql não está disponível
   * Processa os dados no lado da aplicação com lógica unificada de ambas as tabelas
   */
  private async getDailyAppointmentsFallback(
    startDate?: string,
    endDate?: string
  ): Promise<DailyAppointmentsData[]> {
    try {
      this.logger.log('Usando fallback unificado para agendamentos diários');

      const client = this.supabaseService.getClient();
      if (!client) {
        throw new Error('Cliente Supabase não inicializado');
      }

      // Buscar agendamentos da tabela MR_base_leads
      const { data: mrBaseData, error: mrBaseError } = await client
        .from('MR_base_leads')
        .select('data_do_agendamento, whatsapp')
        .not('data_do_agendamento', 'is', null)
        .neq('data_do_agendamento', '')
        .not('whatsapp', 'is', null)
        .neq('whatsapp', '')
        .order('data_do_agendamento', { ascending: true })
        .limit(10000);

      if (mrBaseError) {
        this.logger.error('Erro ao buscar MR_base_leads no fallback:', mrBaseError);
      }

      // Buscar agendamentos da tabela leads2
      const { data: leads2Data, error: leads2Error } = await client
        .from('leads2')
        .select('data_do_agendamento, chatid')
        .not('data_do_agendamento', 'is', null)
        .neq('data_do_agendamento', '')
        .not('chatid', 'is', null)
        .neq('chatid', '')
        .order('data_do_agendamento', { ascending: true })
        .limit(10000);

      if (leads2Error) {
        this.logger.error('Erro ao buscar leads2 no fallback:', leads2Error);
      }

      const totalRecords = (mrBaseData?.length || 0) + (leads2Data?.length || 0);
      if (totalRecords === 0) {
        this.logger.warn('Nenhum dado de agendamentos encontrado no fallback');
        return [];
      }

      this.logger.log(`Processando ${totalRecords} registros de agendamentos no fallback unificado`);

      // Função para normalizar WhatsApp (remove caracteres não numéricos)
      const normalizeWhatsApp = (whatsapp: string): string => {
        return whatsapp.replace(/\D/g, '');
      };

      // Usar Set para deduplicação por dia + WhatsApp normalizado
      const uniqueAppointments = new Set<string>();
      const dailyCounts = new Map<string, number>();
      let validDatesCount = 0;
      let invalidDatesCount = 0;
      let duplicatesCount = 0;

      // Processar dados do MR_base_leads
      (mrBaseData || []).forEach((appointment: any) => {
        try {
          const dateStr = appointment.data_do_agendamento;
          const whatsapp = appointment.whatsapp;
          
          const dayKey = this.parseBrazilianDate(dateStr);
          if (dayKey && whatsapp) {
            // Aplicar filtros de data se fornecidos
            if (startDate && dayKey < startDate) return;
            if (endDate && dayKey > endDate) return;
            
            const normalizedWhatsApp = normalizeWhatsApp(whatsapp);
            const uniqueKey = `${dayKey}|${normalizedWhatsApp}`;
            if (!uniqueAppointments.has(uniqueKey)) {
              uniqueAppointments.add(uniqueKey);
              dailyCounts.set(dayKey, (dailyCounts.get(dayKey) || 0) + 1);
              validDatesCount++;
            } else {
              duplicatesCount++;
            }
          } else {
            invalidDatesCount++;
          }
        } catch (error) {
          this.logger.warn(`Erro ao processar data MR_base_leads no fallback: ${appointment.data_do_agendamento}`, error);
          invalidDatesCount++;
        }
      });

      // Processar dados do leads2
      (leads2Data || []).forEach((appointment: any) => {
        try {
          const dateStr = appointment.data_do_agendamento;
          const chatid = appointment.chatid;
          
          const dayKey = this.parseBrazilianDate(dateStr);
          if (dayKey && chatid) {
            // Aplicar filtros de data se fornecidos
            if (startDate && dayKey < startDate) return;
            if (endDate && dayKey > endDate) return;
            
            const normalizedWhatsApp = normalizeWhatsApp(chatid);
            const uniqueKey = `${dayKey}|${normalizedWhatsApp}`;
            if (!uniqueAppointments.has(uniqueKey)) {
              uniqueAppointments.add(uniqueKey);
              dailyCounts.set(dayKey, (dailyCounts.get(dayKey) || 0) + 1);
              validDatesCount++;
            } else {
              duplicatesCount++;
            }
          } else {
            invalidDatesCount++;
          }
        } catch (error) {
          this.logger.warn(`Erro ao processar data leads2 no fallback: ${appointment.data_do_agendamento}`, error);
          invalidDatesCount++;
        }
      });
      
      this.logger.log(`Fallback unificado processou ${validDatesCount} datas válidas, ignorou ${invalidDatesCount} datas inválidas e ${duplicatesCount} duplicatas`);

      // Converter para array e ordenar
      const appointmentsData: DailyAppointmentsData[] = Array.from(dailyCounts.entries())
        .map(([day, appointments_per_day]) => ({
          day,
          appointments_per_day
        }))
        .sort((a, b) => a.day.localeCompare(b.day));

      // Preencher lacunas de datas com 0 agendamentos se startDate e endDate forem fornecidos
      const result = this.fillDateGapsForAppointments(appointmentsData, startDate, endDate);

      this.logger.log(`Retornando ${result.length} registros de agendamentos diários do fallback unificado (incluindo dias com 0 agendamentos)`);
      return result;

    } catch (error) {
      this.logger.error('Erro no fallback unificado de agendamentos diários:', error);
      return [];
    }
  }

  /**
   * Preenche lacunas de datas com 0 agendamentos para garantir que todos os dias do período sejam incluídos
   */
  private fillDateGapsForAppointments(appointmentsData: DailyAppointmentsData[], startDate?: string, endDate?: string): DailyAppointmentsData[] {
    // Se não temos startDate e endDate, retornar os dados originais
    if (!startDate || !endDate) {
      return appointmentsData;
    }

    try {
      // Criar um mapa dos dados existentes para acesso rápido
      const dataMap = new Map<string, number>();
      appointmentsData.forEach(item => {
        dataMap.set(item.day, item.appointments_per_day);
      });

      // Gerar todas as datas no período
      const start = new Date(startDate);
      const end = new Date(endDate);
      const result: DailyAppointmentsData[] = [];

      for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
        const dayStr = date.toISOString().split('T')[0]; // Formato YYYY-MM-DD
        const appointments = dataMap.get(dayStr) || 0;
        
        result.push({
          day: dayStr,
          appointments_per_day: appointments
        });
      }

      return result.sort((a, b) => a.day.localeCompare(b.day));
    } catch (error) {
      this.logger.error('Erro ao preencher lacunas de datas para agendamentos:', error);
      return appointmentsData; // Retornar dados originais em caso de erro
    }
  }

  /**
   * Converte data brasileira (DD/MM/YYYY) para formato ISO (YYYY-MM-DD)
   */
  private parseBrazilianDate(dateStr: string): string | null {
    try {
      // Usar regex para extrair data no formato brasileiro DD/MM/YYYY
      const brFormatMatch = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
      if (brFormatMatch) {
        const [, day, month, year] = brFormatMatch;
        const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        
        // Verificar se a data é válida
        if (!isNaN(date.getTime())) {
          return date.toISOString().split('T')[0]; // Formato YYYY-MM-DD
        }
      }
      
      // Se não conseguiu processar no formato brasileiro, tentar outros formatos
      const date = new Date(dateStr);
      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0];
      }
      
      return null;
    } catch (error) {
      return null;
    }
  }

  async getUnifiedOriginSummary(days?: number, fromDate?: Date, toDate?: Date): Promise<UnifiedOriginSummaryData[]> {
    try {
      this.logger.log('Buscando dados unificados de origem dos leads...');
      
      const client = this.supabaseService.getClient();
      if (!client) {
        throw new Error('Supabase client not initialized');
      }

      // Calcular período de filtro
      let startDate: Date;
      let endDate: Date;

      if (fromDate && toDate) {
        startDate = fromDate;
        endDate = toDate;
      } else if (days) {
        endDate = new Date();
        startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);
      } else {
        // Padrão: últimos 30 dias
        endDate = new Date();
        startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);
      }

      this.logger.log(`Filtrando dados de origem entre ${startDate.toISOString()} e ${endDate.toISOString()}`);

      // Função para buscar registros com filtro de data
      const fetchFilteredRecords = async (tableName: string, column: string, dateColumn: string) => {
        const allData: any[] = [];
        let from = 0;
        const pageSize = 1000;
        let hasMore = true;

        while (hasMore) {
          let query = client
            .from(tableName)
            .select(`${column}, ${dateColumn}`)
            .gte(dateColumn, startDate.toISOString())
            .lte(dateColumn, endDate.toISOString())
            .range(from, from + pageSize - 1);

          const { data, error } = await query;

          if (error) {
            this.logger.error(`Erro ao buscar dados de ${tableName}:`, error);
            throw new Error(error.message);
          }

          if (data && data.length > 0) {
            allData.push(...data);
            from += pageSize;
            hasMore = data.length === pageSize;
          } else {
            hasMore = false;
          }
        }

        return allData;
      };

      // Buscar dados filtrados das duas tabelas
      const leads2Data = await fetchFilteredRecords('leads2', 'origem', 'datacriacao') as Array<{origem: string, datacriacao: string}>;
      const mrBaseData = await fetchFilteredRecords('MR_base_leads', 'utm_campaign', 'created_at') as Array<{utm_campaign: string, created_at: string}>;

      // Função para normalizar nomes de origem
      const normalizeOrigin = (origin: string | null | undefined): string => {
        if (!origin || origin.trim() === '') return 'Sem Origem';
        
        const normalized = origin.toLowerCase().trim();
        
        // Normalização específica para evitar duplicatas
        if (normalized.includes('isca') && (normalized.includes('hormozi') || normalized.includes('hormozi'))) {
          return 'Isca Hormozi';
        }
        if (normalized.includes('isca') && (normalized.includes('scopeline') || normalized.includes('scope'))) {
          return 'Isca Scopeline';
        }
        if (normalized.includes('manychat')) {
          return 'Manychat';
        }
        if (normalized.includes('starter10k')) {
          return 'Starter10k';
        }
        if (normalized.includes('masterclass')) {
          return 'Masterclass';
        }
        if (normalized.includes('agendamento')) {
          return 'Agendamento';
        }
        if (normalized.includes('desafio')) {
          return 'Desafio';
        }
        if (normalized.includes('youtube') || normalized.includes('yt-')) {
          return 'YouTube';
        }
        if (normalized.includes('calendly')) {
          return 'Calendly';
        }
        if (normalized.includes('venda')) {
          return 'Venda';
        }
        if (normalized.includes('google ads') || normalized.includes('google')) {
          return 'Google Ads';
        }
        if (normalized.includes('facebook') || normalized.includes('meta')) {
          return 'Facebook Ads';
        }
        if (normalized.includes('instagram')) {
          return 'Instagram';
        }
        if (normalized.includes('linkedin')) {
          return 'LinkedIn';
        }
        if (normalized.includes('tiktok')) {
          return 'TikTok';
        }
        if (normalized.includes('whatsapp')) {
          return 'WhatsApp';
        }
        if (normalized.includes('email')) {
          return 'Email Marketing';
        }
        if (normalized.includes('seo') || normalized.includes('organico')) {
          return 'SEO/Orgânico';
        }
        if (normalized.includes('indicacao') || normalized.includes('referral')) {
          return 'Indicação';
        }
        
        // Para campanhas do Dinastia, manter o nome original mas limpo
        if (normalized.includes('dinastia')) {
          return origin.trim();
        }
        
        // Para outros casos, capitalizar primeira letra de cada palavra
        return origin.split(' ')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
          .join(' ');
      };

      // Processar dados de leads2
      const originCounts = new Map<string, number>();
      
      leads2Data?.forEach(lead => {
        const normalizedOrigin = normalizeOrigin(lead.origem);
        originCounts.set(normalizedOrigin, (originCounts.get(normalizedOrigin) || 0) + 1);
      });

      // Processar dados de MR_base_leads
      mrBaseData?.forEach(lead => {
        const normalizedOrigin = normalizeOrigin(lead.utm_campaign);
        originCounts.set(normalizedOrigin, (originCounts.get(normalizedOrigin) || 0) + 1);
      });

      // Converter Map para array e ordenar por lead_count
      const result: UnifiedOriginSummaryData[] = Array.from(originCounts.entries())
        .map(([origin_name, lead_count]) => ({
          origin_name,
          lead_count
        }))
        .sort((a, b) => b.lead_count - a.lead_count);

      return result;

    } catch (error) {
      this.logger.error('Erro ao buscar dados unificados de origem:', error);
      throw error;
    }
  }

  async getDashboardLeadsByStage(): Promise<LeadsByStageData[]> {
    try {
      this.logger.log('Buscando distribuição de leads por etapa...');
      
      const client = this.supabaseService.getClient();
      if (!client) {
        throw new Error('Cliente Supabase não inicializado');
      }
      
      // Executar a query SQL especificada pelo usuário
      const { data, error } = await client
        .from('leads2')
        .select('etapa')
        .not('etapa', 'is', null)
        .neq('etapa', '');

      if (error) {
        this.logger.error('Erro ao buscar leads por etapa:', error);
        throw new Error(`Erro na consulta: ${error.message}`);
      }

      // Função para normalizar nomes de etapas similares
      const normalizeStage = (stage: string): string => {
        const lowerStage = stage.toLowerCase().trim();
        
        // Consolidar variações de "no-show"
        if (lowerStage === 'noshow' || lowerStage === 'no_show' || lowerStage === 'no show') {
          return 'No-show';
        }
        
        // Consolidar variações de "agendado"
        if (lowerStage === 'agendado' || lowerStage === 'agendados') {
          return 'Agendado';
        }
        
        // Consolidar variações de "follow up"
        if (lowerStage === 'follow_up' || lowerStage === 'follow up' || lowerStage === 'followup') {
          return 'Follow-up';
        }
        
        // Capitalizar primeira letra de cada palavra para outras etapas
        return stage
          .split(' ')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
          .join(' ');
      };

      // Agregar dados por etapa manualmente com consolidação
      const stageCounts = new Map<string, number>();
      (data || []).forEach((lead: any) => {
        const normalizedStage = normalizeStage(lead.etapa);
        stageCounts.set(normalizedStage, (stageCounts.get(normalizedStage) || 0) + 1);
      });

      // Converter para array e ordenar por contagem decrescente
      const result: LeadsByStageData[] = Array.from(stageCounts.entries())
        .map(([stage_name, lead_count]) => ({
          stage_name,
          lead_count
        }))
        .sort((a, b) => b.lead_count - a.lead_count);

      this.logger.log(`Retornando ${result.length} etapas com distribuição de leads`);
      return result;

    } catch (error) {
      this.logger.error('Erro ao buscar distribuição de leads por etapa:', error);
      throw error;
    }
  }


}