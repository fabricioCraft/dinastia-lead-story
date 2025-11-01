import { useQuery } from '@tanstack/react-query';

export interface LeadsByStageItem {
  stage_name: string;
  lead_count: number;
}

async function fetchLeadsByStage(): Promise<LeadsByStageItem[]> {
  const response = await fetch('/api/dashboard/leads-by-stage');
  
  if (!response.ok) {
    throw new Error(`Erro ao buscar dados de leads por etapa: ${response.status}`);
  }
  
  return response.json();
}

export function useLeadsByStage() {
  return useQuery({
    queryKey: ['leads-by-stage'],
    queryFn: fetchLeadsByStage,
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 10 * 60 * 1000, // 10 minutos
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}