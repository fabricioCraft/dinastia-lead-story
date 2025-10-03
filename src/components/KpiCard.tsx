import { Card } from "./ui/card";
import { cn } from "@/lib/utils";

interface KpiCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: "up" | "down" | "neutral";
  className?: string;
}

export function KpiCard({ title, value, subtitle, trend, className }: KpiCardProps) {
  return (
    <Card className={cn("p-6 card-glow border-border/50 hover:scale-[1.02] hover:shadow-lg transition-all duration-300", className)}>
      <div className="space-y-2">
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        <p className="text-3xl font-bold gradient-text">{value}</p>
        {subtitle && (
          <p className={cn(
            "text-sm font-medium",
            trend === "up" && "text-accent",
            trend === "down" && "text-warning",
            !trend && "text-muted-foreground"
          )}>
            {subtitle}
          </p>
        )}
      </div>
    </Card>
  );
}
