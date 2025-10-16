import { useQuery } from '@tanstack/react-query';

export interface DailyLeadVolumeData {
  day: string; // formato YYYY-MM-DD
  total_leads_per_day: number;
}

export interface DailyLeadVolumeFilters {
  startDate?: string;
  endDate?: string;
}

/**
 * Hook para buscar dados de volume diário de leads
 * Combina dados das tabelas leads2 e MR_base_leads
 * @param filters Filtros de data (startDate e endDate)
 * @returns Query com dados de volume diário de leads
 */
export function useDailyLeadVolume(filters?: DailyLeadVolumeFilters) {
  return useQuery<DailyLeadVolumeData[]>({
    queryKey: ['daily-lead-volume', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      
      if (filters?.startDate) {
        params.append('startDate', filters.startDate);
      }
      
      if (filters?.endDate) {
        params.append('endDate', filters.endDate);
      }
      
      const url = `/api/dashboard/daily-lead-volume${params.toString() ? `?${params.toString()}` : ''}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Erro ao buscar dados de volume diário: ${response.status}`);
      }
      
      return response.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutos
    refetchInterval: 10 * 60 * 1000, // Refetch a cada 10 minutos
  });
}