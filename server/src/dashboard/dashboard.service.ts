import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { SupabaseService } from '../services/supabase.service';
import { PostgresService } from '../services/postgres.service';

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
    private readonly supabaseService: SupabaseService,
    private readonly pg: PostgresService,
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

  private buildWhereClauseParams(
    startDate?: string,
    endDate?: string,
    days?: number,
    filters?: DashboardFilters,
    dateColumn: string = 'datacriacao'
  ): { clause: string; params: any[] } {
    const conditions: string[] = []
    const params: any[] = []

    if (typeof days === 'number' && days > 0) {
      params.push(days)
      conditions.push(`${dateColumn} >= NOW() - ($${params.length}::int) * INTERVAL '1 day'`)
    } else {
      if (startDate) {
        params.push(`${startDate}T00:00:00.000Z`)
        conditions.push(`${dateColumn} >= $${params.length}`)
      }
      if (endDate) {
        params.push(`${endDate}T23:59:59.999Z`)
        conditions.push(`${dateColumn} <= $${params.length}`)
      }
    }

    if (filters) {
      if (filters.campaign) {
        params.push(filters.campaign)
        conditions.push(`(CASE WHEN utm_campaign ILIKE 'DINASTIA |%|%' THEN TRIM(split_part(utm_campaign, '|', 2)) ELSE utm_campaign END) = $${params.length}`)
      }
      if (filters.source) {
        params.push(filters.source)
        conditions.push(`TRIM(utm_source) = $${params.length}`)
      }
      if (filters.content) {
        params.push(filters.content)
        conditions.push(`TRIM(utm_content) = $${params.length}`)
      }
      if (filters.classification) {
        params.push(filters.classification)
        conditions.push(`TRIM(classificacao_do_lead) = $${params.length}`)
      }
      if (filters.origin) {
        params.push(filters.origin)
        conditions.push(`(CASE
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
          END) = $${params.length}`)
      }
      if (filters.scheduler) {
        params.push(filters.scheduler)
        conditions.push(`agendado_por = $${params.length}`)
      }
    }

    const clause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
    return { clause, params }
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
    const { clause, params } = this.buildWhereClauseParams(startDate, endDate, days, filters)

    if (column === 'utm_campaign') {
      const sql = `
        SELECT
          normalized_campaign_name AS name,
          COUNT(chatid) AS value
        FROM (
          SELECT
            CASE
              WHEN utm_campaign ILIKE 'DINASTIA |%|%' THEN TRIM(split_part(utm_campaign, '|', 2))
              ELSE utm_campaign
            END AS normalized_campaign_name,
            chatid
          FROM public.leads2
          ${clause ? `${clause} AND utm_campaign IS NOT NULL AND TRIM(utm_campaign) <> ''` : `WHERE utm_campaign IS NOT NULL AND TRIM(utm_campaign) <> ''`}
        ) AS subquery
        GROUP BY normalized_campaign_name
        ORDER BY value DESC`

      const { rows } = await this.pg.query(sql, params)
      return (rows || []).map((r: any) => ({ name: r.name, value: parseInt(r.value, 10) }))
    } else {
      const sql = `
        SELECT ${column} AS name, COUNT(chatid) AS value
        FROM public.leads2
        ${clause ? `${clause} AND ${column} IS NOT NULL AND TRIM(${column}) <> ''` : `WHERE ${column} IS NOT NULL AND TRIM(${column}) <> ''`}
        GROUP BY ${column}
        ORDER BY value DESC`

      const { rows } = await this.pg.query(sql, params)
      return (rows || []).map((r: any) => ({ name: r.name, value: parseInt(r.value, 10) }))
    }
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
      const { clause, params } = this.buildWhereClauseParams(startDate, endDate, days, filters)

      const sql = `
        SELECT 
          DATE_TRUNC('day', datacriacao)::date AS day, 
          COUNT(chatid) AS total_leads_per_day 
        FROM public.leads2 
        ${clause}
        GROUP BY day 
        ORDER BY day ASC`;

      this.logger.log(`Executando SQL (DailyLeadVolume): ${sql}`)

      try {
        const { rows } = await this.pg.query(sql, params)
        return rows.map((row: any) => ({
          day: row.day,
          total_leads_per_day: parseInt(row.total_leads_per_day, 10)
        }))
      } catch (err) {
        this.logger.error('Erro ao executar SQL de volume diário:', err)
        throw new InternalServerErrorException('Falha ao buscar dados de volume diário.')
      }

    } catch (error) {
      this.logger.error('Erro ao buscar dados de volume diário:', error);
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
      const { clause, params } = this.buildWhereClauseParams(startDate, endDate, days, filters)

      const leadsSql = `SELECT COUNT(*) as count FROM public.leads2 ${clause}`
      const apptSql = `SELECT COUNT(*) as count FROM public.leads2 ${clause ? `${clause} AND data_do_agendamento IS NOT NULL AND TRIM(data_do_agendamento) <> ''` : `WHERE data_do_agendamento IS NOT NULL AND TRIM(data_do_agendamento) <> ''`}`

      try {
        const [leadsRes, apptRes] = await Promise.all([
          this.pg.query<{ count: string }>(leadsSql, params),
          this.pg.query<{ count: string }>(apptSql, params)
        ])
        const totalLeads = parseInt(leadsRes.rows?.[0]?.count || '0', 10)
        const totalAppointments = parseInt(apptRes.rows?.[0]?.count || '0', 10)
        const schedulingRate = totalLeads > 0 ? totalAppointments / totalLeads : 0
        return { totalLeads, totalAppointments, schedulingRate }
      } catch (err) {
        this.logger.error('Erro ao executar SQL de resumo de agendamento:', err)
        throw new InternalServerErrorException('Falha ao buscar resumo de agendamento.')
      }

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
      const dateCol = "to_timestamp(data_do_agendamento, 'DD/MM/YYYY, HH24:MI:SS')"
      const { clause, params } = this.buildWhereClauseParams(startDate, endDate, days, filters, dateCol)

      const sql = `
        SELECT 
          DATE_TRUNC('day', ${dateCol})::date AS day,
          COUNT(*) AS appointments_per_day
        FROM public.leads2
        ${clause ? `${clause} AND data_do_agendamento IS NOT NULL AND TRIM(data_do_agendamento) <> ''` : "WHERE data_do_agendamento IS NOT NULL AND TRIM(data_do_agendamento) <> ''"}
        GROUP BY day 
        ORDER BY day ASC`

      this.logger.log(`Executando SQL (DailyAppointments): ${sql}`)

      try {
        const { rows } = await this.pg.query(sql, params)
        const appointmentsData: DailyAppointmentsData[] = (rows || []).map((row: any) => ({
          day: row.day,
          appointments_per_day: parseInt(row.appointments_per_day, 10)
        }))
        return this.fillDateGapsForAppointments(appointmentsData, startDate, endDate)
      } catch (err) {
        this.logger.error('Erro ao executar SQL de agendamentos diários:', err)
        throw new InternalServerErrorException('Falha ao buscar dados de agendamentos diários.')
      }

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
      const dateCol = "to_timestamp(data_do_agendamento, 'DD/MM/YYYY, HH24:MI:SS')"
      const { clause, params } = this.buildWhereClauseParams(startDate, endDate, days, filters, dateCol)
      const sql = `
        SELECT 
          DATE_TRUNC('day', ${dateCol})::date AS day,
          agendado_por,
          COUNT(chatid) AS appointment_count
        FROM public.leads2
        ${clause ? `${clause} AND agendado_por IS NOT NULL AND TRIM(agendado_por) <> '' AND data_do_agendamento IS NOT NULL AND TRIM(data_do_agendamento) <> ''` : "WHERE agendado_por IS NOT NULL AND TRIM(agendado_por) <> '' AND data_do_agendamento IS NOT NULL AND TRIM(data_do_agendamento) <> ''"}
        GROUP BY day, agendado_por
        ORDER BY day ASC, appointment_count DESC`

      try {
        const { rows } = await this.pg.query(sql, params)
        return (rows || []).map((row: any) => ({
          day: row.day,
          agendado_por: row.agendado_por,
          appointment_count: parseInt(row.appointment_count, 10)
        }))
      } catch (err) {
        this.logger.error('Erro ao executar SQL de agendamentos por pessoa:', err)
        throw new InternalServerErrorException('Falha ao buscar agendamentos por pessoa.')
      }
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
      const dateCol = "to_timestamp(data_do_agendamento, 'DD/MM/YYYY, HH24:MI:SS')"
      const { clause, params } = this.buildWhereClauseParams(startDate, endDate, days, filters, dateCol)
      const sql = `
        SELECT 
          DATE_TRUNC('day', ${dateCol})::date AS day,
          agendado_por,
          COUNT(chatid) AS appointment_count
        FROM public.leads2
        ${clause ? `${clause} AND agendado_por IS NOT NULL AND TRIM(agendado_por) <> '' AND data_do_agendamento IS NOT NULL AND TRIM(data_do_agendamento) <> ''` : "WHERE agendado_por IS NOT NULL AND TRIM(agendado_por) <> '' AND data_do_agendamento IS NOT NULL AND TRIM(data_do_agendamento) <> ''"}
        GROUP BY day, agendado_por
        ORDER BY day ASC, appointment_count DESC`

      try {
        const { rows } = await this.pg.query(sql, params)
        const groupedData = new Map<string, any>()
        rows?.forEach((row: any) => {
          const day = row.day
          if (!groupedData.has(day)) groupedData.set(day, { day })
          const entry = groupedData.get(day)
          const person = row.agendado_por || 'Desconhecido'
          entry[person] = parseInt(row.appointment_count, 10)
        })
        return Array.from(groupedData.values()).sort((a, b) => a.day.localeCompare(b.day))
      } catch (err) {
        this.logger.error('Erro ao executar SQL de agendamentos por pessoa por dia:', err)
        throw new InternalServerErrorException('Falha ao buscar agendamentos por pessoa por dia.')
      }

    } catch (error) {
      this.logger.error('Erro ao buscar agendamentos por pessoa por dia:', error);
      throw error;
    }
  }

  // Fallback manual removido: toda agregação é feita via SQL direto

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
      const startDateStr = fromDate ? fromDate.toISOString().split('T')[0] : undefined
      const endDateStr = toDate ? toDate.toISOString().split('T')[0] : undefined
      const { clause, params } = this.buildWhereClauseParams(startDateStr, endDateStr, days, filters)

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
          ${clause ? `${clause} AND origem IS NOT NULL AND TRIM(origem) <> ''` : `WHERE origem IS NOT NULL AND TRIM(origem) <> ''`}
        ) AS sub
        GROUP BY normalized_origin
        ORDER BY lead_count DESC`;

      try {
        const { rows } = await this.pg.query(sql, params)
        return (rows || []).map((row: any) => ({ origin_name: row.origin_name, lead_count: parseInt(row.lead_count, 10) }))
      } catch (err) {
        this.logger.error('Erro ao executar SQL de origem unificada:', err)
        throw new InternalServerErrorException('Falha ao buscar dados de origem.')
      }

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
      const { clause, params } = this.buildWhereClauseParams(startDate, endDate, days, filters)
      const sql = `
        SELECT 
          TRIM(classificacao_do_lead) AS classification_name,
          COUNT(*) AS lead_count
        FROM public.leads2
        ${clause ? `${clause} AND classificacao_do_lead IS NOT NULL AND TRIM(classificacao_do_lead) ~ '^[A-Za-z]$'` : "WHERE classificacao_do_lead IS NOT NULL AND TRIM(classificacao_do_lead) ~ '^[A-Za-z]$'"}
        GROUP BY TRIM(classificacao_do_lead)
        ORDER BY lead_count DESC`;

      try {
        const { rows } = await this.pg.query(sql, params)
        return (rows || []).map((row: any) => ({
          classification_name: row.classification_name,
          lead_count: parseInt(row.lead_count, 10)
        }))
      } catch (err) {
        this.logger.error('Erro ao executar SQL de leads por classificação:', err)
        throw new InternalServerErrorException('Falha ao buscar leads por classificação.')
      }

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
      const { clause, params } = this.buildWhereClauseParams(startDate, endDate, days, filters)
      const sql = `
        SELECT 
          etapa,
          COUNT(*) AS lead_count
        FROM public.leads2
        ${clause ? `${clause} AND etapa IS NOT NULL AND TRIM(etapa) <> ''` : "WHERE etapa IS NOT NULL AND TRIM(etapa) <> ''"}
        GROUP BY etapa
        ORDER BY lead_count DESC`

      const { rows } = await this.pg.query(sql, params)

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
      (rows || []).forEach((row: any) => {
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
