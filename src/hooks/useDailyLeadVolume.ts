import { useQuery } from '@tanstack/react-query';

export interface DailyLeadVolumeData {
  day: string; // formato YYYY-MM-DD
  total_leads_per_day: number;
}

export interface DailyLeadVolumeFilters {
  startDate?: string;
  endDate?: string;
  days?: number;
}

/**
 * Hook para buscar dados de volume diário de leads
 * 
 * Este hook faz uma requisição para a API /api/dashboard/daily-lead-volume
 * e retorna os dados formatados para uso em componentes de gráfico.
 * 
 * Funcionalidades:
 * - Busca dados de volume diário de leads
 * - Suporte a filtros de período (startDate, endDate)
 * - Cache automático e revalidação
 * - Estados de loading e error
 * - Dados da tabela leads2 do Supabase
 * 
 * @param startDate - Data de início do período (opcional)
 * @param endDate - Data de fim do período (opcional)
 * @returns Objeto com dados, loading, error e função mutate
 */
export function useDailyLeadVolume(filters?: DailyLeadVolumeFilters) {
  return useQuery<DailyLeadVolumeData[]>({
    queryKey: ['daily-lead-volume', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      
      if (filters?.startDate) {
        params.append('startDate', filters.startDate);
      }
      
      if (filters?.endDate) {
        params.append('endDate', filters.endDate);
      }
      
      if (typeof filters?.days === 'number' && filters.days > 0) {
        params.append('days', String(filters.days));
      }
      
      const url = `/api/dashboard/daily-lead-volume${params.toString() ? `?${params.toString()}` : ''}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Erro ao buscar dados de volume diário: ${response.status}`);
      }
      
      return response.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutos
    refetchInterval: 10 * 60 * 1000, // Refetch a cada 10 minutos
  });
}