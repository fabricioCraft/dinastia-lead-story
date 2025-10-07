import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { usePeriod } from "@/contexts/PeriodContext";
import { Skeleton } from "@/components/ui/skeleton";

interface ChannelPerformanceItem {
  origem: string;
  count: number;
}

export function ChannelPerformanceTable() {
  const { selectedPeriod } = usePeriod();

  const { data, isLoading, error } = useQuery<{kpis: {totalLeads: number}, leadsByOrigin: ChannelPerformanceItem[]}>({
    queryKey: ["dashboard", "channel-performance", selectedPeriod],
    queryFn: async () => {
      const url = selectedPeriod 
        ? `/api/dashboard/origin-summary?days=${selectedPeriod}`
        : "/api/dashboard/origin-summary";
      
      const response = await fetch(url, {
        headers: { Accept: "application/json" }
      });
      
      if (!response.ok) {
        throw new Error("Falha ao carregar dados de performance por canal");
      }
      
      const result = await response.json();
      return result;
    },
    staleTime: 5 * 60 * 1000, // 5 minutos
  });

  // Encontra o canal com mais leads para destacar
  const bestChannel = data?.leadsByOrigin?.length > 0 ? data.leadsByOrigin.reduce((best, current) => 
    current.count > (best?.count || 0) ? current : best
  ) : null;

  const processedData = data?.leadsByOrigin?.map(item => ({
    channel: item.origem,
    leads: item.count,
    customers: 0, // Por enquanto não temos dados de conversão
    conversion: 0, // Por enquanto não temos dados de conversão
    highlight: item.origem === bestChannel?.origem
  })) || [];

  return (
    <Card className="p-6 card-glow border-border/50 hover:shadow-lg transition-shadow duration-300">
      <h3 className="text-lg font-semibold text-foreground mb-6">Performance de Conversão por Canal</h3>
      
      {isLoading ? (
        <div className="space-y-3">
          <div className="flex justify-between">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-16" />
          </div>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex justify-between">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-12" />
              <Skeleton className="h-4 w-12" />
              <Skeleton className="h-4 w-12" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="flex items-center justify-center h-[200px] text-muted-foreground">
          <p>Erro ao carregar dados: {error.message}</p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Canal</TableHead>
              <TableHead className="text-right">Leads Gerados</TableHead>
              <TableHead className="text-right">Clientes Ganhos</TableHead>
              <TableHead className="text-right">Taxa de Conversão</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {processedData.map((row) => (
              <TableRow
                key={row.channel}
                className={cn(
                  "transition-all duration-200 hover:scale-[1.01]",
                  row.highlight && "bg-accent/10 hover:bg-accent/20 border-l-2 border-accent"
                )}
              >
                <TableCell className="font-medium">{row.channel}</TableCell>
                <TableCell className="text-right">{row.leads}</TableCell>
                <TableCell className="text-right">{row.customers}</TableCell>
                <TableCell className="text-right">
                  <span className={cn(
                    "font-semibold",
                    row.highlight && "text-accent"
                  )}>
                    {row.conversion?.toFixed(1) || '0.0'}%
                  </span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Card>
  );
}
