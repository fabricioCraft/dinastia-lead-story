import { Card } from "@/components/ui/card";

const funnelData = [
  { stage: "Novos Leads", value: 1250, percentage: 100, color: "hsl(var(--chart-1))" },
  { stage: "Qualificados (MQL)", value: 850, percentage: 68, color: "hsl(var(--chart-2))" },
  { stage: "Agendamentos", value: 525, percentage: 42, color: "hsl(var(--chart-3))" },
  { stage: "Oportunidades (SQL)", value: 310, percentage: 24.8, color: "hsl(var(--chart-4))" },
  { stage: "Clientes Ganhos", value: 115, percentage: 9.2, color: "hsl(var(--accent))" },
];

export function FunnelChart() {
  return (
    <Card className="p-6 card-glow border-border/50">
      <h3 className="text-lg font-semibold text-foreground mb-6">Funil de Vendas Interativo</h3>
      <div className="space-y-2">
        {funnelData.map((item, index) => (
          <div
            key={item.stage}
            className="group relative transition-all duration-300 hover:scale-[1.02]"
          >
            <div
              className="h-16 flex items-center justify-between px-6 rounded-lg transition-all duration-300 hover:shadow-lg"
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
