import { useQuery } from '@tanstack/react-query';

export interface StageSummaryItem {
  stage: string;
  count: number;
}

async function fetchStagesSummary(): Promise<StageSummaryItem[]> {
  const response = await fetch('/api/funnel/stages-summary');
  
  if (!response.ok) {
    throw new Error(`Erro ao buscar dados de funil: ${response.status}`);
  }
  
  return response.json();
}

export function useStagesSummary() {
  return useQuery({
    queryKey: ['stages-summary'],
    queryFn: fetchStagesSummary,
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 10 * 60 * 1000, // 10 minutos
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}