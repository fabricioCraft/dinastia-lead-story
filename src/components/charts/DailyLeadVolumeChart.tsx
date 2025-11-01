import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useDailyLeadVolume } from '@/hooks/useDailyLeadVolume';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useFilters } from '@/contexts/FilterContext';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { TrendingUp, Calendar } from 'lucide-react';

/**
 * Skeleton loader para o gráfico de volume diário de leads
 */
const DailyLeadVolumeChartSkeleton = () => {
  return (
    <Card className="p-6 border-border/50">
      <div className="space-y-4">
        {/* Header skeleton */}
        <div className="space-y-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        
        {/* Chart skeleton */}
        <div className="h-80 w-full flex items-end gap-1 animate-pulse">
          {Array.from({ length: 30 }).map((_, i) => (
            <div 
              key={i} 
              className="flex-1 bg-muted rounded-t" 
              style={{ height: Math.random() * 200 + 50 }} 
            />
          ))}
        </div>
        
        {/* Footer skeleton */}
        <div className="flex justify-between items-center">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-24" />
        </div>
      </div>
    </Card>
  );
};

/**
 * Gráfico de Volume Diário de Leads
 * 
 * Este componente exibe a evolução diária do volume de leads ao longo do tempo.
 * Os dados são obtidos através do hook useDailyLeadVolume que faz uma requisição
 * para a API /api/dashboard/daily-lead-volume.
 * 
 * Funcionalidades:
 * - Exibe um gráfico de linha mostrando o volume diário de leads
 * - Calcula e exibe estatísticas como total, média e pico diário
 * - Suporte a filtros de período através do contexto PeriodContext
 * - Responsivo e otimizado para diferentes tamanhos de tela
 * 
 * Dados:
 * - Fonte: API endpoint /api/dashboard/daily-lead-volume
 * - Dados da tabela leads2 do Supabase
 * - Agrupamento por dia (YYYY-MM-DD)
 * - Ordenação cronológica
 * 
 * @component
 * @example
 * ```tsx
 * <DailyLeadVolumeChart />
 * ```
 */
export function DailyLeadVolumeChart() {
  const { filters } = useFilters();
  
  // Construir objeto de filtros para o hook
  // Usar formatação local para evitar problemas de fuso horário
  const filterParams = {
    startDate: filters.dateRange?.from ? format(filters.dateRange.from, 'yyyy-MM-dd') : undefined,
    endDate: filters.dateRange?.to ? format(filters.dateRange.to, 'yyyy-MM-dd') : undefined,
  };
  
  const { data, isLoading, error } = useDailyLeadVolume(filterParams);

  // Processar dados para o gráfico
  const chartData = data?.map(item => ({
    day: item.day,
    leads: item.total_leads_per_day,
    formattedDate: format(parseISO(item.day), 'dd/MM', { locale: ptBR }),
    fullDate: format(parseISO(item.day), 'dd \'de\' MMMM \'de\' yyyy', { locale: ptBR })
  })) || [];

  // Calcular estatísticas
  const totalLeads = chartData.reduce((sum, item) => sum + item.leads, 0);
  const averageLeads = chartData.length > 0 ? Math.round(totalLeads / chartData.length) : 0;
  const maxLeads = Math.max(...chartData.map(item => item.leads), 0);

  if (isLoading) {
    return <DailyLeadVolumeChartSkeleton />;
  }

  if (error) {
    return (
      <Card className="p-6 border-border/50">
        <div className="h-80 flex items-center justify-center">
          <div className="text-center">
            <p className="text-red-600 mb-2">Erro ao carregar dados de volume diário</p>
            <p className="text-sm text-gray-500">
              {error instanceof Error ? error.message : 'Erro desconhecido'}
            </p>
          </div>
        </div>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card className="p-6 border-border/50">
        <div className="h-80 flex items-center justify-center">
          <div className="text-center">
            <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Nenhum dado de volume diário disponível</p>
            <p className="text-sm text-muted-foreground mt-2">
              Tente ajustar o período selecionado
            </p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6 card-glow border-border/50 hover:shadow-lg transition-shadow duration-300">
      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <TrendingUp className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-semibold text-foreground">Volume Diário de Leads</h3>
      </div>
      
      <p className="text-sm text-muted-foreground">
                Evolução diária da aquisição de leads
              </p>

      {/* Estatísticas */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="text-center">
          <p className="text-2xl font-bold text-primary">{totalLeads.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground">Total de Leads</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-blue-600">{averageLeads.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground">Média Diária</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-green-600">{maxLeads.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground">Pico Diário</p>
        </div>
      </div>

      {/* Gráfico */}
      <div className="h-80 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            margin={{
              top: 20,
              right: 30,
              left: 20,
              bottom: 20,
            }}
          >
            <CartesianGrid 
              strokeDasharray="3 3" 
              stroke="hsl(var(--border))" 
              opacity={0.3} 
            />
            <XAxis 
              dataKey="formattedDate"
              fontSize={11}
              stroke="hsl(var(--muted-foreground))"
              tick={{ fontSize: 11 }}
              interval="preserveStartEnd"
            />
            <YAxis 
              fontSize={11}
              stroke="hsl(var(--muted-foreground))"
              tickFormatter={(value) => value.toLocaleString()}
            />
            <Tooltip 
              formatter={(value: number) => [
                `${value.toLocaleString()} leads`,
                'Volume Diário'
              ]}
              labelFormatter={(label, payload) => {
                const item = payload?.[0]?.payload;
                return item?.fullDate || label;
              }}
              labelStyle={{ 
                color: 'hsl(var(--foreground))', 
                fontWeight: 'bold' 
              }}
              contentStyle={{
                backgroundColor: 'hsl(var(--background))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
              }}
            />
            <Line 
              type="monotone"
              dataKey="leads" 
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              dot={{ 
                fill: 'hsl(var(--primary))', 
                strokeWidth: 2,
                r: 4
              }}
              activeDot={{ 
                r: 6, 
                stroke: 'hsl(var(--primary))',
                strokeWidth: 2,
                fill: 'hsl(var(--background))'
              }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Footer */}
      <div className="flex justify-between items-center mt-4 text-xs text-muted-foreground">
        <span>Período: {chartData.length} dias</span>
        <span>Atualizado automaticamente</span>
      </div>
    </Card>
  );
}