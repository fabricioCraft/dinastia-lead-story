import { useQuery } from '@tanstack/react-query'

export interface LeadClassificationData {
  classification_name: string
  lead_count: number
}

export interface LeadClassificationFilters {
  startDate?: string;
  endDate?: string;
  days?: number;
}

export function useLeadClassification(filters?: LeadClassificationFilters) {
  return useQuery<LeadClassificationData[]>({
    queryKey: ['leads-by-classification', filters],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (filters?.startDate) params.append('startDate', filters.startDate)
      if (filters?.endDate) params.append('endDate', filters.endDate)
      if (typeof filters?.days === 'number' && filters.days > 0) params.append('days', String(filters.days))
      const url = `/api/dashboard/leads-by-classification${params.toString() ? `?${params.toString()}` : ''}`
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`Erro ao buscar classificação de leads: ${response.status}`)
      }
      return response.json()
    },
    staleTime: 5 * 60 * 1000,
    refetchInterval: 10 * 60 * 1000,
  })
}