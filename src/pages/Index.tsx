import { Sidebar } from "@/components/Sidebar";
import { KpiCard } from "@/components/KpiCard";
import { ChapterHeader } from "@/components/ChapterHeader";
import { LeadsByChannelChart } from "@/components/charts/LeadsByChannelChart";
import { FunnelChart } from "@/components/charts/FunnelChart";
import { TimePerStageChart } from "@/components/charts/TimePerStageChart";
import { LeadEvolutionChart } from "@/components/charts/LeadEvolutionChart";
import { LossReasonsChart } from "@/components/charts/LossReasonsChart";

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
              description="Acompanhe o fluxo, velocidade e gargalos na jornada de conversão"
            />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <FunnelChart />
              <TimePerStageChart />
            </div>
          </section>

          {/* Capítulo 3 */}
          <section className="space-y-6">
            <ChapterHeader
              number={3}
              title="O Resultado da Jornada"
              description="Analise ganhos, perdas e oportunidades de melhoria"
            />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <LeadEvolutionChart />
              <LossReasonsChart />
            </div>
          </section>

          {/* Footer */}
          <div className="pt-8 pb-4 text-center">
            <p className="text-sm text-muted-foreground">
              Dashboard gerado por Dinastia • Dados atualizados em tempo real
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;
