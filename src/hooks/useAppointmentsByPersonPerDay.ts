import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'

export interface AppointmentByPersonPerDayItem {
  day: string
  agendado_por: string
  appointment_count: number
}

export function useAppointmentsByPersonPerDay(targetDate?: Date) {
  const dayStr = targetDate ? format(targetDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd')
  return useQuery<AppointmentByPersonPerDayItem[]>({
    queryKey: ['appointments-by-person-per-day', dayStr],
    queryFn: async () => {
      const params = new URLSearchParams()
      params.append('startDate', dayStr)
      params.append('endDate', dayStr)
      const url = `/api/dashboard/appointments-by-person-per-day?${params.toString()}`
      const res = await fetch(url)
      if (!res.ok) throw new Error(`Failed to fetch appointments by person per day: ${res.status}`)
      return res.json()
    },
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  })
}