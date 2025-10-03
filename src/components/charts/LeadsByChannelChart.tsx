import { Card } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

const data = [
  { name: "Google Ads", value: 450 },
  { name: "Meta Ads", value: 320 },
  { name: "Busca Orgânica", value: 280 },
  { name: "LinkedIn", value: 150 },
  { name: "Outros", value: 50 },
];

const COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const total = data.reduce((sum, item) => sum + item.value, 0);
    const percentage = ((payload[0].value / total) * 100).toFixed(1);
    return (
      <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
        <p className="text-sm font-semibold text-foreground">{payload[0].payload.name}</p>
        <p className="text-lg font-bold text-primary">{payload[0].value} Leads</p>
        <p className="text-xs text-muted-foreground">{percentage}% do total</p>
      </div>
    );
  }
  return null;
};

export function LeadsByChannelChart() {
  return (
    <Card className="p-6 card-glow border-border/50">
      <h3 className="text-lg font-semibold text-foreground mb-6">Origem dos Leads por Canal</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} layout="vertical" margin={{ top: 5, right: 30, left: 100, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
          <XAxis type="number" stroke="hsl(var(--muted-foreground))" />
          <YAxis dataKey="name" type="category" stroke="hsl(var(--muted-foreground))" />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: "hsl(var(--muted))", opacity: 0.2 }} />
          <Bar dataKey="value" radius={[0, 8, 8, 0]}>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
}
