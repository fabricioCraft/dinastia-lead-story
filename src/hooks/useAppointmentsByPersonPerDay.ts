import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import { useFilters } from '@/contexts/FilterContext'

export interface AppointmentByPersonPerDayItem {
  day: string
  agendado_por: string
  appointment_count: number
}

export function useAppointmentsByPersonPerDay(targetDate?: Date) {
  const { filters } = useFilters()
  const dayStr = targetDate ? format(targetDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd')

  return useQuery<AppointmentByPersonPerDayItem[]>({
    queryKey: ['appointments-by-person-per-day', dayStr, filters.categoricalFilters],
    queryFn: async () => {
      const params = new URLSearchParams()
      params.append('startDate', dayStr)
      params.append('endDate', dayStr)

      const cf = filters.categoricalFilters || {}
      if (cf.campaign) params.append('campaign', cf.campaign)
      if (cf.source) params.append('source', cf.source)
      if (cf.content) params.append('content', cf.content)
      if (cf?.classification) params.append('classification', cf.classification)
      if (cf?.origin) params.append('origin', cf.origin)
      if (cf?.scheduler) params.append('scheduler', cf.scheduler)

      const url = `/api/dashboard/appointments-by-person-per-day${params.toString() ? `?${params.toString()}` : ''}`
      const res = await fetch(url)
      if (!res.ok) throw new Error(`Failed to fetch appointments by person per day: ${res.status}`)
      return res.json()
    },
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  })
}