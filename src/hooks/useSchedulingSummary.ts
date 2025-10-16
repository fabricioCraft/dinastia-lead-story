import { useQuery } from '@tanstack/react-query';

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
  return useQuery<SchedulingSummaryData>({
    queryKey: ['scheduling-summary'],
    queryFn: async () => {
      const response = await fetch('/api/dashboard/scheduling-summary');
      
      if (!response.ok) {
        throw new Error(`Erro ao buscar dados de agendamentos: ${response.status}`);
      }
      
      return response.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutos
    refetchInterval: 10 * 60 * 1000, // Refetch a cada 10 minutos
  });
}