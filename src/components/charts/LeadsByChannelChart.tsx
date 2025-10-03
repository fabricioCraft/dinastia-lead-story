import { Card } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Trophy } from "lucide-react";
import { TooltipProvider, Tooltip as UITooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";

const data = [
  { name: "Google Ads", value: 450, bestPerformer: false },
  { name: "Meta Ads", value: 320, bestPerformer: false },
  { name: "Busca Orgânica", value: 280, bestPerformer: true },
  { name: "LinkedIn", value: 150, bestPerformer: false },
  { name: "Outros", value: 50, bestPerformer: false },
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
    <Card className="p-6 card-glow border-border/50 hover:shadow-lg transition-shadow duration-300">
      <h3 className="text-lg font-semibold text-foreground mb-6">Origem dos Leads por Canal</h3>
      <div className="relative">
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
            <XAxis type="number" stroke="hsl(var(--muted-foreground))" />
            <YAxis 
              dataKey="name" 
              type="category" 
              stroke="hsl(var(--muted-foreground))"
              width={140}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: "hsl(var(--muted))", opacity: 0.2 }} />
            <Bar dataKey="value" radius={[0, 8, 8, 0]} className="transition-all duration-300">
              {data.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={COLORS[index % COLORS.length]}
                  className="hover:opacity-90 transition-transform duration-200 hover:scale-[1.02] hover:brightness-110 cursor-pointer"
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        
        {/* Trophy Icon with Tooltip for Best Performer */}
        <TooltipProvider>
          <UITooltip>
            <TooltipTrigger asChild>
              <div className="absolute left-[125px] top-[165px] cursor-help">
                <Trophy className="w-4 h-4 text-accent animate-pulse" />
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs font-semibold">Melhor Performance: Maior Taxa de Conversão (12.5%)</p>
            </TooltipContent>
          </UITooltip>
        </TooltipProvider>
      </div>
    </Card>
  );
}
