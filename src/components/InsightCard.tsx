import { Card } from "./ui/card";
import { Lightbulb } from "lucide-react";

interface InsightCardProps {
  title: string;
  description: string;
  variant?: "warning" | "info";
}

export function InsightCard({ title, description, variant = "info" }: InsightCardProps) {
  return (
    <Card className="p-6 card-glow border-border/50 hover:scale-[1.02] transition-transform duration-300">
      <div className="flex gap-4">
        <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center ${
          variant === "warning" ? "bg-warning/20" : "bg-accent/20"
        }`}>
          <Lightbulb className={`w-6 h-6 ${
            variant === "warning" ? "text-warning" : "text-accent"
          }`} />
        </div>
        <div className="space-y-2">
          <h4 className="font-semibold text-foreground">{title}</h4>
          <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
        </div>
      </div>
    </Card>
  );
}
