import React from 'react'
import { BarChartSkeleton } from '@/components/charts/BarChartSkeleton'
import { useLeadClassification } from '@/hooks/useLeadClassification'
import { useFilters } from '@/contexts/FilterContext'
import { format } from 'date-fns'
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'

const COLORS = [
  '#3B82F6','#10B981','#F59E0B','#EF4444','#8B5CF6','#06B6D4','#84CC16','#F97316','#22C55E','#EAB308'
]

export function LeadClassificationChart() {
  const { filters, setCategoricalFilter } = useFilters()
  const cf = filters.categoricalFilters
  const filterParams = filters.selectedPeriod
    ? { days: filters.selectedPeriod, ...cf }
    : {
        startDate: filters.dateRange?.from ? format(filters.dateRange.from, 'yyyy-MM-dd') : undefined,
        endDate: filters.dateRange?.to ? format(filters.dateRange.to, 'yyyy-MM-dd') : undefined,
        ...cf,
      }
  const { data, isLoading, error } = useLeadClassification(filterParams)

  if (isLoading) {
    return (
      <div className="space-y-4">
        <BarChartSkeleton />
      </div>
    )
  }

  if (error) {
    return (
      <div className="h-80 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-2">Erro ao carregar classificação dos leads</p>
          <p className="text-sm text-gray-500">{error instanceof Error ? error.message : 'Erro desconhecido'}</p>
        </div>
      </div>
    )
  }

  const baseData = (data || [])
    .filter(item => item.classification_name)
    .map(item => ({
      name: item.classification_name,
      value: item.lead_count
    }))

  const total = baseData.reduce((sum, i) => sum + i.value, 0)
  const chartData = baseData.map(i => ({
    ...i,
    percentage: total > 0 ? Number(((i.value / total) * 100).toFixed(1)) : 0
  }))

  return (
    <div>
      <div className="h-80 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
            <XAxis dataKey="name" tickLine={false} axisLine={false} stroke="hsl(var(--muted-foreground))" />
            <YAxis yAxisId="left" tickLine={false} axisLine={false} allowDecimals={false} stroke="hsl(var(--muted-foreground))" />
            <YAxis yAxisId="right" orientation="right" domain={[0, 100]} tickFormatter={(v) => `${v}%`} tickLine={false} axisLine={false} stroke="hsl(var(--muted-foreground))" />
            <Tooltip content={<CustomClassificationTooltip total={total} />} cursor={{ fill: 'hsl(var(--muted))', opacity: 0.2 }} />
            <Bar yAxisId="left" dataKey="value" radius={[6, 6, 0, 0]} onClick={(data) => {
              const name = (data && (data as any).payload && (data as any).payload.name) || undefined
              if (name) setCategoricalFilter('classification', String(name))
            }}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Bar>
            <Line yAxisId="right" type="monotone" dataKey="percentage" stroke="#10B981" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <div className="flex justify-between items-center mt-4 text-xs text-muted-foreground">
        <span>Total: {total.toLocaleString()} leads</span>
        <span>Atualizado automaticamente</span>
      </div>
    </div>
  )
}

function CustomClassificationTooltip({ active, payload, label, total }: any) {
  if (!active || !payload || !payload.length) return null
  const value = Number(payload[0].value || 0)
  const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : '0.0'
  const titleLabel = (payload[0]?.payload?.name ?? label ?? '').toString()
  return (
    <div style={{
      backgroundColor: 'hsl(var(--background))',
      border: '1px solid hsl(var(--border))',
      borderRadius: 8,
      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
      padding: '8px 10px'
    }}>
      <div style={{ color: 'hsl(var(--foreground))', fontWeight: 700 }}>{`Perfil: ${titleLabel}`}</div>
      <div style={{ color: '#3B82F6', marginTop: 4 }}>{`Total : ${value.toLocaleString()} leads (${percentage}%)`}</div>
    </div>
  )
}
