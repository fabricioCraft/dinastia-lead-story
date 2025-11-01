import React from "react";
import { Card } from "@/components/ui/card";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { useLeadsByStage } from "@/hooks/useLeadsByStage";
import { ChartLoadingState, ChartErrorState, ChartEmptyState } from "@/components/ui/chart-states";

const LOSS_STAGE_COLORS = [
  "hsl(var(--warning))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
  "hsl(var(--muted))",
  "hsl(var(--destructive))",
];

// Mapear etapas que representam perdas
const LOSS_STAGES = [
  'No-show',
  'Perdido',
  'Cancelado',
  'Rejeitado',
  'Sem Resposta',
  'Fora do Perfil',
  'Preço Alto',
  'Concorrente'
];

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
        <p className="text-sm font-semibold text-foreground">{payload[0].name}</p>
        <p className="text-lg font-bold text-primary">{payload[0].value}%</p>
        <p className="text-xs text-muted-foreground">dos leads perdidos</p>
      </div>
    );
  }
  return null;
};

const RADIAN = Math.PI / 180;
const renderCustomizedLabel = ({
  cx,
  cy,
  midAngle,
  innerRadius,
  outerRadius,
  percent,
}: any) => {
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  return (
    <text
      x={x}
      y={y}
      fill="white"
      textAnchor="middle"
      dominantBaseline="central"
      className="font-bold text-sm"
    >
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

export default function LossReasonsChart() {
  const { data: stagesData, isLoading, error } = useLeadsByStage();

  // Filtrar apenas etapas que representam perdas e calcular percentuais
  const lossData = React.useMemo(() => {
    if (!stagesData) return [];
    
    const lossStages = stagesData.filter(stage => 
      LOSS_STAGES.some(lossStage => 
        stage.stage_name.toLowerCase().includes(lossStage.toLowerCase())
      )
    );
    
    const totalLossLeads = lossStages.reduce((sum, stage) => sum + stage.lead_count, 0);
    
    if (totalLossLeads === 0) return [];
    
    return lossStages.map((stage, index) => ({
      name: stage.stage_name,
      value: Math.round((stage.lead_count / totalLossLeads) * 100),
      count: stage.lead_count,
      color: LOSS_STAGE_COLORS[index % LOSS_STAGE_COLORS.length]
    }));
  }, [stagesData]);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      return (
        <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
          <p className="text-sm font-medium text-foreground">{data.payload.name}</p>
          <p className="text-sm text-muted-foreground">
            {data.payload.count} leads ({data.value}%)
          </p>
        </div>
      );
    }
    return null;
  };

  if (isLoading) {
    return <ChartLoadingState title="Motivos de Perda" />;
  }

  if (error) {
    return <ChartErrorState title="Motivos de Perda" error={error} />;
  }

  if (!lossData.length) {
    return <ChartEmptyState title="Motivos de Perda" message="Nenhum dado de perda disponível" />;
  }

  return (
    <Card className="p-6 bg-card border-border">
      <h3 className="text-lg font-semibold text-foreground mb-6">Motivos de Perda</h3>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={lossData}
            cx="50%"
            cy="50%"
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
          >
            {lossData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
        </PieChart>
      </ResponsiveContainer>
    </Card>
  );
}
