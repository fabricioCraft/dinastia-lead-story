import { Card } from "./ui/card";
import { Skeleton } from "./ui/skeleton";
import { useSchedulingSummary } from "@/hooks/useSchedulingSummary";
import { CalendarCheck, Users, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Skeleton loader para os cards de resumo de agendamentos
 */
const SchedulingSummaryCardsSkeleton = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {Array.from({ length: 2 }).map((_, i) => (
        <Card key={i} className="p-6 border-border/50 hidden">
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-4 w-20" />
          </div>
        </Card>
      ))}
    </div>
  );
};

/**
 * Cards de KPI para resumo de agendamentos
 * Mostra total de leads, total de agendamentos e taxa de conversão
 */
export function SchedulingSummaryCards() {
  const { data, isLoading, error } = useSchedulingSummary();

  if (isLoading) {
    return <SchedulingSummaryCardsSkeleton />;
  }

  if (error) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-6 border-border/50 col-span-full">
          <div className="text-center">
            <p className="text-red-600 mb-2">Erro ao carregar dados de agendamentos</p>
            <p className="text-sm text-gray-500">
              {error instanceof Error ? error.message : 'Erro desconhecido'}
            </p>
          </div>
        </Card>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-6 border-border/50 col-span-full">
          <div className="text-center">
            <p className="text-muted-foreground">Nenhum dado de agendamentos disponível</p>
          </div>
        </Card>
      </div>
    );
  }

  const schedulingRatePercentage = (data.schedulingRate * 100).toFixed(1);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Total de Leads */}
      <Card className="p-6 card-glow border-border/50 hover:scale-[1.02] hover:shadow-lg transition-all duration-300 hidden">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-blue-600" />
            <p className="text-sm font-medium text-muted-foreground">Total de Leads</p>
          </div>
          <p className="text-3xl font-bold text-blue-600">{data.totalLeads.toLocaleString()}</p>
          <p className="text-sm text-muted-foreground">
            Base total para agendamentos
          </p>
        </div>
      </Card>

      {/* Taxa de Conversão */}
      <Card className="p-6 card-glow border-border/50 hover:scale-[1.02] hover:shadow-lg transition-all duration-300 hidden">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-orange-600" />
            <p className="text-sm font-medium text-muted-foreground">Taxa de Agendamento</p>
          </div>
          <p className="text-3xl font-bold text-orange-600">{schedulingRatePercentage}%</p>
          <p className={cn(
            "text-sm font-medium",
            parseFloat(schedulingRatePercentage) >= 5 ? "text-green-600" : 
            parseFloat(schedulingRatePercentage) >= 2 ? "text-orange-600" : "text-red-600"
          )}>
            {parseFloat(schedulingRatePercentage) >= 5 ? "Excelente conversão" :
             parseFloat(schedulingRatePercentage) >= 2 ? "Boa conversão" : "Precisa melhorar"}
          </p>
        </div>
      </Card>
    </div>
  );
}