import { useQuery } from '@tanstack/react-query';
import { useFilters } from '@/contexts/FilterContext';

export interface UnifiedOriginSummaryData {
  origin_name: string;
  lead_count: number;
}

/**
 * Hook para buscar dados unificados e normalizados de origem de leads
 * Combina dados das tabelas leads2.origem e MR_base_leads.utm_campaign
 * e aplica regras de normalização para agrupar variações similares
 * @returns Query com dados de origem unificada e normalizada
 */
export function useUnifiedOriginSummary() {
  const { filters } = useFilters();

  return useQuery<UnifiedOriginSummaryData[]>({
    queryKey: ['unified-origin-summary', filters.selectedPeriod, filters.dateRange],
    queryFn: async () => {
      const params = new URLSearchParams();
      
      // Adicionar filtros de período
      if (filters.selectedPeriod) {
        params.append('days', filters.selectedPeriod.toString());
      } else if (filters.dateRange?.from && filters.dateRange?.to) {
        params.append('from', filters.dateRange.from.toISOString());
        params.append('to', filters.dateRange.to.toISOString());
      }

      const url = `/api/dashboard/unified-origin-summary${params.toString() ? `?${params.toString()}` : ''}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Erro ao buscar dados de origem unificada: ${response.status}`);
      }
      
      return response.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutos
    refetchInterval: 10 * 60 * 1000, // Refetch a cada 10 minutos
  });
}