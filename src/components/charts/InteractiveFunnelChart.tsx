import React from "react";
import { Card } from "@/components/ui/card";
import { BarChartSkeleton } from "./BarChartSkeleton";
import { usePeriod } from "@/contexts/PeriodContext";

interface StageSummaryItem {
  stage: string;
  count: number;
}

// Configuração de apresentação do funil mapeando os nomes exatos dos status do ClickUp
const FUNNEL_DISPLAY_CONFIG: Record<string, { label: string; order: number; color: string }> = {
  "novo lead": { label: "Novos Leads", order: 1, color: "hsl(var(--chart-1))" },
  "closers em contato": { label: "Qualificados (MQL)", order: 2, color: "hsl(var(--chart-2))" },
  "agendados": { label: "Agendamentos", order: 3, color: "hsl(var(--chart-3))" },
  "call realizada": { label: "Oportunidades (SQL)", order: 4, color: "hsl(var(--chart-4))" },
  "vendas": { label: "Clientes Ganhos", order: 5, color: "hsl(var(--chart-5))" },
};

export function InteractiveFunnelChart() {
  const { selectedPeriod } = usePeriod();
  
  // Estado de carregamento e dados
  const [funnelData, setFunnelData] = React.useState<StageSummaryItem[]>([]);
  const [isLoading, setIsLoading] = React.useState<boolean>(true);
  const [error, setError] = React.useState<string | null>(null);

  // Busca de dados ao montar o componente
  React.useEffect(() => {
    let canceled = false;
    const load = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const url = selectedPeriod 
          ? `/api/funnel/stages-summary?days=${selectedPeriod}`
          : "/api/funnel/stages-summary";
        const res = await fetch(url, { headers: { Accept: "application/json" } });
        if (!res.ok) throw new Error("Falha ao carregar dados do funil");
        const payload: StageSummaryItem[] = await res.json();
        if (!canceled) setFunnelData(payload);
      } catch (err: any) {
        if (!canceled) setError(err?.message ?? "Falha ao carregar dados do funil");
      } finally {
        if (!canceled) setIsLoading(false);
      }
    };
    load();
    return () => {
      canceled = true;
    };
  }, [selectedPeriod]);

  // Processa e ordena os dados conforme configuração de apresentação
  const processedFunnelData = React.useMemo(() => {
    const normalize = (s: string | undefined | null) => (s ?? "").toLowerCase().trim();
    const items = Object.entries(FUNNEL_DISPLAY_CONFIG).map(([status, cfg]) => ({
      status,
      label: cfg.label,
      order: cfg.order,
      color: cfg.color,
      count: funnelData.find((d) => normalize(d.stage) === status)?.count ?? 0,
    }));
    items.sort((a, b) => a.order - b.order);
    return items;
  }, [funnelData]);

  // Valor da primeira etapa (Novos Leads) para base de proporção
  const firstStageCount = (() => {
    const normalize = (s: string | undefined | null) => (s ?? "").toLowerCase().trim();
    return funnelData.find((d) => normalize(d.stage) === "novo lead")?.count ?? 0;
  })();

  return (
    <Card className="p-6 card-glow border-border/50 hover:shadow-lg transition-shadow duration-300">
      <h3 className="text-lg font-semibold text-foreground mb-6">Funil de Vendas Interativo</h3>
      {isLoading && (
        <div className="mb-4">
          <BarChartSkeleton />
        </div>
      )}
      {error && <div className="text-sm text-red-600">Erro ao carregar: {error}</div>}
      {processedFunnelData.length > 0 ? (
        <div className="space-y-2">
          {processedFunnelData.map((item) => {
            const widthPercentage = firstStageCount > 0 ? Math.round((item.count / firstStageCount) * 100) : 0;
            return (
              <div key={item.status} className="group relative transition-all duration-300 hover:scale-[1.02]">
                <div
                  className="h-16 flex items-center justify-between px-6 rounded-lg transition-all duration-300 hover:shadow-lg cursor-pointer"
                  style={{
                    width: `${widthPercentage}%`,
                    backgroundColor: item.color,
                    marginLeft: `${(100 - widthPercentage) / 2}%`,
                  }}
                >
                  <span className="font-semibold text-white">{item.label}</span>
                  <span className="font-bold text-white text-lg">{item.count}</span>
                </div>
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                  <div className="bg-card border border-border rounded-lg p-3 shadow-xl w-64 absolute left-1/2 -translate-x-1/2 -top-16 z-10">
                    <p className="text-sm font-semibold text-foreground">{item.label}</p>
                    <p className="text-lg font-bold text-primary">{item.count} Leads</p>
                    <p className="text-xs text-muted-foreground">{widthPercentage}% do topo do funil</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        !isLoading && !error && <div className="text-sm text-muted-foreground">Nenhum dado de funil disponível.</div>
      )}
    </Card>
  );
}