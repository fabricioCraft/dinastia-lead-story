import { Sidebar } from "@/components/Sidebar";
import { KpiCard } from "@/components/KpiCard";
import { ChapterHeader } from "@/components/ChapterHeader";
import { LeadsByChannelChart } from "@/components/charts/LeadsByChannelChart";
import { InteractiveFunnelChart } from "@/components/charts/InteractiveFunnelChart";
import { TimePerStageChart } from "@/components/charts/TimePerStageChart";
import { ChannelPerformanceTable } from "@/components/charts/ChannelPerformanceTable";
import { Card } from "@/components/ui/card";
import PeriodSelector from "@/components/PeriodSelector";
import { useDashboardData } from "@/hooks/useDashboardData";

const Index = () => {
  const { data: dashboardData, isLoading, error } = useDashboardData();

  return (
    <div className="flex min-h-screen w-full bg-background">
      {/* <Sidebar /> */}
      
      <main className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-7xl mx-auto space-y-12">
          {/* Header */}
          <div className="mb-12">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h1 className="text-4xl font-bold gradient-text mb-2">
                  Jornada do Lead Dinastia
                </h1>
                <p className="text-muted-foreground text-lg">
                  Transformando dados em histórias de sucesso
                </p>
              </div>
              <PeriodSelector />
            </div>
          </div>

          {/* KPIs principais */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <KpiCard
              title="Total de Leads"
              value={isLoading ? "..." : (dashboardData?.kpis.totalLeads || 0).toLocaleString('pt-BR')}
              subtitle={error ? "Erro ao carregar" : "Período selecionado"}
              trend={error ? "down" : "neutral"}
            />
            <KpiCard
              title="Taxa de Qualificação (MQL)"
              value="68%"
              subtitle="Meta: 65%"
              trend="up"
            />
            <KpiCard
              title="Custo por Lead (CPL)"
              value="R$ 45,80"
              subtitle="-12% vs mês anterior"
              trend="up"
            />
            <KpiCard
              title="Taxa de Agendamento"
              value="42%"
              subtitle="Meta: 40%"
              trend="up"
            />
          </div>


          {/* Capítulo 1 */}
          <section className="space-y-6">
            <ChapterHeader
              number={1}
              title="De Onde Nossos Leads Vêm?"
              description="Entenda a origem e distribuição dos seus leads por canal de aquisição"
            />
            <LeadsByChannelChart />
          </section>

          {/* Capítulo 2 */}
          <section className="space-y-6">
            <ChapterHeader
              number={2}
              title="O Caminho Pelo Funil"
              description="Visualize o fluxo dos seus leads e a velocidade em que eles se movem entre as etapas."
            />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <InteractiveFunnelChart />
              <div className="space-y-6">
                <TimePerStageChart />
                <Card className="p-6 card-glow border-border/50">
                  <p className="text-sm font-medium text-muted-foreground mb-2">Ciclo de Vendas Médio</p>
                  <p className="text-4xl font-bold gradient-text">27 dias</p>
                </Card>
              </div>
            </div>
          </section>

          {/* Capítulo 3 */}
          <section className="space-y-6">
            <ChapterHeader
              number={3}
              title="O Destino Final: Ganhos, Perdas e Porquês"
              description="Entenda o resultado final da jornada e aprenda com os negócios perdidos para otimizar o futuro."
            />
            <div className="grid grid-cols-1 gap-6">
              <ChannelPerformanceTable />
            </div>
          </section>

          {/* Footer */}
          <div className="pt-8 pb-4 text-center">
            <p className="text-sm text-muted-foreground">
              Última atualização: 03/10/2025, 15:42 | Dashboard gerado por Dinastia
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;
