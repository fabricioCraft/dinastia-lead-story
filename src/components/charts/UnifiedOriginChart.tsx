import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useUnifiedOriginSummary } from '@/hooks/useUnifiedOriginSummary';
import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Filter, Eye, EyeOff } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface UnifiedOriginChartProps {
  threshold?: number;
}

/**
 * Gráfico de barras mostrando leads por origem unificada e normalizada
 * Combina dados das tabelas leads2.origem e MR_base_leads.utm_campaign
 * com regras de normalização para agrupar variações similares
 */
export function UnifiedOriginChart({ threshold = 10 }: UnifiedOriginChartProps) {
  const { data, isLoading, error } = useUnifiedOriginSummary();
  const [currentPage, setCurrentPage] = useState(0);
  const [itemsPerPage, setItemsPerPage] = useState(8);
  const [showAll, setShowAll] = useState(false);
  const [minLeadsFilter, setMinLeadsFilter] = useState(1);

  // Processamento dos dados com filtros
  const processedData = useMemo(() => {
    if (!data) return { chartData: [], totalPages: 0, filteredTotal: 0 };

    // Filtrar por número mínimo de leads
    let filteredData = data.filter(item => item.lead_count >= minLeadsFilter);

    // Preparar dados para o gráfico com cor única
    const chartData = filteredData.map(item => ({
      origem: item.origin_name.length > 20 ? `${item.origin_name.substring(0, 17)}...` : item.origin_name,
      origemCompleta: item.origin_name,
      leads: item.lead_count,
      percentage: ((item.lead_count / filteredData.reduce((sum, d) => sum + d.lead_count, 0)) * 100).toFixed(1)
    }));

    // Paginação
    const totalPages = Math.ceil(chartData.length / itemsPerPage);
    const startIndex = currentPage * itemsPerPage;
    const paginatedData = showAll ? chartData : chartData.slice(startIndex, startIndex + itemsPerPage);

    return {
      chartData: paginatedData,
      totalPages,
      filteredTotal: chartData.length,
      allData: chartData
    };
  }, [data, currentPage, itemsPerPage, showAll, minLeadsFilter]);

  // Calcular altura dinâmica do gráfico
  const chartHeight = showAll ? Math.max(400, processedData.allData.length * 40) : 400;

  if (isLoading) {
    return (
      <div className="h-80 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-80 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-2">Erro ao carregar dados de origem unificada</p>
          <p className="text-sm text-gray-500">
            {error instanceof Error ? error.message : 'Erro desconhecido'}
          </p>
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="h-80 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-2">Nenhum dado de origem encontrado</p>
          <p className="text-sm text-gray-500">Verifique se existem leads cadastrados no sistema</p>
        </div>
      </div>
    );
  }

  const totalLeads = data.reduce((sum, item) => sum + item.lead_count, 0);

  return (
    <div className="space-y-4">
      {/* Controles */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-2">
          {/* Badges removidas conforme solicitado */}
        </div>

        <div className="flex items-center gap-2">
          {/* Filtro de leads mínimos */}
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <select
              value={minLeadsFilter}
              onChange={(e) => setMinLeadsFilter(Number(e.target.value))}
              className="text-sm border border-border rounded-md px-3 py-2 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value={1}>Min: 1 lead</option>
              <option value={2}>Min: 2 leads</option>
              <option value={5}>Min: 5 leads</option>
              <option value={10}>Min: 10 leads</option>
            </select>
          </div>

          {/* Toggle mostrar tudo */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAll(!showAll)}
            className="flex items-center gap-2"
          >
            {showAll ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            {showAll ? 'Paginar' : 'Ver Tudo'}
          </Button>
        </div>
      </div>

      {/* Gráfico */}
      <div style={{ height: showAll ? chartHeight : 400 }} className="w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={processedData.chartData}
            layout="vertical"
            margin={{
              top: 20,
              right: 60,
              left: 140,
              bottom: 20,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
            <XAxis 
              type="number"
              fontSize={11}
              stroke="hsl(var(--muted-foreground))"
              tickFormatter={(value) => value.toLocaleString()}
            />
            <YAxis 
              dataKey="origem"
              type="category"
              fontSize={11}
              stroke="hsl(var(--muted-foreground))"
              width={130}
              tick={{ fontSize: 11 }}
            />
            <Tooltip 
              formatter={(value: number, name, props) => [
                `${value.toLocaleString()} leads (${props.payload.percentage}%)`,
                'Total'
              ]}
              labelFormatter={(label, payload) => {
                const item = payload?.[0]?.payload;
                return item?.origemCompleta || label;
              }}
              labelStyle={{ color: 'hsl(var(--foreground))', fontWeight: 'bold' }}
              contentStyle={{
                backgroundColor: 'hsl(var(--background))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
              }}
            />
            <Bar 
              dataKey="leads" 
              radius={[0, 4, 4, 0]}
              fill="#3B82F6"
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Paginação (apenas quando não está mostrando tudo) */}
      {!showAll && processedData.totalPages > 1 && (
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
            Página {currentPage + 1} de {processedData.totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(Math.min(processedData.totalPages - 1, currentPage + 1))}
            disabled={currentPage === processedData.totalPages - 1}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Estatísticas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
        <div className="bg-muted/50 p-3 rounded-lg">
          <p className="text-muted-foreground text-xs mb-1">Principal Origem</p>
          <p className="font-semibold text-sm">{data[0]?.origin_name || 'N/A'}</p>
          <Badge variant="secondary" className="text-xs mt-1">
            {data[0]?.lead_count || 0} leads
          </Badge>
        </div>
        <div className="bg-muted/50 p-3 rounded-lg">
          <p className="text-muted-foreground text-xs mb-1">Origens Únicas</p>
          <p className="font-semibold text-sm">{data.length}</p>
          <Badge variant="secondary" className="text-xs mt-1">
            {processedData.filteredTotal} visíveis
          </Badge>
        </div>
        <div className="bg-muted/50 p-3 rounded-lg">
          <p className="text-muted-foreground text-xs mb-1">Concentração</p>
          <p className="font-semibold text-sm">
            {data.length > 0 
              ? ((data.slice(0, 3).reduce((sum, item) => sum + item.lead_count, 0) / totalLeads) * 100).toFixed(1)
              : 0}%
          </p>
          <Badge variant="secondary" className="text-xs mt-1">
            Top 3 origens
          </Badge>
        </div>
        <div className="bg-muted/50 p-3 rounded-lg">
          <p className="text-muted-foreground text-xs mb-1">Média por Origem</p>
          <p className="font-semibold text-sm">
            {data.length > 0 
              ? Math.round(totalLeads / data.length)
              : 0}
          </p>
          <Badge variant="secondary" className="text-xs mt-1">
            leads/origem
          </Badge>
        </div>
      </div>
    </div>
  );
}