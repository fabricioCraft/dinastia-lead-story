import { useQuery } from '@tanstack/react-query'

export type DrilldownLevel = 'campaign' | 'source' | 'content'

export interface DrilldownState {
  level: DrilldownLevel
  filters: { campaign: string | null; source: string | null }
}

export interface DrilldownItem {
  name: string
  value: number
}

export function useCampaignDrilldown(state: DrilldownState, view: DrilldownLevel, filters?: { startDate?: string; endDate?: string; days?: number }) {
  return useQuery<DrilldownItem[]>({
    queryKey: ['campaign-drilldown', view, state, filters],
    queryFn: async () => {
      const params = new URLSearchParams()
      params.set('viewBy', view)
      if (state.filters.campaign) params.set('campaign', state.filters.campaign)
      if (state.filters.source) params.set('source', state.filters.source)
      if (typeof filters?.days === 'number' && filters.days > 0) params.set('days', String(filters.days))
      if (filters?.startDate) params.set('startDate', filters.startDate)
      if (filters?.endDate) params.set('endDate', filters.endDate)
      const url = `/api/dashboard/campaign-drilldown${params.toString() ? `?${params.toString()}` : ''}`
      const res = await fetch(url)
      if (!res.ok) throw new Error(`Erro ao buscar drilldown: ${res.status}`)
      return res.json()
    },
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
  })
}