import { Home, BarChart3, Bell, Users, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card } from "./ui/card";
import logo from "@/assets/dinastia-logo.png";

interface SidebarProps {
  className?: string;
}

const menuItems = [
  { icon: Home, label: "Dashboard", active: true },
  { icon: BarChart3, label: "Relatórios", active: false },
  { icon: Bell, label: "Alertas", active: false },
  { icon: Users, label: "Leads", active: false },
  { icon: Settings, label: "Configurações", active: false },
];

export function Sidebar({ className }: SidebarProps) {
  return (
    <aside className={cn("w-20 bg-card border-r border-border flex flex-col items-center py-6 gap-8", className)}>
      <div className="w-12 h-12 flex items-center justify-center">
        <img src={logo} alt="Dinastia Logo" className="w-full h-full object-contain" />
      </div>

      <nav className="flex flex-col gap-4 flex-1">
        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.label}
              className={cn(
                "w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-200",
                item.active
                  ? "bg-gradient-primary text-foreground shadow-lg shadow-primary/20"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
              title={item.label}
            >
              <Icon className="w-5 h-5" />
            </button>
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
  );
}
