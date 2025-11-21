import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useAppointmentsByPerson } from '@/hooks/useAppointmentsByPerson'
import { format, parseISO, differenceInDays } from 'date-fns'
import { useFilters } from '@/contexts/FilterContext'
import { KpiCard } from '@/components/KpiCard'
import { useMemo } from 'react'

const AppointmentsByPersonSkeleton = () => (
  <div className="space-y-6">
    <Card className="p-6 border-border/50">
      <div className="space-y-4">
        <div className="space-y-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="h-80 w-full flex items-end gap-1 animate-pulse">
          {Array.from({ length: 24 }).map((_, i) => (
            <div key={i} className="flex-1 bg-muted rounded-t" style={{ height: Math.random() * 200 + 50 }} />
          ))}
        </div>
      </div>
    </Card>
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i} className="p-4 border-border/50">
          <div className="space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-3 w-20" />
          </div>
        </Card>
      ))}
    </div>
  </div>
)

export function AppointmentsByPersonChart() {
  const { data, isLoading, error } = useAppointmentsByPerson()
  const { filters } = useFilters()

  if (isLoading) return <AppointmentsByPersonSkeleton />

  if (error) {
    return (
      <Card className="p-6 border-border/50">
        <div className="h-80 flex items-center justify-center">
          <div className="text-center">
            <p className="text-red-600 mb-2">Erro ao carregar agendamentos por pessoa</p>
            <p className="text-sm text-gray-500">
              {error instanceof Error ? error.message : 'Erro desconhecido'}
            </p>
          </div>
        </div>
      </Card>
    )
  }

  if (!data || data.length === 0) {
    return (
      <div className="space-y-6">
        <Card className="p-6 border-border/50">
          <div className="h-80 flex items-center justify-center">
            <div className="text-center">
              <p className="text-muted-foreground">Sem agendamentos no período selecionado</p>
            </div>
          </div>
        </Card>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
          <KpiCard title="Total de Agendamentos" value={0} subtitle="" />
          <KpiCard title="Principal Performer" value="N/A" subtitle={`0 agendamentos`} />
          <KpiCard title="Média Diária / Pessoa" value={"0.0"} />
          <KpiCard title="Dia de Pico" value="N/A" subtitle={`0 agendamentos`} />
        </div>
      </div>
    )
  }

  const pivotedData = data.reduce((acc: any[], item) => {
    const day = format(parseISO(item.day), 'dd/MM');
    let dayEntry = acc.find(entry => entry.day === day);
    if (!dayEntry) {
      dayEntry = { day };
      acc.push(dayEntry);
    }
    dayEntry[item.agendado_por] = item.appointment_count;
    return acc;
  }, []);

  const teamMembers = useMemo(() => {
    return Array.from(new Set(data.map(item => item.agendado_por))).sort((a, b) => a.localeCompare(b))
  }, [data])

  const colors = useMemo(() => {
    const n = teamMembers.length || 1
    return Array.from({ length: n }).map((_, i) => {
      const hue = (i * 137.508) % 360
      return `hsl(${Math.round(hue)}, 70%, 50%)`
    })
  }, [teamMembers])

  const startDate = filters.dateRange?.from
  const endDate = filters.dateRange?.to
  const kpiData = (() => {
    if (!data || data.length === 0) {
      return {
        totalAppointments: 0,
        topPerformer: { name: 'N/A', count: 0 },
        peakDay: { day: 'N/A', count: 0 },
        avgDailyPerPerson: '0.0'
      }
    }
    const totalAppointments = data.reduce((sum, item) => sum + (item.appointment_count || 0), 0)
    const performanceByPerson: Record<string, number> = {}
    data.forEach(item => {
      const name = String(item.agendado_por)
      performanceByPerson[name] = (performanceByPerson[name] || 0) + (item.appointment_count || 0)
    })
    let topPerformer = { name: 'N/A', count: 0 }
    Object.entries(performanceByPerson).forEach(([name, count]) => {
      if (count > topPerformer.count) topPerformer = { name, count }
    })
    const performanceByDay: Record<string, number> = {}
    data.forEach(item => {
      const dayKey = item.day
      performanceByDay[dayKey] = (performanceByDay[dayKey] || 0) + (item.appointment_count || 0)
    })
    let peakDayRaw = { day: 'N/A', count: 0 }
    Object.entries(performanceByDay).forEach(([day, count]) => {
      if (count > peakDayRaw.count) peakDayRaw = { day, count }
    })
    const formattedPeakDay = peakDayRaw.day !== 'N/A' ? format(parseISO(peakDayRaw.day), 'dd/MM/yyyy') : 'N/A'
    const numberOfDays = startDate && endDate ? differenceInDays(endDate, startDate) + 1 : 1
    const numberOfPeople = Object.keys(performanceByPerson).length || 1
    const avgDailyPerPerson = (totalAppointments / numberOfPeople) / (numberOfDays || 1)
    return {
      totalAppointments,
      topPerformer,
      peakDay: { day: formattedPeakDay, count: peakDayRaw.count },
      avgDailyPerPerson: avgDailyPerPerson.toFixed(1)
    }
  })()

  

  return (
    <div className="space-y-6">
      <Card className="p-6 card-glow border-border/50 hover:shadow-lg transition-shadow duration-300">
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={pivotedData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
              <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" />
              <YAxis stroke="hsl(var(--muted-foreground))" />
              <Tooltip
                formatter={(value: number, name: string) => [
                  `${value} agendamentos`,
                  name
                ]}
                labelStyle={{ color: 'hsl(var(--foreground))', fontWeight: 'bold' }}
                contentStyle={{
                  backgroundColor: 'hsl(var(--background))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                }}
              />
              <Legend />
              {teamMembers.map((member, index) => (
                <Bar
                  key={member}
                  dataKey={member}
                  stackId="a"
                  fill={colors[index]}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
        <KpiCard title="Total de Agendamentos" value={kpiData.totalAppointments} />
        <KpiCard title="Principal Performer" value={kpiData.topPerformer.name} subtitle={`${kpiData.topPerformer.count} agendamentos`} />
        <KpiCard title="Média Diária / Pessoa" value={kpiData.avgDailyPerPerson} />
        <KpiCard title="Dia de Pico" value={kpiData.peakDay.day} subtitle={`${kpiData.peakDay.count} agendamentos`} />
      </div>
    </div>
  )
}