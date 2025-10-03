import { Home, BarChart3, Bell, Users, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";
import logo from "@/assets/dinastia-logo.png";

interface SidebarProps {
  className?: string;
}

const menuItems = [
  { icon: Home, label: "Dashboard", tooltip: "Dashboard", active: true },
  { icon: BarChart3, label: "Relatórios", tooltip: "Relatórios Detalhados", active: false },
  { icon: Bell, label: "Alertas", tooltip: "Alertas de IA", active: false },
  { icon: Users, label: "Leads", tooltip: "Gestão de Leads (CRM)", active: false },
  { icon: Settings, label: "Configurações", tooltip: "Configurações e Integrações", active: false },
];

export function Sidebar({ className }: SidebarProps) {
  return (
    <TooltipProvider>
      <aside className={cn("w-20 bg-card border-r border-border flex flex-col items-center py-6 gap-8", className)}>
        <div className="w-12 h-12 flex items-center justify-center">
          <img src={logo} alt="Dinastia Logo" className="w-full h-full object-contain" />
        </div>

        <nav className="flex flex-col gap-4 flex-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <Tooltip key={item.label}>
                <TooltipTrigger asChild>
                  <button
                    className={cn(
                      "w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-200 relative",
                      item.active
                        ? "bg-gradient-primary text-foreground shadow-lg shadow-primary/20"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    )}
                  >
                    <Icon className="w-5 h-5" />
                    {item.label === "Alertas" && (
                      <Badge className="absolute -top-1 -right-1 w-5 h-5 p-0 flex items-center justify-center bg-accent text-accent-foreground border-0 text-xs font-semibold">
                        2
                      </Badge>
                    )}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right">
                  <p>{item.tooltip}</p>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </nav>

        <Card className="w-16 p-3 bg-gradient-primary border-none">
          <div className="text-center">
            <p className="text-xs font-medium text-foreground/80 mb-1">Receita</p>
            <p className="text-sm font-bold text-foreground">R$ 189k</p>
          </div>
        </Card>
      </aside>
    </TooltipProvider>
  );
}
