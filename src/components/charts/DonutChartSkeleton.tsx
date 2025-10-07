import { Card } from "@/components/ui/card";

export const DonutChartSkeleton = () => {
  return (
    <Card className="p-6 border-border/50">
      <div className="flex items-center justify-center h-64">
        <div className="relative w-40 h-40 animate-pulse">
          <div className="absolute inset-0 rounded-full border-8 border-muted" />
          <div className="absolute inset-6 rounded-full bg-background" />
        </div>
      </div>
      <div className="mt-4 space-y-2">
        <div className="h-4 w-1/3 bg-muted rounded" />
        <div className="h-3 w-1/2 bg-muted rounded" />
      </div>
    </Card>
  );
};