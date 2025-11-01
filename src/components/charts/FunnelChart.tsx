import React from "react";
import { Card } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useStagesSummary } from "@/hooks/useStagesSummary";
import { ChartLoadingState, ChartErrorState, ChartEmptyState } from "@/components/ui/chart-states";

const STAGE_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--accent))",
];

export function FunnelChart() {
  const { data: stagesData, isLoading, error } = useStagesSummary();

  // Processar dados para o funil
  const funnelData = stagesData?.map((item, index) => {
    const maxValue = stagesData[0]?.count || 1;
    const percentage = (item.count / maxValue) * 100;
    
    return {
      stage: item.stage,
      value: item.count,
      percentage: Math.round(percentage * 10) / 10,
      color: STAGE_COLORS[index % STAGE_COLORS.length],
    };
  }) || [];

  if (isLoading) {
    return <ChartLoadingState title="Funil de Vendas" />;
  }

  if (error) {
    return <ChartErrorState title="Funil de Vendas" error={error} />;
  }

  if (!funnelData.length) {
    return <ChartEmptyState title="Funil de Vendas" message="Nenhum dado do funil disponível" />;
  }
  return (
    <Card className="p-6 card-glow border-border/50 hover:shadow-lg transition-shadow duration-300">
      <h3 className="text-lg font-semibold text-foreground mb-6">Funil de Vendas Interativo</h3>
      <div className="space-y-2">
        {funnelData.map((item, index) => (
          <div
            key={item.stage}
            className="group relative transition-all duration-300 hover:scale-[1.02]"
          >
            <div
              className="h-16 flex items-center justify-between px-6 rounded-lg transition-all duration-300 hover:shadow-lg cursor-pointer"
              style={{
                width: `${item.percentage}%`,
                backgroundColor: item.color,
                marginLeft: `${(100 - item.percentage) / 2}%`,
              }}
            >
              <span className="font-semibold text-white">{item.stage}</span>
              <span className="font-bold text-white text-lg">{item.value}</span>
            </div>
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
              <div className="bg-card border border-border rounded-lg p-3 shadow-xl w-64 absolute left-1/2 -translate-x-1/2 -top-16 z-10">
                <p className="text-sm font-semibold text-foreground">{item.stage}</p>
                <p className="text-lg font-bold text-primary">{item.value} Leads</p>
                <p className="text-xs text-muted-foreground">{item.percentage}% do topo do funil</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
