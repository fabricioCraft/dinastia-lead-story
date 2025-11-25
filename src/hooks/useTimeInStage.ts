import { useQuery } from "@tanstack/react-query";
import { useFilters } from "@/contexts/FilterContext";

export interface TimeInStageItem {
  stage: string;
  averageTimeInDays: number;
  averageTimeInSeconds: number;
}

interface FilterParams {
  days?: number;
  from?: Date;
  to?: Date;
}

export function useTimeInStage(customFilters?: FilterParams) {
  const { filters } = useFilters();
  
  // Usar filtros customizados se fornecidos, senão usar do contexto
  const activeFilters = customFilters || {
    days: filters.selectedPeriod || undefined,
    from: filters.dateRange?.from || undefined,
    to: filters.dateRange?.to || undefined,
  };

  return useQuery<TimeInStageItem[]>({
    queryKey: ["funnel", "time-in-stage", activeFilters, filters.categoricalFilters],
    queryFn: async () => {
      const params = new URLSearchParams();
      
      if (activeFilters.days) {
        params.append('days', activeFilters.days.toString());
      }
      
      if (activeFilters.from && activeFilters.to) {
        params.append('from', activeFilters.from.toISOString());
        params.append('to', activeFilters.to.toISOString());
      }
      

      const cf = filters.categoricalFilters || {};
      if (cf.campaign) params.append('campaign', cf.campaign);
      if (cf.source) params.append('source', cf.source);
      if (cf.content) params.append('content', cf.content);
      if (cf.classification) params.append('classification', cf.classification);
      
      const url = `/api/funnel/time-in-stage${params.toString() ? `?${params.toString()}` : ''}`;
      
      const response = await fetch(url, {
        headers: { Accept: "application/json" }
      });
      
      if (!response.ok) {
        throw new Error("Falha ao carregar dados de tempo por estágio");
      }
      
      return response.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutos (alinhado com o cache do backend)
    refetchInterval: 10 * 60 * 1000, // 10 minutos
  });
}
