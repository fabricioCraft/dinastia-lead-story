import { Injectable } from '@nestjs/common';
import { ClickUpService } from '../services/clickup.service';
import { SupabaseService } from '../services/supabase.service';

export interface EnrichedLead {
  id: string;
  name: string;
  status: string;
  origin: string | null;
}

@Injectable()
export class FunnelService {
  // Cache em memória (server-side) para evitar expor dados no navegador
  private cache: { data: EnrichedLead[]; timestamp: number } | null = null;
  private readonly ttlMs = Number(process.env.FUNNEL_CACHE_TTL_MS ?? 300000); // default 5 min
  // Promessa em andamento para evitar múltiplos cálculos concorrentes
  private ongoing: Promise<EnrichedLead[]> | null = null;

  constructor(
    private clickup: ClickUpService,
    private supabase: SupabaseService,
  ) {}

  private async compute(): Promise<EnrichedLead[]> {
    const listId = process.env.CLICKUP_LIST_ID;
    if (!listId) {
      throw new Error('CLICKUP_LIST_ID not configured');
    }
    const tasks = await this.clickup.getTasksFromList(listId);
    // Inclui TODOS os estágios do pipeline; não filtramos por status.
    const ids = tasks.map((t: any) => t.id);
    // Origem dos leads é obtida exclusivamente do Supabase (tabela leads2), pela coluna 'origem', vinculando pelo 'clickupid'.
    const originMap = await this.supabase.findOriginsByClickupIds(ids);
    const enriched = tasks.map((t: any) => ({
      id: t.id,
      name: t.name,
      status: t.status?.status ?? t.status ?? '',
      origin: originMap[t.id] ?? null,
    }));
    // Atualiza cache
    this.cache = { data: enriched, timestamp: Date.now() };
    return enriched;
  }

  // Método original continua existindo para compatibilidade
  async getSummary(): Promise<EnrichedLead[]> {
    return this.compute();
  }

  // Método com cache e fallback de worker (timeout padrão 5s)
  async getSummaryCachedFallback(timeoutMs = 5000): Promise<EnrichedLead[]> {
    const now = Date.now();
    // Se cache fresco, retorna imediatamente
    if (this.cache && now - this.cache.timestamp < this.ttlMs) {
      return this.cache.data;
    }
    // Inicia computação se não houver uma em andamento
    if (!this.ongoing) {
      this.ongoing = this.compute().finally(() => {
        this.ongoing = null;
      });
    }
    // Espera no máximo timeoutMs pela computação. Se estourar o tempo, retorna cache antigo (stale) ou vazio.
    const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), timeoutMs));
    const result = await Promise.race([this.ongoing, timeoutPromise]);
    if (Array.isArray(result)) {
      return result as EnrichedLead[];
    }
    // Timeout: retorna cache antigo se existir, caso contrário, retorna lista vazia
    if (this.cache) {
      return this.cache.data;
    }
    return [];
  }
}