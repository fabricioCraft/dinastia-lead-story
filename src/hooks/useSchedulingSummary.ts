import { useQuery } from '@tanstack/react-query';
import { useFilters } from '@/contexts/FilterContext';

export interface SchedulingSummaryData {
  totalLeads: number;
  totalAppointments: number;
  schedulingRate: number;
}

/**
 * Hook para buscar dados de resumo de agendamentos
 * Consome o endpoint /api/dashboard/scheduling-summary
 * @returns Query com dados de KPIs de agendamento
 */
export function useSchedulingSummary() {
  const { filters } = useFilters();

  return useQuery<SchedulingSummaryData>({
    queryKey: ['scheduling-summary', filters.selectedPeriod, filters.dateRange, filters.categoricalFilters],
    queryFn: async () => {
      const params = new URLSearchParams();

      if (filters.selectedPeriod) {
        params.append('days', filters.selectedPeriod.toString());
      } else if (filters.dateRange?.from && filters.dateRange?.to) {
        params.append('startDate', filters.dateRange.from.toISOString());
        params.append('endDate', filters.dateRange.to.toISOString());
      }

      const cf = filters.categoricalFilters || {};
      if (cf.campaign) params.append('campaign', cf.campaign);
      if (cf.source) params.append('source', cf.source);
      if (cf.content) params.append('content', cf.content);
      if (cf.classification) params.append('classification', cf.classification);
      if (cf.origin) params.append('origin', cf.origin);

      const url = `/api/dashboard/scheduling-summary${params.toString() ? `?${params.toString()}` : ''}`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Erro ao buscar dados de agendamentos: ${response.status}`);
      }

      return response.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutos
    refetchInterval: 10 * 60 * 1000, // Refetch a cada 10 minutos
    refetchOnWindowFocus: false,
  });
}
