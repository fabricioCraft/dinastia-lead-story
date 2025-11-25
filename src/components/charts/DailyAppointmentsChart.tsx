import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useDailyAppointments } from '@/hooks/useDailyAppointments';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useFilters } from '@/contexts/FilterContext';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar, CalendarCheck } from 'lucide-react';

/**
 * Skeleton loader para o gráfico de volume diário de agendamentos
 */
const DailyAppointmentsChartSkeleton = () => {
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
 * Gráfico de linha mostrando o volume diário de agendamentos
 * Baseado na data_do_agendamento da tabela MR_base_leads
 */
export function DailyAppointmentsChart() {
  const { filters } = useFilters();
  
  // Construir objeto de filtros para o hook
  // Usar formatação local para evitar problemas de fuso horário
  const cf = filters.categoricalFilters
  const filterParams = filters.selectedPeriod
    ? { days: filters.selectedPeriod, ...cf }
    : {
        startDate: filters.dateRange?.from ? format(filters.dateRange.from, 'yyyy-MM-dd') : undefined,
        endDate: filters.dateRange?.to ? format(filters.dateRange.to, 'yyyy-MM-dd') : undefined,
        ...cf,
      };
  
  const { data, isLoading, error } = useDailyAppointments(filterParams);

  // Processar dados para o gráfico
  const chartData = data?.map(item => ({
    day: item.day,
    appointments: item.appointments_per_day,
    formattedDate: format(parseISO(item.day), 'dd/MM', { locale: ptBR }),
    fullDate: format(parseISO(item.day), 'dd \'de\' MMMM \'de\' yyyy', { locale: ptBR })
  })) || [];

  // Calcular estatísticas
  const totalAppointments = chartData.reduce((sum, item) => sum + item.appointments, 0);
  const averageAppointments = chartData.length > 0 ? Math.round(totalAppointments / chartData.length) : 0;
  const maxAppointments = Math.max(...chartData.map(item => item.appointments), 0);

  if (isLoading) {
    return <DailyAppointmentsChartSkeleton />;
  }

  if (error) {
    return (
      <Card className="p-6 border-border/50">
        <div className="h-80 flex items-center justify-center">
          <div className="text-center">
            <p className="text-red-600 mb-2">Erro ao carregar dados de agendamentos diários</p>
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
            <p className="text-muted-foreground">Nenhum dado de agendamentos disponível</p>
            <p className="text-sm text-muted-foreground mt-2">
              Verifique se há agendamentos registrados no sistema
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
        <CalendarCheck className="h-5 w-5 text-green-600" />
        <h3 className="text-lg font-semibold text-foreground">Volume Diário de Agendamentos</h3>
      </div>
      
      <p className="text-sm text-muted-foreground mb-6">
        Evolução diária dos agendamentos realizados
      </p>

      {/* Estatísticas */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="text-center">
          <p className="text-2xl font-bold text-green-600">{totalAppointments.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground">Total de Agendamentos</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-blue-600">{averageAppointments.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground">Média Diária</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-orange-600">{maxAppointments.toLocaleString()}</p>
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
                `${value.toLocaleString()} agendamentos`,
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
              dataKey="appointments" 
              stroke="hsl(var(--chart-2))"
              strokeWidth={2}
              dot={{ 
                fill: 'hsl(var(--chart-2))', 
                strokeWidth: 2,
                r: 4
              }}
              activeDot={{ 
                r: 6, 
                stroke: 'hsl(var(--chart-2))',
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
