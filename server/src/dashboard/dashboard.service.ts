import { Injectable, Logger } from '@nestjs/common';
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

export interface AppointmentsByPersonData {
  agendado_por: string;
  appointment_count: number;
}

export interface AppointmentsByPersonPerDayData {
  day: string;
  agendado_por: string;
  appointment_count: number;
}

export interface LeadsByStageData {
  stage_name: string;
  lead_count: number;
}

export interface UnifiedOriginSummaryData {
  origin_name: string;
  lead_count: number;
}

export interface LeadsByClassificationData {
  classification_name: string;
  lead_count: number;
}

export interface DrilldownItem {
  name: string;
  value: number;
}

export interface DashboardFilters {
  campaign?: string;
  source?: string;
  content?: string;
  classification?: string;
  origin?: string;
  scheduler?: string;
}

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  constructor(
    private readonly supabaseService: SupabaseService
  ) { }

  private buildWhereClause(
    startDate?: string,
    endDate?: string,
    days?: number,
    filters?: DashboardFilters,
    dateColumn: string = 'datacriacao'
  ): string {
    const whereClauses: string[] = [];

    // Filtro de data
    if (typeof days === 'number' && days > 0) {
      whereClauses.push(`${dateColumn} >= NOW() - INTERVAL '${days} days'`);
    } else {
      if (startDate) whereClauses.push(`${dateColumn} >= '${startDate}T00:00:00.000Z'`);
      if (endDate) whereClauses.push(`${dateColumn} <= '${endDate}T23:59:59.999Z'`);
    }

    // Filtros categóricos
    if (filters) {
      if (filters.campaign) {
        // Normalização complexa para campaign
        whereClauses.push(`
          (CASE 
            WHEN utm_campaign ILIKE 'DINASTIA |%|%' THEN TRIM(split_part(utm_campaign, '|', 2))
            ELSE utm_campaign 
          END) = '${filters.campaign}'
        `);
      }
      if (filters.source) {
        whereClauses.push(`TRIM(utm_source) = '${filters.source}'`);
      }
      if (filters.content) {
        whereClauses.push(`TRIM(utm_content) = '${filters.content}'`);
      }
      if (filters.classification) {
        whereClauses.push(`TRIM(classificacao_do_lead) = '${filters.classification}'`);
      }
      if (filters.origin) {
        whereClauses.push(`(
          CASE
            WHEN origem ILIKE '%ISCA SCOPELINE%' THEN 'Isca Scopeline'
            WHEN origem ILIKE '%ISCA HORMOZI%' THEN 'Isca Hormozi'
            WHEN origem ILIKE '%MASTERCLASS%' THEN 'Masterclass'
            WHEN origem ILIKE '%MANYCHAT%' THEN 'Manychat'
            WHEN origem ILIKE '%STARTER10K%' THEN 'Starter10k'
            WHEN origem ILIKE '%AGENDAMENTO%' THEN 'Agendamento'
            WHEN origem ILIKE '%DESAFIO%' THEN 'Desafio'
            WHEN origem ILIKE '%YOUTUBE%' OR origem ILIKE '%YT-%' THEN 'YouTube'
            WHEN origem ILIKE '%CALENDLY%' THEN 'Calendly'
            WHEN origem ILIKE '%VENDA%' THEN 'Venda'
            WHEN origem ILIKE '%GOOGLE ADS%' OR origem ILIKE '%GOOGLE%' THEN 'Google Ads'
            WHEN origem ILIKE '%FACEBOOK%' OR origem ILIKE '%META%' THEN 'Facebook Ads'
            WHEN origem ILIKE '%INSTAGRAM%' OR origem ILIKE '%IG%' THEN 'Instagram'
            WHEN origem ILIKE '%TIKTOK%' THEN 'TikTok'
            WHEN origem ILIKE '%LINKEDIN%' THEN 'LinkedIn'
            WHEN origem ILIKE '%EMAIL%' THEN 'Email Marketing'
            WHEN origem ILIKE '%WHATSAPP%' THEN 'WhatsApp'
            ELSE 'Outros'
          END
        ) = '${filters.origin}'`);
      }
      if (filters.scheduler) {
        whereClauses.push(`agendado_por = '${filters.scheduler}'`);
      }
    }

    return whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
  }

  async getOriginSummary(days?: number) {
    // Usar dados diretamente da tabela leads2 do Supabase com paginação
    try {
      const client = this.supabaseService.getClient();
      if (!client) {
        throw new Error('Cliente Supabase não inicializado');
      }

      const originCounts = new Map<string, number>();
      let from = 0;
      const pageSize = 1000;
      let hasMore = true;

      while (hasMore) {
        let query = client
          .from('leads2')
          .select('origem, datacriacao')
          .not('origem', 'is', null)
          .neq('origem', '')
          .range(from, from + pageSize - 1);

        if (days) {
          const startDate = new Date();
          startDate.setDate(startDate.getDate() - days);
          query = query.gte('datacriacao', startDate.toISOString());
        }

        const { data, error } = await query;
        if (error) {
          this.logger.error('Erro ao buscar dados de origem:', error);
          throw new Error(`Erro na consulta: ${error.message}`);
        }

        if (data && data.length > 0) {
          data.forEach(lead => {
            if (lead.origem) {
              originCounts.set(lead.origem, (originCounts.get(lead.origem) || 0) + 1);
            }
          });
          from += pageSize;
          hasMore = data.length === pageSize;
        } else {
          hasMore = false;
        }
      }

      const totalLeads = Array.from(originCounts.values()).reduce((s, v) => s + v, 0);
      const leadsByOrigin = Array.from(originCounts.entries()).map(([origin, count]) => ({
        origin_name: origin,
        lead_count: count
      }));

      return {
        kpis: {
          totalLeads,
          totalOrigins: originCounts.size,
          totalCampaigns: 0
        },
        leadsByOrigin,
        leadsByCampaign: []
      };
    } catch (error) {
      this.logger.error('Erro ao obter resumo de origem:', error);
      throw error;
    }
  }

  private async getSummaryByDimension(
    column: 'utm_campaign' | 'utm_source' | 'utm_content',
    startDate?: string,
    endDate?: string,
    days?: number,
    filters?: DashboardFilters,
  ): Promise<DrilldownItem[]> {
    const client = this.supabaseService.getClient();
    if (!client) {
      throw new Error('Supabase client not initialized');
    }

    const whereSql = this.buildWhereClause(startDate, endDate, days, filters);

    let sql = '';

    if (column === 'utm_campaign') {
      // Query específica para normalizar nomes de campanha
      sql = `
        SELECT
            normalized_campaign_name AS name,
            COUNT(chatid) AS value
        FROM (
            SELECT
                CASE
                    WHEN utm_campaign ILIKE 'DINASTIA |%|%' THEN
                        TRIM(split_part(utm_campaign, '|', 2))
                    ELSE utm_campaign
                END AS normalized_campaign_name,
                chatid
            FROM
                public.leads2
            ${whereSql ? whereSql + ' AND ' : 'WHERE '} utm_campaign IS NOT NULL AND utm_campaign <> ''
        ) AS subquery
        GROUP BY
            normalized_campaign_name
        ORDER BY
            value DESC;
      `;
    } else {
      sql = `
        SELECT ${column} AS name, COUNT(chatid) AS value
        FROM public.leads2
        ${whereSql ? whereSql + ' AND ' : 'WHERE '}${column} IS NOT NULL AND ${column} <> ''
        GROUP BY ${column}
        ORDER BY value DESC;
      `;
    }

    

    const counts = new Map<string, number>();
    const pageSize = 1000;
    let from = 0;
    let hasMore = true;
    while (hasMore) {
      let query: any = client
        .from('leads2')
        .select(`${column}, datacriacao, utm_campaign, utm_source, utm_content, classificacao_do_lead, agendado_por, origem`);
      if (typeof days === 'number' && days > 0) {
        const now = new Date();
        const start = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
        query = query.gte('datacriacao', start.toISOString());
      } else {
        if (startDate) query = query.gte('datacriacao', `${startDate}T00:00:00.000Z`);
        if (endDate) query = query.lte('datacriacao', `${endDate}T23:59:59.999Z`);
      }
      query = query.not(column as any, 'is', null).neq(column as any, '');
      query = query.range(from, from + pageSize - 1);
      const { data, error } = await query;
      if (error) {
        throw new Error(error.message);
      }
      const rows: any[] = data || [];
      const normalizeOrigin = (origin: string | null | undefined): string => {
        if (!origin || origin.trim() === '') return 'Sem Origem';
        const normalized = origin.toLowerCase().trim();
        if (normalized.includes('isca') && normalized.includes('scopeline')) return 'Isca Scopeline';
        if (normalized.includes('isca') && normalized.includes('hormozi')) return 'Isca Hormozi';
        if (normalized.includes('masterclass')) return 'Masterclass';
        if (normalized.includes('manychat')) return 'Manychat';
        if (normalized.includes('starter10k')) return 'Starter10k';
        if (normalized.includes('agendamento')) return 'Agendamento';
        if (normalized.includes('desafio')) return 'Desafio';
        if (normalized.includes('youtube') || normalized.includes('yt-')) return 'YouTube';
        if (normalized.includes('calendly')) return 'Calendly';
        if (normalized.includes('venda')) return 'Venda';
        if (normalized.includes('google ads') || normalized.includes('google')) return 'Google Ads';
        if (normalized.includes('facebook') || normalized.includes('meta')) return 'Facebook Ads';
        if (normalized.includes('instagram')) return 'Instagram';
        if (normalized.includes('linkedin')) return 'LinkedIn';
        if (normalized.includes('tiktok')) return 'TikTok';
        if (normalized.includes('whatsapp')) return 'WhatsApp';
        if (normalized.includes('email')) return 'Email Marketing';
        return 'Outros';
      };
      for (const row of rows) {
        // Aplicar filtros manualmente no fallback
        if (filters) {
          if (filters.source && String(row.utm_source || '').trim() !== String(filters.source).trim()) continue;
          if (filters.content && String(row.utm_content || '').trim() !== String(filters.content).trim()) continue;
          if (filters.classification && String(row.classificacao_do_lead || '').trim() !== String(filters.classification).trim()) continue;
          if (filters.scheduler && row.agendado_por !== filters.scheduler) continue;
          if (filters.origin) {
            const o = normalizeOrigin(row.origem);
            if (o !== filters.origin) continue;
          }

          if (filters.campaign) {
            let camp = row.utm_campaign || '';
            if (camp && typeof camp === 'string' && camp.toUpperCase().startsWith('DINASTIA |') && camp.split('|').length >= 3) {
              const parts = camp.split('|');
              if (parts.length >= 2) camp = parts[1].trim();
            }
            if (camp !== filters.campaign) continue;
          }
        }

        let name = (row as any)[column] ?? '';

        // Normalização no fallback para campanhas
        if (column === 'utm_campaign' && name && typeof name === 'string') {
          // Verifica se segue o padrão DINASTIA | ... | ...
          if (name.toUpperCase().startsWith('DINASTIA |') && name.split('|').length >= 3) {
            const parts = name.split('|');
            if (parts.length >= 2) {
              name = parts[1].trim();
            }
          }
        }

        counts.set(name, (counts.get(name) || 0) + 1);
      }
      if (rows.length < pageSize) {
        hasMore = false;
      } else {
        from += pageSize;
      }
    }
    return Array.from(counts.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }

  async getSummaryByCampaign(
    startDate?: string,
    endDate?: string,
    days?: number,
    filters?: DashboardFilters,
  ): Promise<DrilldownItem[]> {
    return this.getSummaryByDimension('utm_campaign', startDate, endDate, days, filters);
  }

  async getSummaryBySource(
    startDate?: string,
    endDate?: string,
    days?: number,
    filters?: DashboardFilters,
  ): Promise<DrilldownItem[]> {
    return this.getSummaryByDimension('utm_source', startDate, endDate, days, filters);
  }

  async getSummaryByContent(
    startDate?: string,
    endDate?: string,
    days?: number,
    filters?: DashboardFilters,
  ): Promise<DrilldownItem[]> {
    return this.getSummaryByDimension('utm_content', startDate, endDate, days, filters);
  }

  async getFunnelBreakdownForOrigin(origin: string, days?: number): Promise<{ status: string; count: number }[]> {
    // Método removido - dados agora vêm do N8N
    return [];
  }

  // Método getCampaignSummaryFromPxLeads removido - não há campanhas na tabela leads2

  async getDailyLeadVolume(
    startDate?: string,
    endDate?: string,
    days?: number,
    filters?: DashboardFilters
  ): Promise<DailyLeadVolumeData[]> {
    try {
      this.logger.log(`Buscando dados de volume diário de leads com filtros: ${JSON.stringify(filters)}, days: ${days}, start: ${startDate}, end: ${endDate}`);

      const client = this.supabaseService.getClient();
      if (!client) throw new Error('Cliente Supabase não inicializado');

      const whereSql = this.buildWhereClause(startDate, endDate, days, filters);
      this.logger.log(`Generated WHERE clause: ${whereSql}`);

      const sql = `
        SELECT 
          DATE_TRUNC('day', datacriacao)::date AS day, 
          COUNT(chatid) AS total_leads_per_day 
        FROM 
          public.leads2 
        ${whereSql}
        GROUP BY 
          day 
        ORDER BY 
          day ASC
      `;

      this.logger.log(`Executing SQL: ${sql}`);

      const { data, error } = await client.rpc('execute_sql', { query: sql });

      if (!error && data) {
        this.logger.log(`Daily Volume Data found: ${data.length} rows`);
        return (data || []).map((row: any) => ({
          day: row.day,
          total_leads_per_day: parseInt(row.total_leads_per_day, 10)
        }));
      }

      // Fallback logic if RPC fails (simplified for brevity, ideally should also filter)
      // For now, returning empty or basic fallback if RPC fails is acceptable as we rely on RPC for complex filtering
      this.logger.warn('RPC falhou ou retornou vazio, tentando fallback simplificado (sem filtros avançados)');
      return await this.getDailyLeadVolumeFallback(startDate, endDate, days, filters);

    } catch (error) {
      this.logger.error('Erro ao buscar dados de volume diário:', error);
      throw error;
    }
  }

  private async getDailyLeadVolumeLastDays(days: number): Promise<DailyLeadVolumeData[]> {
    try {
      this.logger.log(`Buscando volume diário de leads para últimos ${days} dias(apenas leads2) com paginação`);

      const client = this.supabaseService.getClient();
      if (!client) {
        throw new Error('Cliente Supabase não inicializado');
      }

      const now = new Date();
      const windowStart = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

      const allLeads2Data: any[] = [];
      let from = 0;
      const pageSize = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await client
          .from('leads2')
          .select('datacriacao')
          .gte('datacriacao', windowStart.toISOString())
          .lte('datacriacao', now.toISOString())
          .range(from, from + pageSize - 1);

        if (error) {
          this.logger.error('Erro ao buscar dados de leads2:', error);
          throw new Error(`Erro na consulta leads2: ${error.message} `);
        }

        if (data && data.length > 0) {
          allLeads2Data.push(...data);
          from += pageSize;
          hasMore = data.length === pageSize;
        } else {
          hasMore = false;
        }
      }

      const dailyCounts = new Map<string, number>();
      allLeads2Data.forEach((lead: any) => {
        const date = new Date(lead.datacriacao);
        const day = date.toISOString().split('T')[0];
        dailyCounts.set(day, (dailyCounts.get(day) || 0) + 1);
      });

      return Array.from(dailyCounts.entries())
        .map(([day, total_leads_per_day]) => ({ day, total_leads_per_day }))
        .sort((a, b) => a.day.localeCompare(b.day));
    } catch (error) {
      this.logger.error('Erro na query de últimos dias do volume diário:', error);
      throw error;
    }
  }

  private async getDailyLeadVolumeFallback(
    startDate?: string,
    endDate?: string,
    days?: number,
    filters?: DashboardFilters
  ): Promise<DailyLeadVolumeData[]> {
    try {
      this.logger.log('Buscando volume diário de leads exclusivamente da tabela leads2 com SQL puro');

      const client = this.supabaseService.getClient();
      if (!client) {
        throw new Error('Cliente Supabase não inicializado');
      }

      const whereSql = this.buildWhereClause(startDate, endDate, days, filters);
      const sqlQuery = `
        SELECT
          DATE_TRUNC('day', datacriacao)::date AS day,
          COUNT(chatid) AS total_leads_per_day
        FROM public.leads2
        ${whereSql ? whereSql + ' AND datacriacao IS NOT NULL' : 'WHERE datacriacao IS NOT NULL'}
        GROUP BY day 
        ORDER BY day ASC`;

      // Tentar usar execute_sql primeiro
      try {
        const { data, error } = await client.rpc('execute_sql', { query: sqlQuery });

        if (!error && data) {
          this.logger.log(`Query SQL retornou ${data.length} registros de volume diário`);
          return data;
        }
      } catch (rpcError) {
        this.logger.warn('Função execute_sql não disponível, usando fallback manual');
      }

      // Fallback manual usando apenas leads2 com filtros
      return await this.getDailyLeadVolumeDirectQuery(startDate, endDate, days, filters);

    } catch (error) {
      this.logger.error('Erro ao buscar volume diário de leads:', error);
      throw error;
    }
  }

  /**
   * Query direta para buscar volume diário usando apenas leads2
   * Método simplificado sem ajustes de fuso horário
   */
  private async getDailyLeadVolumeDirectQuery(
    startDate?: string,
    endDate?: string,
    days?: number,
    filters?: DashboardFilters
  ): Promise<DailyLeadVolumeData[]> {
    try {
      this.logger.log('Usando query direta para volume diário de leads (apenas leads2) com paginação');

      const client = this.supabaseService.getClient();
      if (!client) {
        throw new Error('Cliente Supabase não inicializado');
      }

      // Buscar TODOS os dados de leads2 com paginação
      const allLeads2Data: any[] = [];
      let from = 0;
      const pageSize = 1000;
      let hasMore = true;

      this.logger.log('Iniciando paginação para tabela leads2...');
      while (hasMore) {
        let query = client
          .from('leads2')
          .select('datacriacao, utm_campaign, utm_source, utm_content, classificacao_do_lead, agendado_por')
          .not('datacriacao', 'is', null);

        if (typeof days === 'number' && days > 0) {
          const start = new Date();
          start.setDate(start.getDate() - days);
          query = query.gte('datacriacao', start.toISOString());
        } else {
          if (startDate) {
            query = query.gte('datacriacao', `${startDate}T00:00:00.000Z`);
          }
          if (endDate) {
            query = query.lte('datacriacao', `${endDate}T23:59:59.999Z`);
          }
        }

        query = query.range(from, from + pageSize - 1);

        const { data, error } = await query;

        if (error) {
          this.logger.error('Erro ao buscar dados de leads2:', error);
          throw new Error(`Erro na consulta leads2: ${error.message} `);
        }

        if (data && data.length > 0) {
          allLeads2Data.push(...data);
          from += pageSize;
          hasMore = data.length === pageSize;
          this.logger.log(`Coletados ${allLeads2Data.length} registros de leads2 até agora...`);
        } else {
          hasMore = false;
        }
      }

      this.logger.log(`Total de registros coletados da leads2: ${allLeads2Data.length} `);

      // Agregar os dados manualmente por dia (sem ajuste de fuso horário)
      const dailyCounts = new Map<string, number>();

      const normalizeCampaign = (campaign: string | null | undefined): string | null => {
        if (!campaign) return null;
        const val = campaign.toString();
        if (/^DINASTIA \|.*\|.*$/.test(val)) {
          const parts = val.split('|');
          return parts[1]?.trim() || val;
        }
        return val;
      };

      allLeads2Data.forEach((lead: any) => {
        const normalizedCampaign = normalizeCampaign(lead.utm_campaign);
        if (filters?.campaign && normalizedCampaign !== filters.campaign) return;
        if (filters?.source && (String(lead.utm_source || '').trim()) !== String(filters.source).trim()) return;
        if (filters?.content && (String(lead.utm_content || '').trim()) !== String(filters.content).trim()) return;
        if (filters?.classification && (lead.classificacao_do_lead || '').trim() !== filters.classification) return;
        if (filters?.scheduler && (lead.agendado_por || '') !== filters.scheduler) return;

        const date = new Date(lead.datacriacao);
        const day = date.toISOString().split('T')[0];
        dailyCounts.set(day, (dailyCounts.get(day) || 0) + 1);
      });

      // Converter para array e ordenar
      const result: DailyLeadVolumeData[] = Array.from(dailyCounts.entries())
        .map(([day, total_leads_per_day]) => ({
          day,
          total_leads_per_day
        }))
        .sort((a, b) => a.day.localeCompare(b.day));

      const totalLeads = result.reduce((sum, item) => sum + item.total_leads_per_day, 0);
      this.logger.log(`Query direta com paginação retornando ${result.length} registros de volume diário com total de ${totalLeads} leads(apenas leads2)`);
      return result;

    } catch (error) {
      this.logger.error('Erro na query direta de volume diário:', error);
      throw error;
    }
  }

  /**
   * Busca resumo dos KPIs de agendamento
   * Calcula total de leads, total de agendamentos e taxa de agendamento
   */
  async getSchedulingSummary(
    startDate?: string,
    endDate?: string,
    days?: number,
    filters?: DashboardFilters
  ): Promise<SchedulingSummaryData> {
    try {
      this.logger.log('Buscando resumo de KPIs de agendamento com filtros');

      const client = this.supabaseService.getClient();
      if (!client) throw new Error('Cliente Supabase não inicializado');

      const whereSql = this.buildWhereClause(startDate, endDate, days, filters);

      // Total Leads Query
      const leadsSql = `SELECT COUNT(*) as count FROM public.leads2 ${whereSql}`;

      // Appointments Query (adds extra condition)
      const apptWhereSql = whereSql ? `${whereSql} AND data_do_agendamento IS NOT NULL` : `WHERE data_do_agendamento IS NOT NULL`;
      const apptSql = `SELECT COUNT(*) as count FROM public.leads2 ${apptWhereSql}`;

      const [leadsResult, apptResult] = await Promise.all([
        client.rpc('execute_sql', { query: leadsSql }),
        client.rpc('execute_sql', { query: apptSql })
      ]);

      const totalLeads = leadsResult.data?.[0]?.count || 0;
      const totalAppointments = apptResult.data?.[0]?.count || 0;
      const schedulingRate = totalLeads > 0 ? totalAppointments / totalLeads : 0;

      return {
        totalLeads,
        totalAppointments,
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
    endDate?: string,
    days?: number,
    filters?: DashboardFilters
  ): Promise<DailyAppointmentsData[]> {
    try {
      const periodInfo = startDate || endDate ? ` (${startDate || 'início'} até ${endDate || 'fim'})` : '';
      this.logger.log(`Buscando volume diário de agendamentos${periodInfo} com filtros`);

      const client = this.supabaseService.getClient();
      if (!client) {
        throw new Error('Cliente Supabase não inicializado');
      }

      // Usar expressão de timestamp para a coluna de data
      const dateCol = "to_timestamp(data_do_agendamento, 'DD/MM/YYYY, HH24:MI:SS')";
      const whereSql = this.buildWhereClause(startDate, endDate, days, filters, dateCol);

      const sql = `
        SELECT 
          DATE_TRUNC('day', ${dateCol})::date AS day,
          COUNT(*) AS appointments_per_day
        FROM public.leads2
        ${whereSql ? whereSql + " AND data_do_agendamento IS NOT NULL AND data_do_agendamento <> ''" : "WHERE data_do_agendamento IS NOT NULL AND data_do_agendamento <> ''"}
        GROUP BY day 
        ORDER BY day ASC
      `;

      this.logger.log(`Executando query de agendamentos diários: ${sql}`);

      const { data, error } = await client.rpc('execute_sql', { query: sql });

      if (error) {
        this.logger.error('Erro ao executar query de agendamentos diários:', error);
        return await this.getDailyAppointmentsFallback(startDate, endDate, days, filters);
      }

      if (!data || data.length === 0) {
        this.logger.warn('Query de agendamentos retornou vazio, utilizando fallback para processamento manual');
        return await this.getDailyAppointmentsFallback(startDate, endDate, days, filters);
      }

      const appointmentsData: DailyAppointmentsData[] = (data || []).map((row: any) => ({
        day: row.day,
        appointments_per_day: parseInt(row.appointments_per_day, 10)
      }));

      return this.fillDateGapsForAppointments(appointmentsData, startDate, endDate);

    } catch (error) {
      this.logger.error('Erro ao buscar agendamentos diários:', error);
      throw error;
    }
  }

  async getAppointmentsByPerson(
    startDate?: string,
    endDate?: string,
    days?: number,
    filters?: DashboardFilters
  ): Promise<Array<{ day: string; agendado_por: string; appointment_count: number }>> {
    try {
      const client = this.supabaseService.getClient();
      if (!client) {
        throw new Error('Supabase client not initialized');
      }

      const dateCol = "to_timestamp(data_do_agendamento, 'DD/MM/YYYY, HH24:MI:SS')";
      const whereSql = this.buildWhereClause(startDate, endDate, days, filters, dateCol);

      const sql = `
        SELECT 
          DATE_TRUNC('day', ${dateCol})::date AS day,
          agendado_por,
          COUNT(chatid) AS appointment_count
        FROM public.leads2
        ${whereSql ? whereSql + " AND agendado_por IS NOT NULL AND TRIM(agendado_por) <> '' AND data_do_agendamento IS NOT NULL AND TRIM(data_do_agendamento) <> ''" : "WHERE agendado_por IS NOT NULL AND TRIM(agendado_por) <> '' AND data_do_agendamento IS NOT NULL AND TRIM(data_do_agendamento) <> ''"}
        GROUP BY day, agendado_por
        ORDER BY day ASC, appointment_count DESC
      `;

      const { data, error } = await client.rpc('execute_sql', { query: sql });
      if (!error && Array.isArray(data)) {
        return (data || []).map((row: any) => ({
          day: row.day,
          agendado_por: row.agendado_por,
          appointment_count: parseInt(row.appointment_count, 10)
        }));
      }

      // Fallback manual com paginação
      const allData: any[] = [];
      let from = 0;
      const pageSize = 1000;
      let hasMore = true;
      while (hasMore) {
        let q = client
          .from('leads2')
          .select('agendado_por, data_do_agendamento, chatid, utm_campaign, utm_source, utm_content, classificacao_do_lead')
          .not('agendado_por', 'is', null)
          .neq('agendado_por', '')
          .not('data_do_agendamento', 'is', null)
          .neq('data_do_agendamento', '');
        q = q.range(from, from + pageSize - 1);
        const { data: page, error: pageErr } = await q;
        if (pageErr) {
          this.logger.error('Erro no fallback manual de agendamentos por pessoa:', pageErr);
          break;
        }
        if (page && page.length > 0) {
          allData.push(...page);
          from += pageSize;
          hasMore = page.length === pageSize;
        } else {
          hasMore = false;
        }
      }

      const startTs = startDate ? new Date(`${startDate}T00:00:00.000Z`).getTime() : undefined;
      const endTs = endDate ? new Date(`${endDate}T23:59:59.999Z`).getTime() : undefined;
      const counts = new Map<string, number>();
      const normalizeCampaign = (campaign: string | null | undefined): string | null => {
        if (!campaign) return null;
        const val = campaign.toString();
        if (/^DINASTIA \|.*\|.*$/.test(val)) {
          const parts = val.split('|');
          return parts[1]?.trim() || val;
        }
        return val;
      };

      for (const row of allData) {
        const normalizedCampaign = normalizeCampaign(row.utm_campaign);
        if (filters?.campaign && normalizedCampaign !== filters.campaign) continue;
        if (filters?.source && (row.utm_source || '') !== filters.source) continue;
        if (filters?.content && (row.utm_content || '') !== filters.content) continue;
        if (filters?.classification && (row.classificacao_do_lead || '').trim() !== filters.classification) continue;
        const person = String(row.agendado_por).trim();
        if (!person) continue;
        const dt = this.parseBrazilianDateTime(String(row.data_do_agendamento));
        if (!dt || isNaN(dt.getTime())) continue;
        const t = dt.getTime();
        if (typeof days === 'number' && days > 0) {
          const now = new Date();
          const windowStart = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
          if (dt < windowStart || dt > now) continue;
        } else {
          if (startTs && t < startTs) continue;
          if (endTs && t > endTs) continue;
        }
        const dayKey = dt.toISOString().split('T')[0];
        const key = `${dayKey}|${person}`;
        counts.set(key, (counts.get(key) || 0) + 1);
      }

      return Array.from(counts.entries()).map(([key, count]) => {
        const sep = key.indexOf('|');
        const day = sep >= 0 ? key.slice(0, sep) : key;
        const agendado_por = sep >= 0 ? key.slice(sep + 1) : '';
        return { day, agendado_por, appointment_count: count };
      }).sort((a, b) => a.day.localeCompare(b.day) || b.appointment_count - a.appointment_count);
    } catch (error) {
      this.logger.error('Erro ao buscar agendamentos por pessoa:', error);
      throw error;
    }
  }

  async getAppointmentsByPersonPerDay(
    startDate?: string,
    endDate?: string,
    days?: number,
    filters?: DashboardFilters
  ): Promise<AppointmentsByPersonPerDayData[]> {
    try {
      const client = this.supabaseService.getClient();
      if (!client) {
        throw new Error('Supabase client not initialized');
      }

      const dateCol = "to_timestamp(data_do_agendamento, 'DD/MM/YYYY, HH24:MI:SS')";
      const whereSql = this.buildWhereClause(startDate, endDate, days, filters, dateCol);

      const sql = `
        SELECT 
          DATE_TRUNC('day', ${dateCol})::date AS day,
          agendado_por,
          COUNT(chatid) AS appointment_count
        FROM public.leads2
        ${whereSql ? whereSql + " AND agendado_por IS NOT NULL AND TRIM(agendado_por) <> '' AND data_do_agendamento IS NOT NULL AND TRIM(data_do_agendamento) <> ''" : "WHERE agendado_por IS NOT NULL AND TRIM(agendado_por) <> '' AND data_do_agendamento IS NOT NULL AND TRIM(data_do_agendamento) <> ''"}
        GROUP BY day, agendado_por
        ORDER BY day ASC, appointment_count DESC
      `;

      const { data, error } = await client.rpc('execute_sql', { query: sql });

      if (error) {
        this.logger.error('Erro ao buscar agendamentos por pessoa por dia:', error);
        throw error;
      }

      // Transformar os dados para o formato esperado pelo frontend (agrupado por dia)
      const groupedData = new Map<string, any>();

      data?.forEach((row: any) => {
        const day = row.day;
        if (!groupedData.has(day)) {
          groupedData.set(day, { day });
        }
        const entry = groupedData.get(day);
        const person = row.agendado_por || 'Desconhecido';
        entry[person] = parseInt(row.appointment_count, 10);
      });

      return Array.from(groupedData.values()).sort((a, b) => a.day.localeCompare(b.day));

    } catch (error) {
      this.logger.error('Erro ao buscar agendamentos por pessoa por dia:', error);
      throw error;
    }
  }

  /**
   * Fallback para buscar agendamentos diários quando execute_sql não está disponível
   * Processa os dados no lado da aplicação com lógica unificada de ambas as tabelas
   */
  private async getDailyAppointmentsFallback(
    startDate?: string,
    endDate?: string,
    days?: number,
    filters?: DashboardFilters
  ): Promise<DailyAppointmentsData[]> {
    try {
      this.logger.log('Usando fallback para agendamentos diários apenas da tabela leads2 (sem deduplicação)');

      const client = this.supabaseService.getClient();
      if (!client) {
        throw new Error('Cliente Supabase não inicializado');
      }

      // Paginar agendamentos da tabela leads2 para evitar limites
      const leads2Data: any[] = [];
      let from = 0;
      const pageSize = 1000;
      let hasMore = true;
      while (hasMore) {
        let q = client
          .from('leads2')
          .select('data_do_agendamento, utm_campaign, utm_source, utm_content, classificacao_do_lead, agendado_por')
          .not('data_do_agendamento', 'is', null)
          .neq('data_do_agendamento', '')
          .order('data_do_agendamento', { ascending: true })
          .range(from, from + pageSize - 1);

        const { data: page, error: pageErr } = await q;
        if (pageErr) {
          this.logger.error('Erro ao buscar leads2 no fallback:', pageErr);
          break;
        }
        if (page && page.length > 0) {
          leads2Data.push(...page);
          from += pageSize;
          hasMore = page.length === pageSize;
        } else {
          hasMore = false;
        }
      }

      const totalRecords = leads2Data.length;
      if (totalRecords === 0) {
        this.logger.warn('Nenhum dado de agendamentos encontrado no fallback');
        return [];
      }

      this.logger.log(`Processando ${totalRecords} registros de agendamentos no fallback unificado`);

      const dailyCounts = new Map<string, number>();
      let validDatesCount = 0;
      let invalidDatesCount = 0;

      // Processar dados do leads2
      const normalizeCampaign = (campaign: string | null | undefined): string | null => {
        if (!campaign) return null;
        const val = campaign.toString();
        if (/^DINASTIA \|.*\|.*$/.test(val)) {
          const parts = val.split('|');
          return parts[1]?.trim() || val;
        }
        return val;
      };

      (leads2Data || []).forEach((appointment: any) => {
        const normalizedCampaign = normalizeCampaign(appointment.utm_campaign);
        if (filters?.campaign && normalizedCampaign !== filters.campaign) return;
        if (filters?.source && (appointment.utm_source || '') !== filters.source) return;
        if (filters?.content && (appointment.utm_content || '') !== filters.content) return;
        if (filters?.classification && (appointment.classificacao_do_lead || '').trim() !== filters.classification) return;
        if (filters?.scheduler && (appointment.agendado_por || '') !== filters.scheduler) return;
        try {
          const dateStr = appointment.data_do_agendamento;
          if (!dateStr) { invalidDatesCount++; return; }
          let ts: Date | null = null;
          if (typeof days === 'number' && days > 0) {
            ts = this.parseBrazilianDateTime(dateStr);
            if (!ts || isNaN(ts.getTime())) { invalidDatesCount++; return; }
            const now = new Date();
            const windowStart = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
            if (ts < windowStart || ts > now) return;
            const dayKey = ts.toISOString().split('T')[0];
            dailyCounts.set(dayKey, (dailyCounts.get(dayKey) || 0) + 1);
            validDatesCount++;
          } else {
            const dayKey = this.parseBrazilianDate(dateStr);
            if (dayKey) {
              if (startDate && dayKey < startDate) return;
              if (endDate && dayKey > endDate) return;
              dailyCounts.set(dayKey, (dailyCounts.get(dayKey) || 0) + 1);
              validDatesCount++;
            } else {
              invalidDatesCount++;
            }
          }
        } catch (error) {
          this.logger.warn(`Erro ao processar data leads2 no fallback: ${appointment.data_do_agendamento}`, error);
          invalidDatesCount++;
        }
      });

      this.logger.log(`Fallback processou ${validDatesCount} datas válidas e ignorou ${invalidDatesCount} datas inválidas`);

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
      throw error;
    }
  }

  /**
   * Preenche lacunas de datas com 0 agendamentos para garantir que todos os dias do período sejam incluídos
   * Só preenche a partir do primeiro registro real para evitar dados zerados desnecessários
   */
  private fillDateGapsForAppointments(appointmentsData: DailyAppointmentsData[], startDate?: string, endDate?: string): DailyAppointmentsData[] {
    // Se não temos startDate e endDate, retornar os dados originais
    if (!startDate || !endDate) {
      return appointmentsData;
    }

    // Se não há dados, retornar array vazio
    if (appointmentsData.length === 0) {
      return [];
    }

    try {
      // Criar um mapa dos dados existentes para acesso rápido
      const dataMap = new Map<string, number>();
      appointmentsData.forEach(item => {
        dataMap.set(item.day, item.appointments_per_day);
      });

      // Encontrar a primeira e última data com dados reais
      const sortedData = appointmentsData.sort((a, b) => a.day.localeCompare(b.day));
      const firstDataDate = new Date(sortedData[0].day);
      const lastDataDate = new Date(sortedData[sortedData.length - 1].day);

      // Usar a data mais restritiva entre o filtro e os dados reais
      const effectiveStartDate = new Date(Math.max(new Date(startDate).getTime(), firstDataDate.getTime()));
      const effectiveEndDate = new Date(Math.min(new Date(endDate).getTime(), lastDataDate.getTime()));

      // Se a data de início efetiva é maior que a de fim, não há dados no período
      if (effectiveStartDate > effectiveEndDate) {
        return [];
      }

      const result: DailyAppointmentsData[] = [];

      // Gerar datas apenas no período efetivo (do primeiro ao último registro real)
      for (let date = new Date(effectiveStartDate); date <= effectiveEndDate; date.setDate(date.getDate() + 1)) {
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

  private parseBrazilianDateTime(dateStr: string): Date | null {
    try {
      const m = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4}),\s*(\d{1,2}):(\d{2}):(\d{2})/);
      if (m) {
        const [, d, mo, y, h, mi, s] = m;
        const dt = new Date(parseInt(y), parseInt(mo) - 1, parseInt(d), parseInt(h), parseInt(mi), parseInt(s));
        if (!isNaN(dt.getTime())) return dt;
      }
      const alt = new Date(dateStr);
      if (!isNaN(alt.getTime())) return alt;
      return null;
    } catch {
      return null;
    }
  }

  async getUnifiedOriginSummary(
    days?: number,
    fromDate?: Date,
    toDate?: Date,
    filters?: DashboardFilters
  ): Promise<UnifiedOriginSummaryData[]> {
    try {
      this.logger.log('Buscando dados de origem dos leads exclusivamente da tabela leads2 com filtros...');

      const client = this.supabaseService.getClient();
      if (!client) {
        throw new Error('Supabase client not initialized');
      }

      // Converter datas para string se existirem, para usar no buildWhereClause
      const startDateStr = fromDate ? fromDate.toISOString().split('T')[0] : undefined;
      const endDateStr = toDate ? toDate.toISOString().split('T')[0] : undefined;

      const whereSql = this.buildWhereClause(startDateStr, endDateStr, days, filters);

      // Tentar usar a função execute_sql primeiro
      try {
        const sql = `
          SELECT
            normalized_origin AS origin_name,
            COUNT(chatid) AS lead_count
          FROM (
            SELECT
              CASE
                WHEN origem ILIKE '%ISCA SCOPELINE%' THEN 'Isca Scopeline'
                WHEN origem ILIKE '%ISCA HORMOZI%' THEN 'Isca Hormozi'
                WHEN origem ILIKE '%MASTERCLASS%' THEN 'Masterclass'
                WHEN origem ILIKE '%MANYCHAT%' THEN 'Manychat'
                WHEN origem ILIKE '%STARTER10K%' THEN 'Starter10k'
                WHEN origem ILIKE '%AGENDAMENTO%' THEN 'Agendamento'
                WHEN origem ILIKE '%DESAFIO%' THEN 'Desafio'
                WHEN origem ILIKE '%YOUTUBE%' OR origem ILIKE '%YT-%' THEN 'YouTube'
                WHEN origem ILIKE '%CALENDLY%' THEN 'Calendly'
                WHEN origem ILIKE '%VENDA%' THEN 'Venda'
                WHEN origem ILIKE '%GOOGLE ADS%' OR origem ILIKE '%GOOGLE%' THEN 'Google Ads'
                WHEN origem ILIKE '%FACEBOOK%' OR origem ILIKE '%META%' THEN 'Facebook Ads'
                WHEN origem ILIKE '%INSTAGRAM%' OR origem ILIKE '%IG%' THEN 'Instagram'
                WHEN origem ILIKE '%TIKTOK%' THEN 'TikTok'
                WHEN origem ILIKE '%LINKEDIN%' THEN 'LinkedIn'
                WHEN origem ILIKE '%EMAIL%' THEN 'Email Marketing'
                WHEN origem ILIKE '%WHATSAPP%' THEN 'WhatsApp'
                ELSE 'Outros'
              END AS normalized_origin,
              chatid
            FROM public.leads2
            ${whereSql ? whereSql + ' AND ' : 'WHERE '} origem IS NOT NULL AND origem <> ''
          ) AS sub
          GROUP BY normalized_origin
          ORDER BY lead_count DESC;
        `;

        const { data, error } = await client.rpc('execute_sql', { query: sql });
        if (!error && Array.isArray(data)) {
          this.logger.log(`Query SQL executada com sucesso. Retornando ${data.length} categorias de origem.`);
          return (data || []).map((row: any) => ({ origin_name: row.origin_name || row.normalized_origin, lead_count: parseInt(row.lead_count, 10) }));
        } else {
          this.logger.warn('Função execute_sql não disponível ou retornou erro. Usando fallback manual.');
        }
      } catch (sqlError) {
        this.logger.warn('Erro ao executar query SQL direta. Usando fallback manual:', sqlError);
      }

      // Fallback manual: buscar dados e processar em JavaScript
      this.logger.log('Executando fallback manual para buscar dados de origem...');

      const allData: any[] = [];
      let from = 0;
      const pageSize = 1000;
      let hasMore = true;

      while (hasMore) {
        let query = client
          .from('leads2')
          .select('origem, datacriacao, utm_campaign, utm_source, utm_content, classificacao_do_lead');

        if (days && days > 0) {
          const startDate = new Date();
          startDate.setDate(startDate.getDate() - days);
          query = query.gte('datacriacao', startDate.toISOString());
        } else {
          if (fromDate) {
            query = query.gte('datacriacao', fromDate.toISOString());
          }
          if (toDate) {
            query = query.lte('datacriacao', toDate.toISOString());
          }
        }

        query = query.range(from, from + pageSize - 1);

        const { data, error } = await query;

        if (error) {
          this.logger.error('Erro ao buscar dados de leads2:', error);
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

      // Função para normalizar nomes de origem (mantendo a mesma lógica da query SQL)
      const normalizeOrigin = (origin: string | null | undefined): string => {
        if (!origin || origin.trim() === '') return 'Sem Origem';

        const normalized = origin.toLowerCase().trim();

        if (normalized.includes('isca') && normalized.includes('scopeline')) {
          return 'Isca Scopeline';
        }
        if (normalized.includes('isca') && normalized.includes('hormozi')) {
          return 'Isca Hormozi';
        }
        if (normalized.includes('masterclass')) {
          return 'Masterclass';
        }
        if (normalized.includes('manychat')) {
          return 'Manychat';
        }
        if (normalized.includes('starter10k')) {
          return 'Starter10k';
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
        if (normalized.includes('dinastia')) {
          return origin.trim();
        }

        return 'Outros';
      };

      // Processar dados e agrupar por origem normalizada
      const originCounts = new Map<string, number>();

      const normalizeCampaign = (campaign: string | null | undefined): string | null => {
        if (!campaign) return null;
        const val = campaign.toString();
        if (/^DINASTIA \|.*\|.*$/.test(val)) {
          const parts = val.split('|');
          return parts[1]?.trim() || val;
        }
        return val;
      };

      allData.forEach(lead => {
        const normalizedOrigin = normalizeOrigin(lead.origem);
        const normalizedCampaign = normalizeCampaign(lead.utm_campaign);
        if (filters?.source && normalizedOrigin !== filters.source) return;
        if (filters?.classification && (lead.classificacao_do_lead || '').trim() !== filters.classification) return;
        if (filters?.campaign && normalizedCampaign !== filters.campaign) return;
        if (filters?.content && (lead.utm_content || '') !== filters.content) return;
        originCounts.set(normalizedOrigin, (originCounts.get(normalizedOrigin) || 0) + 1);
      });

      // Converter Map para array e ordenar por lead_count
      const result: UnifiedOriginSummaryData[] = Array.from(originCounts.entries())
        .map(([origin_name, lead_count]) => ({
          origin_name,
          lead_count
        }))
        .sort((a, b) => b.lead_count - a.lead_count);

      this.logger.log(`Fallback manual concluído. Retornando ${result.length} categorias de origem.`);
      return result;

    } catch (error) {
      this.logger.error('Erro ao buscar dados de origem dos leads:', error);
      throw error;
    }
  }

  async getLeadsByClassification(
    startDate?: string,
    endDate?: string,
    days?: number,
    filters?: DashboardFilters
  ): Promise<LeadsByClassificationData[]> {
    try {
      const client = this.supabaseService.getClient();
      if (!client) {
        throw new Error('Supabase client not initialized');
      }

      const whereSql = this.buildWhereClause(startDate, endDate, days, filters);

      const sql = `
        SELECT 
          TRIM(classificacao_do_lead) AS classification_name,
          COUNT(*) AS lead_count
        FROM public.leads2
        ${whereSql ? whereSql + " AND classificacao_do_lead IS NOT NULL AND TRIM(classificacao_do_lead) ~ '^[A-Za-z]$'" : "WHERE classificacao_do_lead IS NOT NULL AND TRIM(classificacao_do_lead) ~ '^[A-Za-z]$'"}
        GROUP BY TRIM(classificacao_do_lead)
        ORDER BY lead_count DESC;
      `;

      const { data, error } = await client.rpc('execute_sql', { query: sql });

      if (!error && data && Array.isArray(data)) {
        return data.map((row: any) => ({
          classification_name: row.classification_name,
          lead_count: parseInt(row.lead_count, 10)
        }));
      }

      // Fallback: buscar e processar manualmente com paginação
      this.logger.warn('RPC para classificação de leads falhou, usando fallback manual com paginação.');

      const allItems: { classificacao_do_lead: string | null; utm_campaign?: string | null; utm_source?: string | null; utm_content?: string | null; agendado_por?: string | null }[] = [];
      let from = 0;
      const pageSize = 1000;
      let hasMore = true;

      while (hasMore) {
        let fallbackQuery = client
          .from('leads2')
          .select('classificacao_do_lead, datacriacao, utm_campaign, utm_source, utm_content, agendado_por');

        if (days && days > 0) {
          const startDate = new Date();
          startDate.setDate(startDate.getDate() - days);
          fallbackQuery = fallbackQuery.gte('datacriacao', startDate.toISOString());
        } else {
          if (startDate) fallbackQuery = fallbackQuery.gte('datacriacao', `${startDate}T00:00:00.000Z`);
          if (endDate) fallbackQuery = fallbackQuery.lte('datacriacao', `${endDate}T23:59:59.999Z`);
        }

        const { data, error } = await fallbackQuery.range(from, from + pageSize - 1);

        if (error) {
          this.logger.error('Erro no fallback de classificação de leads durante a paginação:', error);
          return []; // Falha na paginação, retorna vazio
        }

        if (data && data.length > 0) {
          allItems.push(...data);
          from += pageSize;
        } else {
          hasMore = false;
        }

        if (!data || data.length < pageSize) {
          hasMore = false;
        }
      }

      const counts = new Map<string, number>();
      const singleLetterRegex = /^[A-Za-z]$/;
      const normalizeCampaign = (campaign: string | null | undefined): string | null => {
        if (!campaign) return null;
        const val = campaign.toString();
        if (/^DINASTIA \|.*\|.*$/.test(val)) {
          const parts = val.split('|');
          return parts[1]?.trim() || val;
        }
        return val;
      };

      allItems.forEach(item => {
        const classification = item.classificacao_do_lead?.trim();
        if (!classification || !singleLetterRegex.test(classification)) return;

        const normalizedCampaign = normalizeCampaign(item.utm_campaign);
        if (filters?.campaign && normalizedCampaign !== filters.campaign) return;
        if (filters?.source && (item.utm_source || '') !== filters.source) return;
        if (filters?.content && (item.utm_content || '') !== filters.content) return;
        if (filters?.classification && classification !== filters.classification) return;
        if (filters?.scheduler && (item.agendado_por || '') !== filters.scheduler) return;

        counts.set(classification, (counts.get(classification) || 0) + 1);
      });

      return Array.from(counts.entries())
        .map(([classification_name, lead_count]) => ({ classification_name, lead_count }))
        .sort((a, b) => b.lead_count - a.lead_count);

    } catch (error) {
      this.logger.error('Erro ao buscar leads por classificação:', error);
      throw error;
    }
  }

  async getDashboardLeadsByStage(
    startDate?: string,
    endDate?: string,
    days?: number,
    filters?: DashboardFilters
  ): Promise<LeadsByStageData[]> {
    try {
      this.logger.log('Buscando distribuição de leads por etapa com filtros...');
      const client = this.supabaseService.getClient();
      if (!client) {
        throw new Error('Cliente Supabase não inicializado');
      }

      const whereSql = this.buildWhereClause(startDate, endDate, days, filters);

      const sql = `
        SELECT 
          etapa,
          COUNT(*) AS lead_count
        FROM public.leads2
        ${whereSql ? whereSql + " AND etapa IS NOT NULL AND etapa <> ''" : "WHERE etapa IS NOT NULL AND etapa <> ''"}
        GROUP BY etapa
        ORDER BY lead_count DESC
      `;

      const { data, error } = await client.rpc('execute_sql', { query: sql });

      if (error) {
        this.logger.error('Erro ao buscar leads por etapa:', error);
        throw new Error(`Erro na consulta: ${error.message}`);
      }

      const normalizeStage = (stage: string): string => {
        const lowerStage = stage.toLowerCase().trim();
        if (lowerStage === 'noshow' || lowerStage === 'no_show' || lowerStage === 'no show') {
          return 'No-show';
        }
        if (lowerStage === 'agendado' || lowerStage === 'agendados') {
          return 'Agendado';
        }
        if (lowerStage === 'follow_up' || lowerStage === 'follow up' || lowerStage === 'followup') {
          return 'Follow-up';
        }
        return stage
          .split(' ')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
          .join(' ');
      };

      const stageCounts = new Map<string, number>();
      (data || []).forEach((row: any) => {
        const normalizedStage = normalizeStage(row.etapa);
        stageCounts.set(normalizedStage, (stageCounts.get(normalizedStage) || 0) + parseInt(row.lead_count, 10));
      });

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
