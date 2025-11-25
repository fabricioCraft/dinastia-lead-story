import { useQuery } from '@tanstack/react-query';
import { useFilters } from '@/contexts/FilterContext';

export interface DailyAppointmentsData {
  day: string; // formato YYYY-MM-DD
  appointments_per_day: number;
}

export interface DailyAppointmentsFilters {
  startDate?: string;
  endDate?: string;
  days?: number;
}

/**
 * Hook para buscar dados de volume diário de agendamentos
 * Consome o endpoint /api/dashboard/daily-appointments
 * @param filters Filtros de data (startDate e endDate)
 * @returns Query com dados de agendamentos por dia
 */
export function useDailyAppointments(filters?: DailyAppointmentsFilters) {
  const { filters: contextFilters } = useFilters();

  return useQuery<DailyAppointmentsData[]>({
    queryKey: ['daily-appointments', filters, contextFilters.categoricalFilters],
    queryFn: async () => {
      const params = new URLSearchParams();

      if (filters?.startDate) {
        params.append('startDate', filters.startDate);
      }

      if (filters?.endDate) {
        params.append('endDate', filters.endDate);
      }

      if (typeof filters?.days === 'number' && filters.days > 0) {
        params.append('days', String(filters.days));
      }

      const cf = contextFilters.categoricalFilters || {};
      if (cf.campaign) params.append('campaign', cf.campaign);
      if (cf.source) params.append('source', cf.source);
      if (cf.content) params.append('content', cf.content);
      if (cf.classification) params.append('classification', cf.classification);
      if (cf.origin) params.append('origin', cf.origin);

      const url = `/api/dashboard/daily-appointments${params.toString() ? `?${params.toString()}` : ''}`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Erro ao buscar dados de agendamentos diários: ${response.status}`);
      }

      return response.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutos
    refetchInterval: 10 * 60 * 1000, // Refetch a cada 10 minutos
    refetchOnWindowFocus: false,
  });
}
