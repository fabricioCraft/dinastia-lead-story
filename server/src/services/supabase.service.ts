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

  // Amostra de dados para depuração
  async fetchSample(limit = 10): Promise<any[]> {
    if (!this.client) return [];
    const { data, error } = await this.client
      .from('leads2')
      .select('chatid, origem, utm_campaign')
      .order('chatid', { ascending: true })
      .limit(limit);
    if (error) {
      console.error('Supabase fetchSample error:', error.message);
      return [];
    }
    return (data as any[]) ?? [];
  }

  async findOriginsByClickupIds(ids: string[]): Promise<Record<string, string>> {
    if (!this.client || ids.length === 0) return {};
    // Consulta em lotes para evitar 414 e reduzir carga
    const chunkSize = Number(process.env.SUPABASE_CHUNK_SIZE ?? 500);
    const map: Record<string, string> = {};
    for (let i = 0; i < ids.length; i += chunkSize) {
      const chunk = ids.slice(i, i + chunkSize);
      const { data, error } = await this.client
        .from('leads2')
        .select('clickupid, origem')
        .in('clickupid', chunk);
      if (error) {
        console.error('Supabase error:', error.message);
        continue;
      }
      for (const row of data ?? []) {
        if ((row as any).clickupid && (row as any).origem) {
          map[(row as any).clickupid] = (row as any).origem as string;
        }
      }
    }
    return map;
  }

  // Pré-agregação: contagem por origem
  async aggregateLeadsByOrigin(): Promise<Array<{ origem: string | null; count: number }>> {
    if (!this.client) return [];
    const { data, error } = await this.client
      .from('kommo_leads_snapshot')
      .select('origin, count:count()');
    const rows = !error ? ((data as any[]) ?? []) : [];
    if (error) {
      console.error('Supabase aggregateLeadsByOrigin error:', error.message);
    }
    if (rows.length > 0) {
      return rows.map((row) => ({ origem: row.origin ?? null, count: Number(row.count ?? 0) }));
    }

    // Fallback: agregação manual caso a função de agregação esteja desabilitada
    try {
      const total = await this.getTotalKommoLeads();
      if (total <= 0) return [];
      const counts = new Map<string | null, number>();
      const chunkSize = Number(process.env.SUPABASE_FALLBACK_CHUNK_SIZE ?? 1000);
      for (let from = 0; from < total; from += chunkSize) {
        const to = Math.min(from + chunkSize - 1, total - 1);
        const { data: page, error: pageError } = await this.client
          .from('kommo_leads_snapshot')
          .select('origin')
          .order('lead_id', { ascending: true })
          .range(from, to);
        if (pageError) {
          console.error('Supabase fallback aggregateLeadsByOrigin page error:', pageError.message);
          continue;
        }
        for (const r of page ?? []) {
          const key = (r as any).origin ?? null;
          counts.set(key, (counts.get(key) ?? 0) + 1);
        }
      }
      return Array.from(counts.entries()).map(([origem, count]) => ({ origem, count }));
    } catch (e: any) {
      console.error('Supabase fallback aggregateLeadsByOrigin error:', e?.message ?? String(e));
      return [];
    }
  }

  // Pré-agregação: contagem por campanha (utm_campaign)
  async aggregateLeadsByCampaign(): Promise<Array<{ utm_campaign: string | null; count: number }>> {
    if (!this.client) return [];
    const { data, error } = await this.client
      .from('leads2')
      .select('utm_campaign, count:count()');
    const rows = !error ? ((data as any[]) ?? []) : [];
    if (error) {
      console.error('Supabase aggregateLeadsByCampaign error:', error.message);
    }
    if (rows.length > 0) {
      return rows.map((row) => ({ utm_campaign: row.utm_campaign ?? null, count: Number(row.count ?? 0) }));
    }

    // Fallback: agregação manual caso a função de agregação esteja desabilitada
    try {
      const total = await this.getTotalLeads();
      if (total <= 0) return [];
      const counts = new Map<string | null, number>();
      const chunkSize = Number(process.env.SUPABASE_FALLBACK_CHUNK_SIZE ?? 1000);
      let campaignKey: string | null = null;
      for (let from = 0; from < total; from += chunkSize) {
        const to = Math.min(from + chunkSize - 1, total - 1);
        const { data: page, error: pageError } = await this.client
          .from('leads2')
          .select('*')
          .order('chatid', { ascending: true })
          .range(from, to);
        if (pageError) {
          console.error('Supabase fallback aggregateLeadsByCampaign page error:', pageError.message);
          continue;
        }
        if (!campaignKey && (page ?? []).length > 0) {
          const sample = page![0] as any;
          const preferredKeys = ['utm_campaign', 'utmcampaign', 'utmCampaign', 'campaign'];
          campaignKey = preferredKeys.find((k) => k in sample) ?? Object.keys(sample).find((k) => /utm.*campaign/i.test(k) || /campaign/i.test(k)) ?? null;
        }
        for (const r of page ?? []) {
          const key = campaignKey ? ((r as any)[campaignKey] ?? null) : ((r as any).utm_campaign ?? (r as any).utmcampaign ?? (r as any).utmCampaign ?? (r as any).campaign ?? null);
          counts.set(key, (counts.get(key) ?? 0) + 1);
        }
      }
      return Array.from(counts.entries()).map(([utm_campaign, count]) => ({ utm_campaign, count }));
    } catch (e: any) {
      console.error('Supabase fallback aggregateLeadsByCampaign error:', e?.message ?? String(e));
      return [];
    }
  }

  // Total de leads via COUNT direto
  async getTotalLeads(): Promise<number> {
    if (!this.client) return 0;
    const { count, error } = await this.client
      .from('leads2')
      .select('chatid', { count: 'exact', head: true });
    if (error) {
      console.error('Supabase getTotalLeads error:', error.message);
      return 0;
    }
    return Number(count ?? 0);
  }

  async getTotalKommoLeads(): Promise<number> {
    if (!this.client) return 0;
    const { count, error } = await this.client
      .from('kommo_leads_snapshot')
      .select('lead_id', { count: 'exact', head: true });
    if (error) {
      console.error('Supabase getTotalKommoLeads error:', error.message);
      return 0;
    }
    return Number(count ?? 0);
  }

  // Busca todos os ClickUp IDs para uma origem específica, com paginação
  async findClickupIdsByOrigin(origin: string): Promise<string[]> {
    if (!this.client) return [];
    const { count, error } = await this.client
      .from('leads2')
      .select('chatid', { count: 'exact', head: true })
      .eq('origem', origin);
    if (error) {
      console.error('Supabase findClickupIdsByOrigin count error:', error.message);
      return [];
    }
    const total = Number(count ?? 0);
    if (total <= 0) return [];

    const ids: string[] = [];
    const chunkSize = Number(process.env.SUPABASE_FALLBACK_CHUNK_SIZE ?? 1000);
    for (let from = 0; from < total; from += chunkSize) {
      const to = Math.min(from + chunkSize - 1, total - 1);
      const { data: page, error: pageError } = await this.client
        .from('leads2')
        .select('clickupid')
        .eq('origem', origin)
        .order('chatid', { ascending: true })
        .range(from, to);
      if (pageError) {
        console.error('Supabase findClickupIdsByOrigin page error:', pageError.message);
        continue;
      }
      for (const r of page ?? []) {
        const id = (r as any).clickupid as string | undefined;
        if (id) ids.push(id);
      }
    }
    return Array.from(new Set(ids));
  }

  // Upsert das tarefas do ClickUp no snapshot local
  async upsertClickupTasksSnapshot(rows: Array<{ task_id: string; status: string; last_updated_at: string }>): Promise<number> {
    if (!this.client || rows.length === 0) return 0;
    const chunkSize = Number(process.env.SUPABASE_CHUNK_SIZE ?? 500);
    let total = 0;
    for (let i = 0; i < rows.length; i += chunkSize) {
      const chunk = rows.slice(i, i + chunkSize);
      try {
        // Remoção prévia dos registros existentes para simular upsert sem exigir UNIQUE constraint
        const ids = chunk.map((r) => r.task_id).filter((id) => !!id);
        if (ids.length > 0) {
          const { error: delError } = await this.client
            .from('clickup_tasks_snapshot')
            .delete()
            .in('task_id', ids);
          if (delError) {
            console.error('Supabase upsertClickupTasksSnapshot delete error:', delError.message);
          }
        }
        // Inserção dos registros atualizados
        const { error: insError } = await this.client
          .from('clickup_tasks_snapshot')
          .insert(chunk);
        if (insError) {
          console.error('Supabase upsertClickupTasksSnapshot insert error:', insError.message);
          continue;
        }
        total += chunk.length;
      } catch (e: any) {
        console.error('Supabase upsertClickupTasksSnapshot unexpected error:', e?.message ?? String(e));
      }
    }
    return total;
  }

  // Agregação rápida de tarefas por status usando tabela snapshot, com filtro opcional por dias
  async aggregateClickupTasksByStatus(days?: number): Promise<Array<{ status: string; count: number }>> {
    if (!this.client) return [];
    try {
      let query = this.client
        .from('clickup_tasks_snapshot')
        .select('status');
      if (days && Number.isFinite(days) && days > 0) {
        const threshold = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
        query = query.gte('last_updated_at', threshold);
      }
      const { data, error } = await query;
      if (error) {
        console.error('Supabase aggregateClickupTasksByStatus error:', error.message);
        return [];
      }
      const rows = (data as any[]) ?? [];
      const counts = new Map<string, number>();
      for (const r of rows) {
        const s = (r as any).status ?? '';
        if (!s) continue;
        counts.set(s, (counts.get(s) ?? 0) + 1);
      }
      return Array.from(counts.entries()).map(([status, count]) => ({ status, count }));
    } catch (e: any) {
      console.error('Supabase aggregateClickupTasksByStatus error:', e?.message ?? String(e));
      return [];
    }
  }

  // Retorna IDs recentes de tarefas do ClickUp no snapshot considerando o período (dias)
  async getRecentClickupTaskIds(days: number): Promise<string[]> {
    if (!this.client || !days || !Number.isFinite(days) || days <= 0) return [];
    try {
      const threshold = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
      const { data, error } = await this.client
        .from('clickup_tasks_snapshot')
        .select('task_id')
        .gte('last_updated_at', threshold);
      if (error) {
        console.error('Supabase getRecentClickupTaskIds error:', error.message);
        return [];
      }
      const ids = (data ?? []).map((r: any) => r.task_id).filter((x: any) => !!x);
      return Array.from(new Set(ids));
    } catch (e: any) {
      console.error('Supabase getRecentClickupTaskIds error:', e?.message ?? String(e));
      return [];
    }
  }

  // Agrega origens para um conjunto de ClickUp IDs
  async aggregateOriginsForClickupIds(ids: string[]): Promise<Array<{ origem: string | null; count: number }>> {
    if (!this.client || !ids || ids.length === 0) return [];
    try {
      const { data, error } = await this.client
        .from('leads2')
        .select('clickupid, origem')
        .in('clickupid', ids);
      if (error) {
        console.error('Supabase aggregateOriginsForClickupIds error:', error.message);
        return [];
      }
      const counts = new Map<string | null, number>();
      for (const r of (data ?? []) as any[]) {
        const key = r?.origem ?? null;
        counts.set(key, (counts.get(key) ?? 0) + 1);
      }
      return Array.from(counts.entries()).map(([origem, count]) => ({ origem, count }));
    } catch (e: any) {
      console.error('Supabase aggregateOriginsForClickupIds error:', e?.message ?? String(e));
      return [];
    }
  }

  // ==================== KOMMO CRM METHODS ====================

  // Upsert dos leads do Kommo no snapshot local
  async upsertKommoLeadsSnapshot(rows: Array<{
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
  }>): Promise<number> {
    if (!this.client || rows.length === 0) return 0;
    const chunkSize = Number(process.env.SUPABASE_CHUNK_SIZE ?? 500);
    let total = 0;
    for (let i = 0; i < rows.length; i += chunkSize) {
      const chunk = rows.slice(i, i + chunkSize);
      try {
        // Remoção prévia dos registros existentes para simular upsert
        const ids = chunk.map((r) => r.lead_id).filter((id) => !!id);
        if (ids.length > 0) {
          const { error: delError } = await this.client
            .from('kommo_leads_snapshot')
            .delete()
            .in('lead_id', ids);
          if (delError) {
            console.error('Supabase upsertKommoLeadsSnapshot delete error:', delError.message);
          }
        }
        // Inserção dos registros atualizados
        const { error: insError } = await this.client
          .from('kommo_leads_snapshot')
          .insert(chunk);
        if (insError) {
          console.error('Supabase upsertKommoLeadsSnapshot insert error:', insError.message);
          continue;
        }
        total += chunk.length;
      } catch (e: any) {
        console.error('Supabase upsertKommoLeadsSnapshot unexpected error:', e?.message ?? String(e));
      }
    }
    return total;
  }

  // Agregação rápida de leads por status usando tabela snapshot, com filtro opcional por dias
  async aggregateKommoLeadsByStatus(days?: number): Promise<Array<{ status: string; count: number }>> {
    if (!this.client) return [];
    try {
      let query = this.client
        .from('kommo_leads_snapshot')
        .select('status, count(*)')
        .not('status', 'is', null);
      
      if (days && Number.isFinite(days) && days > 0) {
        const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
        query = query.gte('last_updated_at', cutoff);
      }
      
      const { data, error } = await query;
      if (error) {
        console.error('Supabase aggregateKommoLeadsByStatus error:', error.message);
        return [];
      }
      return (data ?? []).map((r: any) => ({
        status: r.status ?? '',
        count: Number(r.count ?? 0),
      }));
    } catch (e: any) {
      console.error('Supabase aggregateKommoLeadsByStatus error:', e?.message ?? String(e));
      return [];
    }
  }

  // Agregação rápida de leads por origem usando tabela snapshot, com filtro opcional por dias
  async aggregateKommoLeadsByOrigin(days?: number): Promise<Array<{ origin: string; count: number }>> {
    if (!this.client) return [];
    try {
      let query = this.client
        .from('kommo_leads_snapshot')
        .select('origin')
        .not('origin', 'is', null);
      
      if (days && Number.isFinite(days) && days > 0) {
        const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
        query = query.gte('last_updated_at', cutoff);
      }
      
      const { data, error } = await query;
      if (error) {
        console.error('Supabase aggregateKommoLeadsByOrigin error:', error.message);
        return [];
      }
      
      // Agregar manualmente os dados
      const rows = (data as any[]) ?? [];
      const counts = new Map<string, number>();
      for (const r of rows) {
        const origin = (r as any).origin ?? '';
        if (!origin) continue;
        counts.set(origin, (counts.get(origin) ?? 0) + 1);
      }
      
      return Array.from(counts.entries()).map(([origin, count]) => ({ origin, count }));
    } catch (e: any) {
      console.error('Supabase aggregateKommoLeadsByOrigin error:', e?.message ?? String(e));
      return [];
    }
  }

  // Calcula tempo médio em cada estágio baseado nos dados históricos
  async calculateAverageTimeInStage(days?: number): Promise<Array<{ status: string; average_time_days: number }>> {
    if (!this.client) return [];
    try {
      // Query SQL personalizada para calcular tempo médio por estágio
      // Esta é uma implementação simplificada - em produção seria mais complexa
      let query = this.client
        .from('kommo_leads_snapshot')
        .select('status, created_at, updated_at')
        .not('status', 'is', null)
        .not('created_at', 'is', null)
        .not('updated_at', 'is', null);
      
      if (days && Number.isFinite(days) && days > 0) {
        const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
        query = query.gte('last_updated_at', cutoff);
      }
      
      const { data, error } = await query;
      if (error) {
        console.error('Supabase calculateAverageTimeInStage error:', error.message);
        return [];
      }
      
      // Calcular tempo médio por status (simplificado)
      const statusTimes = new Map<string, number[]>();
      for (const row of (data ?? []) as any[]) {
        const status = row.status;
        const created = new Date(row.created_at).getTime();
        const updated = new Date(row.updated_at).getTime();
        const timeDiff = (updated - created) / (1000 * 60 * 60 * 24); // dias
        
        if (!statusTimes.has(status)) {
          statusTimes.set(status, []);
        }
        statusTimes.get(status)!.push(timeDiff);
      }
      
      const result: Array<{ status: string; average_time_days: number }> = [];
      for (const [status, times] of statusTimes.entries()) {
        const average = times.reduce((sum, time) => sum + time, 0) / times.length;
        result.push({ status, average_time_days: Math.round(average * 100) / 100 });
      }
      
      return result;
    } catch (e: any) {
      console.error('Supabase calculateAverageTimeInStage error:', e?.message ?? String(e));
      return [];
    }
  }

  // Busca todos os Kommo IDs para uma origem específica
  async findKommoIdsByOrigin(origin: string): Promise<string[]> {
    if (!this.client || !origin) return [];
    try {
      const { data, error } = await this.client
        .from('kommo_leads_snapshot')
        .select('lead_id')
        .eq('origin', origin);
      
      if (error) {
        console.error('Supabase findKommoIdsByOrigin error:', error.message);
        return [];
      }
      
      return (data ?? []).map((r: any) => r.lead_id).filter((id: any) => !!id);
    } catch (e: any) {
      console.error('Supabase findKommoIdsByOrigin error:', e?.message ?? String(e));
      return [];
    }
  }

  // Retorna IDs recentes de leads do Kommo no snapshot considerando o período (dias)
  async getRecentKommoLeadIds(days: number): Promise<string[]> {
    if (!this.client || !Number.isFinite(days) || days <= 0) return [];
    try {
      const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
      const { data, error } = await this.client
        .from('kommo_leads_snapshot')
        .select('lead_id')
        .gte('last_updated_at', cutoff);
      
      if (error) {
        console.error('Supabase getRecentKommoLeadIds error:', error.message);
        return [];
      }
      
      return (data ?? []).map((r: any) => r.lead_id).filter((id: any) => !!id);
    } catch (e: any) {
      console.error('Supabase getRecentKommoLeadIds error:', e?.message ?? String(e));
      return [];
    }
  }

  // Upsert das durações de etapas dos leads do Kommo
  async upsertLeadStageDurations(rows: Array<{
    lead_id: string;
    stage_id: string;
    stage_name: string;
    duration_seconds: number;
  }>): Promise<number> {
    if (!this.client || rows.length === 0) return 0;
    const chunkSize = Number(process.env.SUPABASE_CHUNK_SIZE ?? 500);
    let total = 0;
    for (let i = 0; i < rows.length; i += chunkSize) {
      const chunk = rows.slice(i, i + chunkSize);
      try {
        // Remoção prévia dos registros existentes para simular upsert
        const leadStageKeys = chunk.map((r) => ({ lead_id: r.lead_id, stage_id: r.stage_id }));
        for (const key of leadStageKeys) {
          const { error: delError } = await this.client
            .from('lead_stage_durations')
            .delete()
            .eq('lead_id', key.lead_id)
            .eq('stage_id', key.stage_id);
          if (delError) {
            console.error('Supabase upsertLeadStageDurations delete error:', delError.message);
          }
        }
        
        // Inserção dos registros atualizados
        const { error: insError } = await this.client
          .from('lead_stage_durations')
          .insert(chunk);
        if (insError) {
          console.error('Supabase upsertLeadStageDurations insert error:', insError.message);
          continue;
        }
        total += chunk.length;
      } catch (e: any) {
        console.error('Supabase upsertLeadStageDurations unexpected error:', e?.message ?? String(e));
      }
    }
    return total;
  }

  // Calcular tempo médio em cada etapa baseado na tabela lead_stage_durations
  async getAverageTimeInStageFromDurations(): Promise<Array<{ stage_name: string; avg_duration_seconds: number }>> {
    if (!this.client) return [];
    try {
      const { data, error } = await this.client
        .from('lead_stage_durations')
        .select('stage_name, duration_seconds')
        .not('stage_name', 'is', null)
        .not('duration_seconds', 'is', null);
      
      if (error) {
        console.error('Supabase getAverageTimeInStageFromDurations error:', error.message);
        return [];
      }
      
      // Calcular média por etapa
      const stageGroups = new Map<string, number[]>();
      for (const row of (data ?? []) as any[]) {
        const stageName = row.stage_name;
        const duration = Number(row.duration_seconds);
        
        if (!stageGroups.has(stageName)) {
          stageGroups.set(stageName, []);
        }
        stageGroups.get(stageName)!.push(duration);
      }
      
      const result: Array<{ stage_name: string; avg_duration_seconds: number }> = [];
      for (const [stageName, durations] of stageGroups.entries()) {
        const average = durations.reduce((sum, duration) => sum + duration, 0) / durations.length;
        result.push({ stage_name: stageName, avg_duration_seconds: Math.round(average) });
      }
      
      return result;
    } catch (e: any) {
      console.error('Supabase getAverageTimeInStageFromDurations error:', e?.message ?? String(e));
      return [];
    }
  }

  // Agrega origens para um conjunto de Kommo IDs
  async aggregateOriginsForKommoIds(ids: string[]): Promise<Array<{ status: string; count: number }>> {
    if (!this.client || !ids || ids.length === 0) return [];
    try {
      const { data, error } = await this.client
        .from('kommo_leads_snapshot')
        .select('status')
        .in('lead_id', ids)
        .not('status', 'is', null);
      
      if (error) {
        console.error('Supabase aggregateOriginsForKommoIds error:', error.message);
        return [];
      }
      
      const counts = new Map<string, number>();
      for (const r of (data ?? []) as any[]) {
        const status = r.status;
        counts.set(status, (counts.get(status) ?? 0) + 1);
      }
      
      return Array.from(counts.entries()).map(([status, count]) => ({ status, count }));
    } catch (e: any) {
      console.error('Supabase aggregateOriginsForKommoIds error:', e?.message ?? String(e));
      return [];
    }
  }
}