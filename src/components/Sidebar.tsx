import { Home, BarChart3, Bell, Users, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Button } from "./ui/button";
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
            const hasModal = ["Relatórios", "Alertas", "Leads", "Configurações"].includes(item.label);

            if (!hasModal) {
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
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    <p>{item.tooltip}</p>
                  </TooltipContent>
                </Tooltip>
              );
            }

            return (
              <Dialog key={item.label}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <DialogTrigger asChild>
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
                          <Badge className="absolute -top-1 -right-1 w-5 h-5 p-0 flex items-center justify-center bg-cyan-500 text-white border-0 text-xs font-semibold">
                            2
                          </Badge>
                        )}
                      </button>
                    </DialogTrigger>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    <p>{item.tooltip}</p>
                  </TooltipContent>
                </Tooltip>

                {item.label === "Relatórios" && (
                  <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                      <DialogTitle>Relatórios Detalhados</DialogTitle>
                      <DialogDescription>Aprofunde sua análise com relatórios customizáveis.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3">
                      <div className="text-sm text-blue-600 hover:text-blue-700 hover:underline cursor-pointer flex items-center gap-2">📄 Análise de Performance por Campanha (Google Ads)</div>
                      <div className="text-sm text-blue-600 hover:text-blue-700 hover:underline cursor-pointer flex items-center gap-2">📈 Previsão de Receita (Forecast Q4 2025)</div>
                      <div className="text-sm text-blue-600 hover:text-blue-700 hover:underline cursor-pointer flex items-center gap-2">👥 Performance da Equipe de Vendas</div>
                      <div className="text-sm text-blue-600 hover:text-blue-700 hover:underline cursor-pointer flex items-center gap-2">📊 Análise de Coorte por Canal de Aquisição</div>
                    </div>
                    <DialogFooter>
                      <Button className="mt-4">Exportar como PDF</Button>
                    </DialogFooter>
                  </DialogContent>
                )}

                {item.label === "Alertas" && (
                  <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                      <DialogTitle>Central de Alertas de IA</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3 text-sm">
                      <div className="flex items-start gap-2">
                        <span>💡</span>
                        <p>
                          <span className="font-semibold">Oportunidade (Hoje):</span> A etapa de MQL para Agendamento está levando 8 dias. Considere revisar o script de follow-up.
                        </p>
                      </div>
                      <div className="flex items-start gap-2">
                        <span>🔔</span>
                        <p>
                          <span className="font-semibold">Ponto de Atenção (Ontem):</span> O Custo por Lead (CPL) da campanha "Meta Ads - Vendas" aumentou 15% nos últimos 3 dias.
                        </p>
                      </div>
                      <div className="flex items-start gap-2">
                        <span>✅</span>
                        <p>
                          <span className="font-semibold">Meta Atingida (Semana Passada):</span> Parabéns! A Taxa de Agendamento (42%) superou a meta de 40%.
                        </p>
                      </div>
                    </div>
                  </DialogContent>
                )}

                {item.label === "Leads" && (
                  <DialogContent className="sm:max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Gestão de Leads (CRM)</DialogTitle>
                      <DialogDescription>Visualize e gerencie seus leads mais promissores.</DialogDescription>
                    </DialogHeader>
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-sm">
                        <thead>
                          <tr className="text-left border-b">
                            <th className="py-2 pr-4">Nome do Lead</th>
                            <th className="py-2 pr-4">Empresa</th>
                            <th className="py-2 pr-4">Etapa do Funil</th>
                            <th className="py-2 pr-4">Pontuação (Lead Scoring)</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr className="border-b">
                            <td className="py-2 pr-4">Ana Silva</td>
                            <td className="py-2 pr-4">TechCorp</td>
                            <td className="py-2 pr-4">Agendamento</td>
                            <td className="py-2 pr-4">92 (🔥 Quente)</td>
                          </tr>
                          <tr className="border-b">
                            <td className="py-2 pr-4">Bruno Costa</td>
                            <td className="py-2 pr-4">Inova Solutions</td>
                            <td className="py-2 pr-4">Qualificado (MQL)</td>
                            <td className="py-2 pr-4">75 (Nutrir)</td>
                          </tr>
                          <tr>
                            <td className="py-2 pr-4">Carla Dias</td>
                            <td className="py-2 pr-4">Mega Negócios</td>
                            <td className="py-2 pr-4">Oportunidade (SQL)</td>
                            <td className="py-2 pr-4">88 (🔥 Quente)</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </DialogContent>
                )}

                {item.label === "Configurações" && (
                  <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                      <DialogTitle>Configurações e Integrações</DialogTitle>
                      <DialogDescription>Conecte a Dinastia às suas ferramentas favoritas.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3 text-sm">
                      <div className="flex items-center justify-between">
                        <span>Logo da Salesforce</span>
                        <Badge className="bg-green-600 text-white">✅ Conectado</Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Logo do HubSpot</span>
                        <Badge className="bg-green-600 text-white">✅ Conectado</Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Logo do Google Analytics</span>
                        <Badge className="bg-green-600 text-white">✅ Conectado</Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Logo do Slack</span>
                        <Badge className="bg-blue-600 text-white">➡️ Conectar</Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Logo do RD Station</span>
                        <Badge className="bg-blue-600 text-white">➡️ Conectar</Badge>
                      </div>
                    </div>
                  </DialogContent>
                )}
              </Dialog>
            );
          })}
        </nav>

        <Tooltip>
          <TooltipTrigger asChild>
            <Card className="w-16 p-3 bg-gradient-primary border-none cursor-default">
              <div className="text-center">
                <p className="text-xs font-medium text-foreground/80 mb-1">Receita Gerada (Mês)</p>
                <p className="text-sm font-bold text-foreground">R$ 189k</p>
              </div>
            </Card>
          </TooltipTrigger>
          <TooltipContent side="right">
            <p>R$ 189.540 gerados a partir dos 115 clientes ganhos este mês.</p>
          </TooltipContent>
        </Tooltip>
      </aside>
    </TooltipProvider>
  );
}
