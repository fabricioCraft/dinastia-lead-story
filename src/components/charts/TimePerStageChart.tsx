import { Card } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

const data = [
  { stage: "Novo > MQL", days: 3, color: "hsl(var(--chart-1))" },
  { stage: "MQL > Agendamento", days: 8, color: "hsl(var(--warning))", alert: true },
  { stage: "Agendamento > SQL", days: 4, color: "hsl(var(--chart-3))" },
  { stage: "SQL > Fechamento", days: 12, color: "hsl(var(--chart-2))" },
];

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const isAlert = payload[0].payload.alert;
    return (
      <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
        <p className="text-sm font-semibold text-foreground">{payload[0].payload.stage}</p>
        <p className="text-lg font-bold text-primary">{payload[0].value} dias</p>
        {isAlert && (
          <p className="text-xs text-warning font-medium mt-1">⚠️ Gargalo identificado</p>
        )}
      </div>
    );
  }
  return null;
};

export function TimePerStageChart() {
  return (
    <Card className="p-6 card-glow border-border/50">
      <h3 className="text-lg font-semibold text-foreground mb-4">Velocidade da Jornada: Tempo Médio por Etapa</h3>
      <p className="text-sm text-muted-foreground mb-6">Onde Estão Nossos Gargalos de Tempo?</p>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
          <XAxis dataKey="stage" stroke="hsl(var(--muted-foreground))" angle={-15} textAnchor="end" height={80} />
          <YAxis stroke="hsl(var(--muted-foreground))" label={{ value: "Dias", angle: -90, position: "insideLeft" }} />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: "hsl(var(--muted))", opacity: 0.2 }} />
          <Bar dataKey="days" radius={[8, 8, 0, 0]}>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
}
