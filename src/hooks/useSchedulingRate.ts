import { useQuery } from "@tanstack/react-query";

interface SchedulingRateData {
  schedulingRate: number;
}

export function useSchedulingRate() {
  return useQuery<SchedulingRateData>({
    queryKey: ["funnel", "scheduling-rate"],
    queryFn: async () => {
      const response = await fetch("/api/funnel/scheduling-rate", {
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