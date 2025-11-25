import { useQuery } from "@tanstack/react-query";
import { useFilters } from "@/contexts/FilterContext";

interface SchedulingRateData {
  schedulingRate: number;
}

export function useSchedulingRate() {
  const { filters } = useFilters();

  return useQuery<SchedulingRateData>({
    queryKey: ["funnel", "scheduling-rate", filters.selectedPeriod, filters.dateRange, filters.categoricalFilters],
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

      const url = `/api/funnel/scheduling-rate${params.toString() ? `?${params.toString()}` : ''}`;

      const response = await fetch(url, {
        headers: { Accept: "application/json" }
      });

      if (!response.ok) {
        throw new Error("Falha ao carregar taxa de agendamento");
      }

      return response.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutos (mesmo cache do backend)
    refetchInterval: 10 * 60 * 1000, // 10 minutos
  });
}