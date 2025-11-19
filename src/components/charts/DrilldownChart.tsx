import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { useState, useMemo, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight, Filter, Eye, EyeOff } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { useCampaignDrilldown, DrilldownState, DrilldownItem } from '@/hooks/useCampaignDrilldown'

const COLORS = ['#3B82F6','#10B981','#F59E0B','#EF4444','#8B5CF6','#06B6D4','#84CC16','#F97316','#22C55E','#EAB308']

export function DrilldownChart() {
  const [drilldownState, setDrilldownState] = useState<DrilldownState>({ level: 'campaign', filters: { campaign: null, source: null } })
  const { data, isLoading, error } = useCampaignDrilldown(drilldownState)
  const [currentPage, setCurrentPage] = useState(0)
  const [itemsPerPage, setItemsPerPage] = useState(8)
  const [showAll, setShowAll] = useState(false)
  const [minLeadsFilter, setMinLeadsFilter] = useState(1)
  const [isMobile, setIsMobile] = useState(false)
  type ChartDatum = { label: string; fullName: string; value: number; percentage: string; color: string }
  type ActivePayload = { payload: ChartDatum }
  const [lastActivePayload, setLastActivePayload] = useState<ChartDatum | null>(null)

  useEffect(() => {
    const checkIsMobile = () => setIsMobile(window.innerWidth < 768)
    checkIsMobile()
    window.addEventListener('resize', checkIsMobile)
    return () => window.removeEventListener('resize', checkIsMobile)
  }, [])

  const processed = useMemo(() => {
    const items = (data || []).filter(d => d.value >= minLeadsFilter)
    const total = items.reduce((s, d) => s + d.value, 0)
    const chartData = items.map((item, idx) => {
      const maxLength = isMobile ? 12 : 20
      const label = item.name.length > maxLength ? `${item.name.substring(0, maxLength - 3)}...` : item.name
      return { 
        label, 
        fullName: item.name, 
        value: item.value, 
        percentage: total > 0 ? ((item.value / total) * 100).toFixed(1) : '0.0',
        color: COLORS[idx % COLORS.length]
      }
    })
    const totalPages = Math.ceil(chartData.length / itemsPerPage)
    const startIndex = currentPage * itemsPerPage
    const paginated = showAll ? chartData : chartData.slice(startIndex, startIndex + itemsPerPage)
    return { chartData: paginated, totalPages, total, allData: chartData }
  }, [data, currentPage, itemsPerPage, showAll, minLeadsFilter, isMobile])

  const chartHeight = showAll ? Math.max(400, processed.allData.length * 40) : 400
  const longest = processed.allData.reduce((m, d) => Math.max(m, d.fullName.length), 0)
  const charW = isMobile ? 7 : 8
  const basePad = isMobile ? 24 : 40
  const minW = isMobile ? 160 : 320
  const maxW = isMobile ? 280 : 560
  const yAxisWidth = Math.min(maxW, Math.max(minW, basePad + longest * charW))

  const onBarClick = (payload: ActivePayload | null | undefined) => {
    if (!payload || !payload.payload) return
    const name = payload.payload.fullName
    if (drilldownState.level === 'campaign') {
      setDrilldownState({ level: 'source', filters: { campaign: name, source: null } })
      setCurrentPage(0)
    } else if (drilldownState.level === 'source') {
      setDrilldownState({ level: 'content', filters: { campaign: drilldownState.filters.campaign, source: name } })
      setCurrentPage(0)
    }
  }

  const onChartClick = (state: { activePayload?: Array<ActivePayload>; isTooltipActive?: boolean } | undefined) => {
    const active = state?.activePayload?.[0]?.payload || lastActivePayload
    if (active) {
      onBarClick({ payload: active })
    }
  }

  const onChartMouseMove = (state: { activePayload?: Array<ActivePayload> } | undefined) => {
    const payload = state?.activePayload?.[0]?.payload
    if (payload) setLastActivePayload(payload)
  }

  const navigateTo = (level: 'campaign' | 'source') => {
    if (level === 'campaign') {
      setDrilldownState({ level: 'campaign', filters: { campaign: null, source: null } })
    } else {
      setDrilldownState({ level: 'source', filters: { campaign: drilldownState.filters.campaign, source: null } })
    }
    setCurrentPage(0)
  }

  const levelLabel = drilldownState.level === 'campaign' ? 'Campanhas' : drilldownState.level === 'source' ? 'Fontes' : 'Conteúdos'
  const isClickable = drilldownState.level !== 'content'

  if (isLoading) {
    return (
      <div className="h-80 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="h-80 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-2">Erro ao carregar drilldown</p>
          <p className="text-sm text-gray-500">{error instanceof Error ? error.message : 'Erro desconhecido'}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm">
        <span className="text-muted-foreground cursor-pointer" onClick={() => navigateTo('campaign')}>Todas as Campanhas</span>
        {drilldownState.filters.campaign && (
          <>
            <span className="text-muted-foreground">&gt;</span>
            <span className="text-muted-foreground cursor-pointer" onClick={() => navigateTo('source')}>{drilldownState.filters.campaign}</span>
          </>
        )}
        {drilldownState.filters.source && (
          <>
            <span className="text-muted-foreground">&gt;</span>
            <span className="text-foreground font-medium">{drilldownState.filters.source}</span>
          </>
        )}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center sm:gap-4">
        <div className="flex items-center gap-2" />
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <select
              value={minLeadsFilter}
              onChange={(e) => setMinLeadsFilter(Number(e.target.value))}
              className="text-sm border border-border rounded-md px-3 py-2 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent w-full sm:w-auto"
            >
              <option value={1}>Min: 1 lead</option>
              <option value={2}>Min: 2 leads</option>
              <option value={5}>Min: 5 leads</option>
              <option value={10}>Min: 10 leads</option>
            </select>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAll(!showAll)}
            className="flex items-center gap-2 w-full sm:w-auto justify-center"
          >
            {showAll ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            {showAll ? 'Paginar' : 'Ver Tudo'}
          </Button>
        </div>
      </div>

      <div style={{ height: showAll ? chartHeight : 400, cursor: isClickable ? 'pointer' : 'default' }} className="w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={processed.chartData} layout="vertical" margin={{ top: 20, right: 60, left: 0, bottom: 20 }} onClick={onChartClick} onMouseMove={onChartMouseMove} onMouseLeave={() => setLastActivePayload(null)} style={{ cursor: isClickable ? 'pointer' : 'default' }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
            <XAxis 
              type="number"
              stroke="hsl(var(--muted-foreground))"
              tickFormatter={(value) => isMobile ? `${Math.round(Number(value) / 1000)}k` : Number(value).toLocaleString()}
            />
            <YAxis 
              dataKey="fullName"
              type="category"
              stroke="hsl(var(--muted-foreground))"
              width={yAxisWidth}
              tick={{ fontSize: isMobile ? 11 : 12 }}
              interval={0}
            />
            <Tooltip content={<CustomDrilldownTooltip levelLabel={levelLabel} />} cursor={{ fill: 'rgba(255,255,255,0.25)' }} />
            <Bar dataKey="value" radius={[0, 4, 4, 0]} onClick={onBarClick} style={{ cursor: 'pointer' }}>
              {processed.chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {!showAll && processed.totalPages > 1 && (
        <div className="flex justify-center items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
            disabled={currentPage === 0}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground">
            Página {currentPage + 1} de {processed.totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(Math.min(processed.totalPages - 1, currentPage + 1))}
            disabled={currentPage === processed.totalPages - 1}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
        <div className="bg-muted/50 p-3 rounded-lg">
          <p className="text-muted-foreground text-xs mb-1">Principal {levelLabel.slice(0, -1)}</p>
          <p className="font-semibold text-sm truncate" title={processed.allData[0]?.fullName || 'N/A'}>
            {processed.allData[0]?.fullName || 'N/A'}
          </p>
          <Badge variant="secondary" className="text-xs mt-1">
            {processed.allData[0]?.value || 0} leads
          </Badge>
        </div>
        <div className="bg-muted/50 p-3 rounded-lg">
          <p className="text-muted-foreground text-xs mb-1">Itens Únicos</p>
          <p className="font-semibold text-sm">{processed.allData.length}</p>
          <Badge variant="secondary" className="text-xs mt-1">
            {processed.chartData.length} visíveis
          </Badge>
        </div>
        <div className="bg-muted/50 p-3 rounded-lg">
          <p className="text-muted-foreground text-xs mb-1">Concentração</p>
          <p className="font-semibold text-sm">
            {processed.allData.length > 0 
              ? ((processed.allData.slice(0, 3).reduce((sum, i) => sum + i.value, 0) / processed.total) * 100).toFixed(1)
              : 0}%
          </p>
          <Badge variant="secondary" className="text-xs mt-1">
            Top 3
          </Badge>
        </div>
        <div className="bg-muted/50 p-3 rounded-lg">
          <p className="text-muted-foreground text-xs mb-1">Média por Item</p>
          <p className="font-semibold text-sm">
            {processed.allData.length > 0 
              ? Math.round(processed.total / processed.allData.length)
              : 0}
          </p>
          <Badge variant="secondary" className="text-xs mt-1">
            leads/item
          </Badge>
        </div>
      </div>
    </div>
  )
}

function CustomDrilldownTooltip(props: { active?: boolean; payload?: Array<{ value: number; payload: ChartDatum }>; label?: string; levelLabel: string }) {
  const { active, payload, label, levelLabel } = props
  if (!active || !payload || !payload.length) return null
  const p = payload[0]
  const value = Number(p.value || 0)
  const titleLabel = (p?.payload?.fullName ?? label ?? '').toString()
  const percentage = (p?.payload?.percentage ?? '0.0').toString()
  const singular = levelLabel.endsWith('s') ? levelLabel.slice(0, -1) : levelLabel
  return (
    <div style={{
      backgroundColor: 'hsl(var(--background))',
      border: '1px solid hsl(var(--border))',
      borderRadius: 8,
      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
      padding: '8px 10px'
    }}>
      <div style={{ color: 'hsl(var(--foreground))', fontWeight: 700 }}>{`${singular}: ${titleLabel}`}</div>
      <div style={{ color: '#3B82F6', marginTop: 4 }}>{`Total : ${value.toLocaleString()} leads (${percentage}%)`}</div>
    </div>
  )
}