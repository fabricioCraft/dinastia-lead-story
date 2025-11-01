import React from "react";
import { Card } from "@/components/ui/card";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useDailyLeadVolume } from "@/hooks/useDailyLeadVolume";
import { ChartLoadingState, ChartErrorState, ChartEmptyState } from "@/components/ui/chart-states";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
        <p className="text-sm font-semibold text-foreground">{payload[0].payload.formattedDate}</p>
        <p className="text-lg font-bold text-primary">{payload[0].value} Leads</p>
        <p className="text-xs text-accent">📈 Evolução diária</p>
      </div>
    );
  }
  return null;
};

export function LeadEvolutionChart() {
  const { data: volumeData, isLoading, error } = useDailyLeadVolume();

  // Processar dados para o gráfico
  const chartData = volumeData?.map(item => ({
    day: item.day,
    leads: item.total_leads_per_day,
    formattedDate: format(parseISO(item.day), 'dd/MM', { locale: ptBR }),
    fullDate: format(parseISO(item.day), 'dd \'de\' MMMM', { locale: ptBR })
  })) || [];

  if (isLoading) {
    return <ChartLoadingState title="Evolução da Geração de Leads" />;
  }

  if (error) {
    return <ChartErrorState title="Evolução da Geração de Leads" error={error} />;
  }

  if (!chartData.length) {
    return <ChartEmptyState title="Evolução da Geração de Leads" message="Nenhum dado de evolução disponível" />;
  }
  return (
    <Card className="p-6 card-glow border-border/50">
      <h3 className="text-lg font-semibold text-foreground mb-6">Evolução da Geração de Leads</h3>
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <defs>
            <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8} />
              <stop offset="95%" stopColor="hsl(var(--secondary))" stopOpacity={0.1} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
          <XAxis dataKey="formattedDate" stroke="hsl(var(--muted-foreground))" />
          <YAxis stroke="hsl(var(--muted-foreground))" />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="leads"
            stroke="hsl(var(--primary))"
            strokeWidth={3}
            fill="url(#colorLeads)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </Card>
  );
}
