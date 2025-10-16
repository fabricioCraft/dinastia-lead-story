import { Card } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { BarChartSkeleton } from "./BarChartSkeleton";
import { formatDuration } from "@/lib/utils";
import { useTimeInStage } from "@/hooks/useTimeInStage";

const STAGE_COLORS: Record<string, string> = {
  "novos leads": "hsl(var(--chart-1))",
  "tentado conexão": "hsl(var(--chart-2))",
  "conectado/qualificação": "hsl(var(--chart-3))",
  "oportunidade": "hsl(var(--chart-4))",
  "negociação": "hsl(var(--chart-5))",
};

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const days = payload[0].value;
    const seconds = payload[0].payload.seconds; // Usar os segundos diretamente
    const isAlert = days > 7; // Considera gargalo se mais de 7 dias
    const formattedDuration = formatDuration(seconds);
    
    return (
      <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
        <p className="text-sm font-semibold text-foreground">{payload[0].payload.stage}</p>
        <p className="text-lg font-bold text-primary">{formattedDuration}</p>
        <p className="text-xs text-muted-foreground">{Math.round(days * 10) / 10} dias</p>
        {isAlert && (
          <p className="text-xs text-warning font-medium mt-1">⚠️ Gargalo identificado</p>
        )}
      </div>
    );
  }
  return null;
};

export function TimePerStageChart() {
  const { data, isLoading, error } = useTimeInStage();

  const processedData = data?.map(item => ({
    stage: item.stage,
    days: item.averageTimeInDays,
    seconds: item.averageTimeInSeconds,
    color: STAGE_COLORS[item.stage.toLowerCase()] || "hsl(var(--chart-1))"
  })) || [];

  return (
    <Card className="p-6 card-glow border-border/50 hover:shadow-lg transition-shadow duration-300">
      <h3 className="text-lg font-semibold text-foreground mb-4">Velocidade da Jornada: Tempo Médio por Etapa</h3>
      <p className="text-sm text-muted-foreground mb-6">Onde Estão Nossos Gargalos de Tempo?</p>
      
      {isLoading ? (
        <BarChartSkeleton />
      ) : error ? (
        <div className="flex items-center justify-center h-[300px] text-muted-foreground">
          <p>Erro ao carregar dados: {error.message}</p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={processedData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
            <XAxis dataKey="stage" stroke="hsl(var(--muted-foreground))" angle={-15} textAnchor="end" height={80} />
            <YAxis stroke="hsl(var(--muted-foreground))" label={{ value: "Dias", angle: -90, position: "insideLeft" }} />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: "hsl(var(--muted))", opacity: 0.2 }} />
            <Bar dataKey="days" radius={[8, 8, 0, 0]} className="transition-all duration-300">
              {processedData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={entry.color}
                  className="hover:opacity-90 transition-transform duration-200 hover:scale-[1.02] hover:brightness-110 cursor-pointer"
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </Card>
  );
}
