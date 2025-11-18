import React from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { useLeadClassification } from '@/hooks/useLeadClassification'
import { useFilters } from '@/contexts/FilterContext'
import { format } from 'date-fns'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'

const COLORS = [
  '#3B82F6','#10B981','#F59E0B','#EF4444','#8B5CF6','#06B6D4','#84CC16','#F97316','#22C55E','#EAB308'
]

export function LeadClassificationChart() {
  const { filters } = useFilters()
  const filterParams = filters.selectedPeriod
    ? { days: filters.selectedPeriod }
    : {
        startDate: filters.dateRange?.from ? format(filters.dateRange.from, 'yyyy-MM-dd') : undefined,
        endDate: filters.dateRange?.to ? format(filters.dateRange.to, 'yyyy-MM-dd') : undefined,
      }
  const { data, isLoading, error } = useLeadClassification(filterParams)

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-80 w-full flex items-center justify-center">
          <Skeleton className="h-72 w-72 rounded-full" />
        </div>
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

  const chartData = (data || []).map(item => ({
    name: item.classification_name,
    value: item.lead_count
  }))

  const total = chartData.reduce((sum, i) => sum + i.value, 0)

  return (
    <div>
      <div className="h-80 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={chartData} dataKey="value" nameKey="name" outerRadius={120} innerRadius={60}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip content={<CustomClassificationTooltip total={total} />} />
          </PieChart>
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
  const titleLabel = (payload[0]?.name ?? payload[0]?.payload?.name ?? label ?? '').toString()
  return (
    <div style={{
      backgroundColor: 'hsl(var(--background))',
      border: '1px solid hsl(var(--border))',
      borderRadius: 8,
      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
      padding: '8px 10px'
    }}>
      <div style={{ color: '#FFFFFF', fontWeight: 700 }}>{`Perfil: ${titleLabel}`}</div>
      <div style={{ color: '#3B82F6', marginTop: 4 }}>{`Total : ${value.toLocaleString()} leads (${percentage}%)`}</div>
    </div>
  )
}