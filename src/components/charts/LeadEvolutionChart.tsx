import { Card } from "@/components/ui/card";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const data = [
  { month: "Mês 1", leads: 600 },
  { month: "Mês 2", leads: 720 },
  { month: "Mês 3", leads: 850 },
  { month: "Mês 4", leads: 980 },
  { month: "Mês 5", leads: 1100 },
  { month: "Mês 6", leads: 1250 },
];

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
        <p className="text-sm font-semibold text-foreground">{payload[0].payload.month}</p>
        <p className="text-lg font-bold text-primary">{payload[0].value} Leads</p>
        <p className="text-xs text-accent">📈 Crescimento contínuo</p>
      </div>
    );
  }
  return null;
};

export function LeadEvolutionChart() {
  return (
    <Card className="p-6 card-glow border-border/50">
      <h3 className="text-lg font-semibold text-foreground mb-6">Evolução da Geração de Leads</h3>
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <defs>
            <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8} />
              <stop offset="95%" stopColor="hsl(var(--secondary))" stopOpacity={0.1} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
          <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" />
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
