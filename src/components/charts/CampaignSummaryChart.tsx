import { useMemo } from 'react'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from 'recharts'
import { BarChartSkeleton } from '@/components/charts/BarChartSkeleton'
import { useSummaryByCampaign } from '@/hooks/useSummaryByCampaign'
import { useFilters } from '@/contexts/FilterContext'
import { Badge } from '@/components/ui/badge'

const COLORS = ['#3B82F6','#10B981','#F59E0B','#EF4444','#8B5CF6','#06B6D4','#84CC16','#F97316','#22C55E','#EAB308']

export function CampaignSummaryChart() {
  const { data, isLoading, error } = useSummaryByCampaign()
  const { setCategoricalFilter } = useFilters()

  const isMobile = useMemo(() => typeof window !== 'undefined' && window.innerWidth < 768, [])
  const wrap = (v: any) => {
    const s = String(v ?? '')
    const limit = isMobile ? 28 : 40
    if (s.length <= limit) return s
    const sep = s.indexOf(' | ')
    if (sep > 0 && sep <= limit + 6) return `${s.slice(0, sep + 3)}\n${s.slice(sep + 3)}`
    const idx = s.lastIndexOf(' ', limit)
    const split = idx > 0 ? idx : limit
    return `${s.slice(0, split)}\n${s.slice(split)}`
  }
  const processed = useMemo(() => {
    const items = (data || [])
    const total = items.reduce((s, d) => s + d.value, 0)
    const chartData = items.map((item, idx) => ({
      fullName: item.name,
      value: item.value,
      percentage: total > 0 ? ((item.value / total) * 100).toFixed(1) : '0.0',
      color: COLORS[idx % COLORS.length]
    }))
    const longest = chartData.reduce((m, d) => Math.max(m, d.fullName.length), 0)
    const charW = isMobile ? 7 : 8
    const basePad = isMobile ? 24 : 40
    const minW = isMobile ? 160 : 320
    const yAxisWidth = Math.max(minW, basePad + longest * charW)
    const chartHeight = Math.max(360, chartData.length * (isMobile ? 40 : 44))
    return { chartData, total, yAxisWidth, chartHeight }
  }, [data, isMobile])

  if (isLoading) {
    return <BarChartSkeleton />
  }

  if (error) {
    return (
      <div className="h-80 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-2">Erro ao carregar resumo por campanha</p>
          <p className="text-sm text-muted-foreground">{error instanceof Error ? error.message : 'Erro desconhecido'}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full">
      <div style={{ height: processed.chartHeight }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={processed.chartData} layout="vertical" margin={{ top: 20, right: 60, left: 12, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
          <XAxis 
            type="number"
            stroke="hsl(var(--muted-foreground))"
            domain={[0, 'dataMax']}
            tickFormatter={(v: number) => v.toLocaleString()}
          />
          <YAxis 
            dataKey="fullName"
            type="category"
            stroke="hsl(var(--muted-foreground))"
            width={processed.yAxisWidth}
            interval={0}
            tickFormatter={wrap}
          />
          {(() => {
            const ClickableCursor = (props: any) => {
              const ap = (props && (props as any).payload) || (props && (props as any).activePayload)
              const name = ap?.[0]?.payload?.fullName
              const { x, y, width, height } = props as any
              return (
                <rect
                  x={x}
                  y={y}
                  width={width}
                  height={height}
                  fill={'hsl(var(--muted))'}
                  opacity={0.12}
                  onClick={() => { if (name) setCategoricalFilter('campaign', name) }}
                />
              )
            }
            return (
              <Tooltip 
                content={<CustomUTMTooltip total={processed.total} title="Campanha" />}
                cursor={<ClickableCursor />}
              />
            )
          })()}
          <Bar dataKey="value" radius={[0, 4, 4, 0]} onClick={(data) => {
            const name = (data && (data as any).payload && (data as any).payload.fullName) || undefined
            if (name) setCategoricalFilter('campaign', name)
          }}>
            {processed.chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mt-4 w-full overflow-x-hidden">
        <div className="rounded-xl bg-muted/40 border border-border/50 p-4">
          <p className="text-xs text-muted-foreground mb-2">Total de Leads</p>
          <Badge variant="secondary" className="px-2.5 py-1 text-xs font-semibold whitespace-normal break-words max-w-full">
            {processed.total.toLocaleString()}
          </Badge>
          <p className="text-xs text-muted-foreground mt-2">soma dos itens</p>
        </div>
        <div className="rounded-xl bg-muted/40 border border-border/50 p-4">
          <p className="text-xs text-muted-foreground mb-2">Principal Campanha</p>
          <Badge variant="secondary" className="px-2.5 py-1 text-xs font-semibold whitespace-normal break-words max-w-full" title={processed.chartData[0]?.fullName || 'N/A'}>
            {processed.chartData[0]?.fullName || 'N/A'}
          </Badge>
          <p className="text-xs text-muted-foreground mt-2">{(processed.chartData[0]?.value || 0).toLocaleString()} leads</p>
        </div>
        <div className="rounded-xl bg-muted/40 border border-border/50 p-4">
          <p className="text-xs text-muted-foreground mb-2">Média por Item</p>
          <Badge variant="secondary" className="px-2.5 py-1 text-xs font-semibold">
            {processed.chartData.length > 0 ? Math.round(processed.total / processed.chartData.length).toLocaleString() : '0'}
          </Badge>
          <p className="text-xs text-muted-foreground mt-2">leads/item</p>
        </div>
        <div className="rounded-xl bg-muted/40 border border-border/50 p-4">
          <p className="text-xs text-muted-foreground mb-2">Concentração Top 3</p>
          <Badge variant="secondary" className="px-2.5 py-1 text-xs font-semibold">
            {processed.chartData.length > 0 
              ? ((processed.chartData.slice(0, 3).reduce((sum, i) => sum + i.value, 0) / processed.total) * 100).toFixed(1)
              : '0'}%
          </Badge>
          <p className="text-xs text-muted-foreground mt-2">top 3</p>
        </div>
      </div>
    </div>
  )
}

function CustomUTMTooltip({ active, payload, label, total, title }: any) {
  if (!active || !payload || !payload.length) return null
  const value = Number(payload[0].value || 0)
  const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : '0.0'
  const titleLabel = (payload[0]?.payload?.fullName ?? label ?? '').toString()
  return (
    <div style={{
      backgroundColor: 'hsl(var(--background))',
      border: '1px solid hsl(var(--border))',
      borderRadius: 8,
      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
      padding: '8px 10px'
    }}>
      <div style={{ color: 'hsl(var(--foreground))', fontWeight: 700 }}>{`${title}: ${titleLabel}`}</div>
      <div style={{ color: 'hsl(var(--secondary))', marginTop: 4 }}>{`Total : ${value.toLocaleString()} leads (${percentage}%)`}</div>
    </div>
  )
}
