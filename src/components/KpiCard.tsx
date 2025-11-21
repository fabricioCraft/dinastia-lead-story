import { Badge } from "./ui/badge";
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
    <div className={cn("bg-muted/50 p-3 rounded-lg", className)}>
      <p className="text-xs text-muted-foreground mb-1">{title}</p>
      <Badge
        variant="secondary"
        className={cn("mt-1 truncate max-w-full text-xs")}
        title={typeof value === 'string' ? value : String(value)}
      >
        {typeof value === 'number' ? value.toLocaleString() : value}
      </Badge>
      {subtitle && (
        <p className={cn(
          "text-xs mt-1 break-words",
          trend === "up" && "text-accent",
          trend === "down" && "text-warning",
          !trend && "text-muted-foreground"
        )}>
          {subtitle}
        </p>
      )}
    </div>
  );
}
