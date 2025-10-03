import { Sidebar } from "@/components/Sidebar";
import { KpiCard } from "@/components/KpiCard";
import { ChapterHeader } from "@/components/ChapterHeader";
import { InsightCard } from "@/components/InsightCard";
import { LeadsByChannelChart } from "@/components/charts/LeadsByChannelChart";
import { FunnelChart } from "@/components/charts/FunnelChart";
import { TimePerStageChart } from "@/components/charts/TimePerStageChart";
import { ChannelPerformanceTable } from "@/components/charts/ChannelPerformanceTable";
import { LossReasonsChart } from "@/components/charts/LossReasonsChart";
import { Card } from "@/components/ui/card";

const Index = () => {
  return (
    <div className="flex min-h-screen w-full bg-background">
      <Sidebar />
      
      <main className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-7xl mx-auto space-y-12">
          {/* Header */}
          <div className="mb-12">
            <h1 className="text-4xl font-bold gradient-text mb-2">
              Jornada do Lead Dinastia
            </h1>
            <p className="text-muted-foreground text-lg">
              Transformando dados em histórias de sucesso
            </p>
          </div>

          {/* KPIs principais */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <KpiCard
              title="Total de Leads (Mês)"
              value="1.250"
              subtitle="+18% vs mês anterior"
              trend="up"
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

          {/* Insights da IA Dinastia */}
          <section className="space-y-4">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-1 w-12 bg-gradient-to-r from-accent to-primary rounded-full"></div>
              <h2 className="text-2xl font-bold gradient-text">Insights da IA Dinastia</h2>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <InsightCard
                title="Oportunidade de Otimização"
                description="A etapa de MQL para Agendamento está levando 8 dias. Sugerimos revisar o processo de follow-up para acelerar o ciclo de vendas."
                variant="warning"
              />
              <InsightCard
                title="Ponto de Atenção"
                description="40% dos leads são perdidos por Falta de Resposta. Sugerimos implementar um fluxo de nutrição automatizado para reengajar esses contatos."
                variant="info"
              />
            </div>
          </section>

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
              <FunnelChart />
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
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ChannelPerformanceTable />
              <LossReasonsChart />
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
