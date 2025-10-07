import { Card } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

import { useQuery } from "@tanstack/react-query";
import { BarChartSkeleton } from "./BarChartSkeleton";
import { usePeriod } from "@/contexts/PeriodContext";
import React from "react";

const COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

// Normalização e regras de agrupamento
const MIN_COUNT_FOR_OWN_CATEGORY = 3; // Origens com menos que este número serão agrupadas em OUTROS
const ALWAYS_GROUP = new Set(["AGENDAMENTO", "CALENDLY", "IMERSAO-PER25", "DESAFIO"]);
const ORIGIN_SYNONYMS: Record<string, string> = {
  // Sinônimos/variações que devem ser agrupadas
  "MARTERCLASS": "MASTERCLASS",
  "MASTERCLASS": "MASTERCLASS",
  "MANYCHAT": "MANYCHAT",
};

function canonicalizeOrigin(raw: string | null): string {
  if (!raw) return "OUTROS";
  const upper = raw.trim().toUpperCase();
  if (!upper) return "OUTROS";
  if (ALWAYS_GROUP.has(upper)) return "OUTROS";
  const canonical = ORIGIN_SYNONYMS[upper] ?? upper;
  return canonical;
}

function useLeadsByOrigin(days: number | null) {
  return useQuery<{ name: string; value: number }[], Error>({
    queryKey: ["leads-by-origin", days],
    queryFn: async () => {
      const url = days 
        ? `/api/dashboard/origin-summary?days=${days}`
        : "/api/dashboard/origin-summary";
      const res = await fetch(url, {
        headers: { Accept: "application/json" },
      });
      if (!res.ok) throw new Error("Falha ao carregar dados");
      const payload: {
        kpis: { totalLeads: number };
        leadsByOrigin: Array<{ origem: string | null; count: number }>;
      } = await res.json();

      const counts = new Map<string, number>();
      for (const item of payload.leadsByOrigin) {
        const key = canonicalizeOrigin(item.origem);
        counts.set(key, (counts.get(key) ?? 0) + Number(item.count ?? 0));
      }

      let others = counts.get("OUTROS") ?? 0;
      for (const [name, value] of Array.from(counts.entries())) {
        if (name === "OUTROS") continue;
        if (value < MIN_COUNT_FOR_OWN_CATEGORY) {
          others += value;
          counts.delete(name);
        }
      }
      if (others > 0) counts.set("OUTROS", others);

      return Array.from(counts.entries())
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);
    },
    staleTime: 5 * 60 * 1000,
  });
}

const CustomTooltip = ({ active, payload, total }: any) => {
  if (active && payload && payload.length) {
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
  const { selectedPeriod } = usePeriod();
  const { data, isLoading, error } = useLeadsByOrigin(selectedPeriod);
  const total = (data ?? []).reduce((sum, item) => sum + item.value, 0);

  return (
    <Card className="p-6 card-glow border-border/50 hover:shadow-lg transition-shadow duration-300">
      <h3 className="text-lg font-semibold text-foreground mb-6">Origem dos Leads por Canal</h3>
      <div className="relative">
        {isLoading && (
          <div className="mb-4">
            <BarChartSkeleton />
          </div>
        )}
        {error && (
          <div className="text-sm text-red-600">Erro ao carregar: {error.message}</div>
        )}
        {data && data.length > 0 && (
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
              <Tooltip content={<CustomTooltip total={total} />} cursor={{ fill: "hsl(var(--muted))", opacity: 0.2 }} />
              <Bar dataKey="value" radius={[0, 8, 8, 0]} className="transition-all duration-300">
                {(data || []).map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={COLORS[index % COLORS.length]}
                    className="hover:opacity-90 transition-transform duration-200 hover:scale-[1.02] hover:brightness-110 cursor-pointer"
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </Card>
  );
}
