import React from "react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, BarChart3 } from "lucide-react";

interface ChartStateProps {
  title: string;
  height?: string;
}

interface ChartErrorProps extends ChartStateProps {
  error: Error | unknown;
}

interface ChartEmptyProps extends ChartStateProps {
  message?: string;
}

export function ChartLoadingState({ title, height = "h-[300px]" }: ChartStateProps) {
  return (
    <Card className="p-6 bg-card border-border">
      <h3 className="text-lg font-semibold text-foreground mb-6">{title}</h3>
      <div className={`flex items-center justify-center ${height}`}>
        <div className="space-y-4 w-full max-w-sm">
          <Skeleton className="h-4 w-3/4 mx-auto" />
          <Skeleton className="h-32 w-32 rounded-lg mx-auto" />
          <div className="space-y-2">
            <Skeleton className="h-3 w-1/2 mx-auto" />
            <Skeleton className="h-3 w-1/3 mx-auto" />
          </div>
        </div>
      </div>
    </Card>
  );
}

export function ChartErrorState({ title, error, height = "h-[300px]" }: ChartErrorProps) {
  const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
  
  return (
    <Card className="p-6 bg-card border-border">
      <h3 className="text-lg font-semibold text-foreground mb-6">{title}</h3>
      <div className={`flex flex-col items-center justify-center ${height} text-center`}>
        <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-sm text-muted-foreground mb-2">Erro ao carregar dados</p>
        <p className="text-xs text-muted-foreground max-w-md">
          {errorMessage}
        </p>
      </div>
    </Card>
  );
}

export function ChartEmptyState({ 
  title, 
  message = "Nenhum dado disponível", 
  height = "h-[300px]" 
}: ChartEmptyProps) {
  return (
    <Card className="p-6 bg-card border-border">
      <h3 className="text-lg font-semibold text-foreground mb-6">{title}</h3>
      <div className={`flex flex-col items-center justify-center ${height} text-center`}>
        <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
          <BarChart3 className="h-6 w-6 text-muted-foreground" />
        </div>
        <p className="text-sm text-muted-foreground">{message}</p>
      </div>
    </Card>
  );
}