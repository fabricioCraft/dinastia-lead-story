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

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  constructor(
    private readonly supabaseService: SupabaseService
  ) { }

  async getOriginSummary(days?: number) {
    // Usar dados diretamente da tabela leads2 do Supabase
    try {
      const client = this.supabaseService.getClient();
      if (!client) {
        throw new Error('Cliente Supabase não inicializado');
      }

      // Calcular período se especificado
      let query = client
        .from('leads2')
        .select('origem')
        .not('origem', 'is', null)
        .neq('origem', '');

      if (days) {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        query = query.gte('datacriacao', startDate.toISOString());
      }

      // Adicionar limite alto para buscar todos os registros
      query = query.limit(50000);

      const { data, error } = await query;

      if (error) {
        this.logger.error('Erro ao buscar dados de origem:', error);
        throw new Error(`Erro na consulta: ${error.message}`);
      }

      // Processar dados para agrupar por origem
      const originCounts = new Map<string, number>();

      data?.forEach(lead => {
        if (lead.origem) {
          originCounts.set(lead.origem, (originCounts.get(lead.origem) || 0) + 1);
        }
      });

      const leadsByOrigin = Array.from(originCounts.entries()).map(([origin, count]) => ({
        origin_name: origin,
        lead_count: count
      }));

      return {
        kpis: {
          totalLeads: data?.length || 0,
          totalOrigins: originCounts.size,
          totalCampaigns: 0 // Não há campanhas na tabela leads2
        },
        leadsByOrigin,
        leadsByCampaign: [] // Não há campanhas na tabela leads2
      };
    } catch (error) {
      this.logger.error('Erro ao obter resumo de origem:', error);
      throw error;
    }
  }

  async getFunnelBreakdownForOrigin(origin: string, days?: number): Promise<{ status: string; count: number }[]> {
    // Método removido - dados agora vêm do N8N
    return [];
  }

  // Método getCampaignSummaryFromPxLeads removido - não há campanhas na tabela leads2

  async getDailyLeadVolume(
    startDate?: string,
    endDate?: string,
    days?: number
  ): Promise<DailyLeadVolumeData[]> {
    try {
      this.logger.log('Buscando dados de volume diário de leads');
      this.logger.log(`Filtros recebidos - startDate: ${startDate}, endDate: ${endDate}, days: ${days}`);

      if (typeof days === 'number' && days > 0) {
        return await this.getDailyLeadVolumeLastDays(days);
      }

      return await this.getDailyLeadVolumeDirectQuery(startDate, endDate);

    } catch (error) {
      this.logger.error('Erro ao buscar dados de volume diário:', error);
      throw error;
    }
  }

  private async getDailyLeadVolumeLastDays(days: number): Promise<DailyLeadVolumeData[]> {
    try {
      this.logger.log(`Buscando volume diário de leads para últimos ${days} dias (apenas leads2) com paginação`);

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
          throw new Error(`Erro na consulta leads2: ${error.message}`);
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
    endDate?: string
  ): Promise<DailyLeadVolumeData[]> {
    try {
      this.logger.log('Buscando volume diário de leads exclusivamente da tabela leads2 com SQL puro');

      const client = this.supabaseService.getClient();
      if (!client) {
        throw new Error('Cliente Supabase não inicializado');
      }

      // Query SQL pura e otimizada para buscar apenas da tabela leads2
      let sqlQuery = `
        SELECT 
          DATE_TRUNC('day', datacriacao)::date AS day, 
          COUNT(chatid) AS total_leads_per_day 
        FROM 
          public.leads2 
        WHERE 
          datacriacao IS NOT NULL`;

      // Adicionar filtros de data se fornecidos
      const queryParams: any[] = [];
      if (startDate) {
        queryParams.push(`${startDate}T00:00:00.000Z`);
        sqlQuery += ` AND datacriacao >= $${queryParams.length}`;
      }
      if (endDate) {
        queryParams.push(`${endDate}T23:59:59.999Z`);
        sqlQuery += ` AND datacriacao <= $${queryParams.length}`;
      }

      sqlQuery += `
        GROUP BY 
          day 
        ORDER BY 
          day ASC`;

      this.logger.log(`Executando query SQL pura: ${sqlQuery}`);
      this.logger.log(`Parâmetros: ${JSON.stringify(queryParams)}`);

      // Tentar usar execute_sql primeiro
      try {
        const { data, error } = await client.rpc('execute_sql', {
          sql_query: sqlQuery,
          params: queryParams
        });

        if (!error && data) {
          this.logger.log(`Query SQL retornou ${data.length} registros de volume diário`);
          return data;
        }
      } catch (rpcError) {
        this.logger.warn('Função execute_sql não disponível, usando fallback manual');
      }

      // Fallback manual usando apenas leads2
      return await this.getDailyLeadVolumeDirectQuery(startDate, endDate);

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
    endDate?: string
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
          .select('datacriacao')
          .not('datacriacao', 'is', null);

        if (startDate) {
          query = query.gte('datacriacao', `${startDate}T00:00:00.000Z`);
        }
        if (endDate) {
          query = query.lte('datacriacao', `${endDate}T23:59:59.999Z`);
        }

        query = query.range(from, from + pageSize - 1);

        const { data, error } = await query;

        if (error) {
          this.logger.error('Erro ao buscar dados de leads2:', error);
          throw new Error(`Erro na consulta leads2: ${error.message}`);
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

      this.logger.log(`Total de registros coletados da leads2: ${allLeads2Data.length}`);

      // Agregar os dados manualmente por dia (sem ajuste de fuso horário)
      const dailyCounts = new Map<string, number>();

      // Processar dados de leads2
      allLeads2Data.forEach((lead: any) => {
        const date = new Date(lead.datacriacao);
        const day = date.toISOString().split('T')[0]; // YYYY-MM-DD
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
      this.logger.log(`Query direta com paginação retornando ${result.length} registros de volume diário com total de ${totalLeads} leads (apenas leads2)`);
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
    endDate?: string,
    days?: number
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
      let query = '';
      if (typeof days === 'number' && days > 0) {
        return await this.getDailyAppointmentsFallback(undefined, undefined, days);
      } else {
        query = `
          SELECT 
            day,
            COUNT(*) AS appointments_per_day
          FROM (
            SELECT 
              DATE_TRUNC('day', to_timestamp(data_do_agendamento, 'DD/MM/YYYY, HH24:MI:SS'))::date AS day
            FROM public.leads2
            WHERE data_do_agendamento IS NOT NULL AND data_do_agendamento <> ''
          ) AS events
          WHERE 1=1
        `;
        if (startDate) {
          query += ` AND day >= '${startDate}'`;
        }
        if (endDate) {
          query += ` AND day <= '${endDate}'`;
        }
      }

      query += `
        GROUP BY day 
        ORDER BY day ASC
      `;

      this.logger.log(`Executando query de agendamentos diários: ${query}`);


      const { data, error } = await client.rpc('execute_sql', {
        query: query
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

  async getAppointmentsByPerson(
    startDate?: string,
    endDate?: string,
    days?: number
  ): Promise<AppointmentsByPersonPerDayData[]> {
    return this.getAppointmentsByPersonPerDay(startDate, endDate, days);
  }

  async getAppointmentsByPersonPerDay(
    startDate?: string,
    endDate?: string,
    days?: number
  ): Promise<AppointmentsByPersonPerDayData[]> {
    try {
      const client = this.supabaseService.getClient();
      if (!client) {
        throw new Error('Supabase client not initialized');
      }

      let sql = `
        SELECT 
          DATE_TRUNC('day', to_timestamp(data_do_agendamento, 'DD/MM/YYYY, HH24:MI:SS'))::date AS day,
          agendado_por,
          COUNT(chatid) AS appointment_count
        FROM public.leads2
        WHERE agendado_por IS NOT NULL AND TRIM(agendado_por) <> ''
          AND data_do_agendamento IS NOT NULL AND TRIM(data_do_agendamento) <> ''
      `;

      if (typeof days === 'number' && days > 0) {
        sql += ` AND to_timestamp(data_do_agendamento, 'DD/MM/YYYY, HH24:MI:SS') >= NOW() - INTERVAL '${days} days'`;
      } else {
        if (startDate) {
          sql += ` AND to_timestamp(data_do_agendamento, 'DD/MM/YYYY, HH24:MI:SS') >= '${startDate}T00:00:00.000Z'`;
        }
        if (endDate) {
          sql += ` AND to_timestamp(data_do_agendamento, 'DD/MM/YYYY, HH24:MI:SS') <= '${endDate}T23:59:59.999Z'`;
        }
      }

      sql += `
        GROUP BY day, agendado_por
        ORDER BY day ASC, appointment_count DESC
      `;

      try {
        const { data, error } = await client.rpc('execute_sql', { query: sql });
        if (!error && data) {
          return (data || []).map((row: any) => ({
            day: row.day,
            agendado_por: row.agendado_por,
            appointment_count: parseInt(row.appointment_count, 10)
          }));
        }
      } catch (_) { }

      const allData: any[] = [];
      let from = 0;
      const pageSize = 1000;
      let hasMore = true;
      while (hasMore) {
        let query = client
          .from('leads2')
          .select('agendado_por, data_do_agendamento, chatid')
          .not('agendado_por', 'is', null)
          .neq('agendado_por', '')
          .not('data_do_agendamento', 'is', null)
          .neq('data_do_agendamento', '');
        query = query.range(from, from + pageSize - 1);
        const { data, error } = await query;
        if (error) {
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

      const now = new Date();
      const startTs = typeof days === 'number' && days > 0
        ? new Date(now.getTime() - days * 24 * 60 * 60 * 1000).getTime()
        : startDate ? new Date(`${startDate}T00:00:00.000Z`).getTime() : undefined;
      const endTs = typeof days === 'number' && days > 0
        ? now.getTime()
        : endDate ? new Date(`${endDate}T23:59:59.999Z`).getTime() : undefined;

      const counts = new Map<string, number>();
      allData.forEach((row) => {
        const person = String(row.agendado_por).trim();
        if (!person) return;
        const dt = this.parseBrazilianDateTime(String(row.data_do_agendamento));
        if (!dt || isNaN(dt.getTime())) return;
        const t = dt.getTime();
        if (startTs && t < startTs) return;
        if (endTs && t > endTs) return;
        const dayKey = dt.toISOString().split('T')[0];
        const key = `${dayKey}|${person}`;
        counts.set(key, (counts.get(key) || 0) + 1);
      });

      return Array.from(counts.entries())
        .map(([key, appointment_count]) => {
          const [day, agendado_por] = key.split('|');
          return { day, agendado_por, appointment_count };
        })
        .sort((a, b) => a.day.localeCompare(b.day) || b.appointment_count - a.appointment_count);
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
    days?: number
  ): Promise<DailyAppointmentsData[]> {
    try {
      this.logger.log('Usando fallback para agendamentos diários apenas da tabela leads2 (sem deduplicação)');

      const client = this.supabaseService.getClient();
      if (!client) {
        throw new Error('Cliente Supabase não inicializado');
      }

      // Buscar agendamentos da tabela leads2
      const { data: leads2Data, error: leads2Error } = await client
        .from('leads2')
        .select('data_do_agendamento')
        .not('data_do_agendamento', 'is', null)
        .neq('data_do_agendamento', '')
        .order('data_do_agendamento', { ascending: true })
        .limit(10000);

      if (leads2Error) {
        this.logger.error('Erro ao buscar leads2 no fallback:', leads2Error);
      }

      const totalRecords = (leads2Data?.length || 0);
      if (totalRecords === 0) {
        this.logger.warn('Nenhum dado de agendamentos encontrado no fallback');
        return [];
      }

      this.logger.log(`Processando ${totalRecords} registros de agendamentos no fallback unificado`);

      const dailyCounts = new Map<string, number>();
      let validDatesCount = 0;
      let invalidDatesCount = 0;

      // Processar dados do leads2
      (leads2Data || []).forEach((appointment: any) => {
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

  async getUnifiedOriginSummary(days?: number, fromDate?: Date, toDate?: Date): Promise<UnifiedOriginSummaryData[]> {
    try {
      this.logger.log('Buscando dados de origem dos leads exclusivamente da tabela leads2...');

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

      // Ajustar para o fuso horário brasileiro (UTC-3)
      const startDateBR = new Date(startDate.getTime() - 3 * 60 * 60 * 1000);
      const endDateBR = new Date(endDate.getTime() - 3 * 60 * 60 * 1000);

      this.logger.log(`Filtrando dados de origem entre ${startDateBR.toISOString()} e ${endDateBR.toISOString()} (horário brasileiro)`);

      // Tentar usar a função execute_sql primeiro
      try {
        const sqlQuery = `
          SELECT 
            normalized_origin AS origin_name, 
            COUNT(*) AS lead_count 
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
                WHEN origem ILIKE '%INSTAGRAM%' THEN 'Instagram'
                WHEN origem ILIKE '%LINKEDIN%' THEN 'LinkedIn'
                WHEN origem ILIKE '%TIKTOK%' THEN 'TikTok'
                WHEN origem ILIKE '%WHATSAPP%' THEN 'WhatsApp'
                WHEN origem ILIKE '%EMAIL%' THEN 'Email Marketing'
                WHEN origem ILIKE '%SEO%' OR origem ILIKE '%ORGANICO%' THEN 'SEO/Orgânico'
                WHEN origem ILIKE '%INDICACAO%' OR origem ILIKE '%REFERRAL%' THEN 'Indicação'
                WHEN origem ILIKE '%DINASTIA%' THEN origem
                WHEN origem IS NULL OR origem = '' THEN 'Sem Origem'
                ELSE 'Outros'
              END AS normalized_origin 
            FROM 
              public.leads2 
            WHERE 
              datacriacao >= '${startDateBR.toISOString()}'
              AND datacriacao <= '${endDateBR.toISOString()}'
          ) AS normalized_data 
          GROUP BY 
            normalized_origin 
          ORDER BY 
            lead_count DESC;
        `;

        const { data: sqlResult, error: sqlError } = await client.rpc('execute_sql', {
          query: sqlQuery
        });

        if (!sqlError && sqlResult && Array.isArray(sqlResult)) {
          this.logger.log(`Query SQL executada com sucesso. Retornando ${sqlResult.length} categorias de origem.`);
          return sqlResult.map(row => ({
            origin_name: row.origin_name,
            lead_count: parseInt(row.lead_count, 10)
          }));
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
          .select('origem, datacriacao')
          .gte('datacriacao', startDateBR.toISOString())
          .lte('datacriacao', endDateBR.toISOString())
          .range(from, from + pageSize - 1);

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

      allData.forEach(lead => {
        const normalizedOrigin = normalizeOrigin(lead.origem);
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
    days?: number
  ): Promise<LeadsByClassificationData[]> {
    try {
      const client = this.supabaseService.getClient();
      if (!client) {
        throw new Error('Supabase client not initialized');
      }

      try {
        let sql = `
          SELECT 
            TRIM(classificacao_do_lead) AS classification_name,
            COUNT(*) AS lead_count
          FROM public.leads2
          WHERE classificacao_do_lead IS NOT NULL AND TRIM(classificacao_do_lead) <> ''
            AND TRIM(classificacao_do_lead) ~ '^[A-Za-z]+$'
        `;
        const params: string[] = [];
        if (typeof days === 'number' && days > 0) {
          sql += ` AND datacriacao >= NOW() - INTERVAL '${days} days'`;
        } else {
          if (startDate) {
            sql += ` AND datacriacao >= '${startDate}T00:00:00.000Z'`;
          }
          if (endDate) {
            sql += ` AND datacriacao <= '${endDate}T23:59:59.999Z'`;
          }
        }
        sql += `
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
      } catch (_) { }

      const allData: any[] = [];
      let from = 0;
      const pageSize = 1000;
      let hasMore = true;
      while (hasMore) {
        let query = client
          .from('leads2')
          .select('classificacao_do_lead, datacriacao')
          .not('classificacao_do_lead', 'is', null)
          .neq('classificacao_do_lead', '');

        if (typeof days === 'number' && days > 0) {
          const now = new Date();
          const start = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
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
      const counts = new Map<string, number>();
      allData.forEach(item => {
        const key = String(item.classificacao_do_lead).trim();
        if (!key) return;
        if (!/^[A-Za-z]+$/.test(key)) return;
        counts.set(key, (counts.get(key) || 0) + 1);
      });
      return Array.from(counts.entries())
        .map(([classification_name, lead_count]) => ({ classification_name, lead_count }))
        .sort((a, b) => b.lead_count - a.lead_count);
    } catch (error) {
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
        .neq('etapa', '')
        .limit(50000);

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

  async getCampaignDrilldown(
    viewBy?: 'campaign' | 'source' | 'content',
    campaign?: string,
    source?: string,
    startDate?: string,
    endDate?: string,
    days?: number,
  ): Promise<DrilldownItem[]> {
    try {
      const client = this.supabaseService.getClient();
      if (!client) {
        throw new Error('Supabase client not initialized');
      }
      const hierarchy: Array<'campaign' | 'source' | 'content'> = ['campaign', 'source', 'content'];
      const view = (viewBy && hierarchy.includes(viewBy)) ? viewBy : 'campaign';
      let groupByColumn = view === 'campaign' ? 'utm_campaign' : view === 'source' ? 'utm_source' : 'utm_content';
      const whereClauses: string[] = [];
      const escCampaign = campaign ? campaign.replace(/'/g, "''") : undefined;
      const escSource = source ? source.replace(/'/g, "''") : undefined;
      if (view === 'campaign') {
        if (escCampaign && escSource) {
          groupByColumn = 'utm_content';
          whereClauses.push(`utm_campaign = '${escCampaign}'`);
          whereClauses.push(`utm_source = '${escSource}'`);
        } else if (escCampaign) {
          groupByColumn = 'utm_source';
          whereClauses.push(`utm_campaign = '${escCampaign}'`);
        }
      } else if (view === 'source') {
        if (escSource) {
          groupByColumn = 'utm_content';
          whereClauses.push(`utm_source = '${escSource}'`);
        }
        if (escCampaign) {
          whereClauses.push(`utm_campaign = '${escCampaign}'`);
        }
      } else {
        groupByColumn = 'utm_content';
        if (escCampaign) {
          whereClauses.push(`utm_campaign = '${escCampaign}'`);
        }
        if (escSource) {
          whereClauses.push(`utm_source = '${escSource}'`);
        }
      }
      if (typeof days === 'number' && days > 0) {
        whereClauses.push(`datacriacao >= NOW() - INTERVAL '${days} days'`);
      } else {
        if (startDate) whereClauses.push(`datacriacao >= '${startDate}T00:00:00.000Z'`);
        if (endDate) whereClauses.push(`datacriacao <= '${endDate}T23:59:59.999Z'`);
      }
      const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
      const sql = `
        SELECT ${groupByColumn} AS name, COUNT(chatid) AS value
        FROM public.leads2
        ${whereSql ? whereSql + ' AND ' : 'WHERE '}${groupByColumn} IS NOT NULL AND ${groupByColumn} <> ''
        GROUP BY ${groupByColumn}
        ORDER BY value DESC;
      `;

      try {
        const { data, error } = await client.rpc('execute_sql', { query: sql });
        if (!error && Array.isArray(data)) {
          return (data || []).map((row: any) => ({ name: row.name, value: parseInt(row.value, 10) }));
        }
      } catch (_) { }

      const counts = new Map<string, number>();
      const pageSize = 2000;
      let from = 0;
      let hasMore = true;
      while (hasMore) {
        let query: any = client
          .from('leads2')
          .select(`${groupByColumn}, datacriacao`);
        if (view === 'campaign') {
          if (campaign) {
            query = query.eq('utm_campaign', campaign);
          }
          if (source) {
            query = query.eq('utm_source', source);
          }
        } else if (view === 'source') {
          if (source) {
            query = query.eq('utm_source', source);
          }
          if (campaign) {
            query = query.eq('utm_campaign', campaign);
          }
        } else {
          if (campaign) {
            query = query.eq('utm_campaign', campaign);
          }
          if (source) {
            query = query.eq('utm_source', source);
          }
        }
        if (typeof days === 'number' && days > 0) {
          const now = new Date();
          const start = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
          query = query.gte('datacriacao', start.toISOString());
        } else {
          if (startDate) query = query.gte('datacriacao', `${startDate}T00:00:00.000Z`);
          if (endDate) query = query.lte('datacriacao', `${endDate}T23:59:59.999Z`);
        }
        query = query.not(groupByColumn as any, 'is', null).neq(groupByColumn as any, '');
        query = query.range(from, from + pageSize - 1);
        const { data, error } = await query;
        if (error) {
          throw new Error(error.message);
        }
        const rows: any[] = data || [];
        for (const row of rows) {
          const name = (row as any)[groupByColumn] ?? '';
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
    } catch (error) {
      throw error;
    }
  }


}