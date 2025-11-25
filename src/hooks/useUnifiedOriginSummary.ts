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
    queryKey: ['unified-origin-summary', filters.selectedPeriod, filters.dateRange, filters.categoricalFilters],
    queryFn: async () => {
      const params = new URLSearchParams();
      
      // Adicionar filtros de período
      if (filters.selectedPeriod) {
        params.append('days', filters.selectedPeriod.toString());
      } else if (filters.dateRange?.from && filters.dateRange?.to) {
        params.append('from', filters.dateRange.from.toISOString());
        params.append('to', filters.dateRange.to.toISOString());
      }

      const cf = filters.categoricalFilters || {};
      if (cf.campaign) params.append('campaign', cf.campaign);
      if (cf.source) params.append('source', cf.source);
      if (cf.content) params.append('content', cf.content);
      if (cf.classification) params.append('classification', cf.classification);
      if (cf.origin) params.append('origin', cf.origin);

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
