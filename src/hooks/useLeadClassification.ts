import { useQuery } from '@tanstack/react-query'

export interface LeadClassificationData {
  classification_name: string
  lead_count: number
}

export function useLeadClassification() {
  return useQuery<LeadClassificationData[]>({
    queryKey: ['leads-by-classification'],
    queryFn: async () => {
      const response = await fetch('/api/dashboard/leads-by-classification')
      if (!response.ok) {
        throw new Error(`Erro ao buscar classificação de leads: ${response.status}`)
      }
      return response.json()
    },
    staleTime: 60 * 60 * 1000,
  })
}