import { useQuery } from '@tanstack/react-query'
import { useFilters } from '@/contexts/FilterContext'
import { format } from 'date-fns'

export interface SummaryItem {
  name: string
  value: number
}

export function useSummaryByCampaign() {
  const { filters } = useFilters()

  const days = filters.selectedPeriod || undefined
  const startDate = !days && filters.dateRange?.from ? format(filters.dateRange.from, 'yyyy-MM-dd') : undefined
  const endDate = !days && filters.dateRange?.to ? format(filters.dateRange.to, 'yyyy-MM-dd') : undefined
  const cf = filters.categoricalFilters

  return useQuery<SummaryItem[]>({
    queryKey: ['summary-by-campaign', days, startDate, endDate, cf],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (typeof days === 'number' && days > 0) params.append('days', String(days))
      if (startDate) params.append('startDate', startDate)
      if (endDate) params.append('endDate', endDate)

      // Passar todos os filtros categóricos
      if (cf?.campaign) params.append('campaign', cf.campaign)
      if (cf?.source) params.append('source', cf.source)
      if (cf?.content) params.append('content', cf.content)
      if (cf?.classification) params.append('classification', cf.classification)

      const url = `/api/dashboard/summary-by-campaign${params.toString() ? `?${params.toString()}` : ''}`
      const res = await fetch(url)

      if (!res.ok) throw new Error(`Erro ao buscar resumo por campanha: ${res.status}`)

      return res.json()
    },
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  })
}
