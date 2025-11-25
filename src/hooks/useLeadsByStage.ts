

export interface LeadsByStageItem {
  stage_name: string;
  lead_count: number;
}

import { useQuery } from '@tanstack/react-query';
import { useFilters } from '@/contexts/FilterContext';

export interface LeadsByStageItem {
  stage_name: string;
  lead_count: number;
}

export function useLeadsByStage() {
  const { filters } = useFilters();

  return useQuery({
    queryKey: ['leads-by-stage', filters.selectedPeriod, filters.dateRange, filters.categoricalFilters],
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
      if (cf.scheduler) params.append('scheduler', cf.scheduler);

      const url = `/api/dashboard/leads-by-stage${params.toString() ? `?${params.toString()}` : ''}`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Erro ao buscar dados de leads por etapa: ${response.status}`);
      }

      return response.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 10 * 60 * 1000, // 10 minutos
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}
