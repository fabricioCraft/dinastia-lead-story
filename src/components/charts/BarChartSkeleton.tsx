import { Card } from "@/components/ui/card";

export const BarChartSkeleton = () => {
  return (
    <Card className="p-6 border-border/50">
      <div className="h-64 w-full flex items-end gap-2 animate-pulse">
        {[60, 100, 80, 140, 50, 120].map((h, i) => (
          <div key={i} className="flex-1 bg-muted rounded" style={{ height: h }} />
        ))}
      </div>
      <div className="mt-4 space-y-2">
        <div className="h-4 w-1/3 bg-muted rounded" />
        <div className="h-3 w-1/2 bg-muted rounded" />
      </div>
    </Card>
  );
};