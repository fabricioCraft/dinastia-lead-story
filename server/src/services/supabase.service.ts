import { Injectable } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class SupabaseService {
  private client: SupabaseClient | null = null;
  constructor() {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_KEY;
    if (url && key) {
      this.client = createClient(url, key);
    }
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
}