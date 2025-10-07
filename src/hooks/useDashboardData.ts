import { useQuery } from "@tanstack/react-query";
import { usePeriod } from "@/contexts/PeriodContext";

interface DashboardKpis {
  totalLeads: number;
}

interface LeadsByOrigin {
  origin: string;
  count: number;
}

interface LeadsByCampaign {
  campaign: string;
  count: number;
}

interface DashboardData {
  kpis: DashboardKpis;
  leadsByOrigin: LeadsByOrigin[];
  leadsByCampaign: LeadsByCampaign[];
}

export function useDashboardData() {
  const { selectedPeriod } = usePeriod();

  return useQuery<DashboardData>({
    queryKey: ["dashboard", "origin-summary", selectedPeriod],
    queryFn: async () => {
      const url = selectedPeriod 
        ? `/api/dashboard/origin-summary?days=${selectedPeriod}`
        : "/api/dashboard/origin-summary";
      
      const response = await fetch(url, {
        headers: { Accept: "application/json" }
      });
      
      if (!response.ok) {
        throw new Error("Falha ao carregar dados do dashboard");
      }
      
      return response.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutos
    refetchInterval: 10 * 60 * 1000, // 10 minutos
  });
}