import { Sidebar } from "@/components/Sidebar";
import { KpiCard } from "@/components/KpiCard";
import { ChapterHeader } from "@/components/ChapterHeader";


import { DailyLeadVolumeChart } from "@/components/charts/DailyLeadVolumeChart";
import { DailyAppointmentsChart } from "@/components/charts/DailyAppointmentsChart";
import { AppointmentsByPersonChart } from "@/components/charts/AppointmentsByPersonChart";

import { SchedulingSummaryCards } from "@/components/SchedulingSummaryCards";
import { Card } from "@/components/ui/card";
import DateRangePicker from "@/components/DateRangePicker";
import { useFilters } from "@/contexts/FilterContext";
import { LeadClassificationChart } from "@/components/charts/LeadClassificationChart";
import { CampaignSummaryChart } from "@/components/charts/CampaignSummaryChart";
import { SourceSummaryChart } from "@/components/charts/SourceSummaryChart";
import { ContentSummaryChart } from "@/components/charts/ContentSummaryChart";
import ActiveFilters from "@/components/ActiveFilters";


const Index = () => {
  const { filters } = useFilters();

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
              <div className="w-full max-w-sm">
                <DateRangePicker />
              </div>
            </div>
            <ActiveFilters />
          </div>






          {/* Capítulo 1 */}
          <section className="space-y-6">
            <ChapterHeader
              number={1}
              title="Origem dos Leads"
              description="Resumo agregado por campanha, fonte e conteúdo"
            />
            <div className="grid grid-cols-1 gap-6">
              {/* Gráfico de Volume Diário de Leads */}
              <DailyLeadVolumeChart />
              
              {/* Visualização consolidada com 3 gráficos UTM */}
              <div className="grid grid-cols-1 gap-6">
                <Card className="p-6 card-glow border-border/50">
                  <h3 className="text-lg font-semibold mb-2">Leads por Campanha</h3>
                  <CampaignSummaryChart />
                </Card>
                <Card className="p-6 card-glow border-border/50">
                  <h3 className="text-lg font-semibold mb-2">Leads por Fonte</h3>
                  <SourceSummaryChart />
                </Card>
                <Card className="p-6 card-glow border-border/50">
                  <h3 className="text-lg font-semibold mb-2">Leads por Conteúdo</h3>
                  <ContentSummaryChart />
                </Card>
              </div>
            </div>

            <div>
              <Card className="p-6 card-glow border-border/50">
                <h4 className="text-md font-semibold text-foreground mb-4">Classificação dos Leads</h4>
                <LeadClassificationChart />
              </Card>
            </div>
          </section>



          {/* Capítulo 2 */}
          <section className="space-y-6">
            <ChapterHeader
              number={2}
              title="Performance de Agendamentos"
              description="Acompanhe a conversão de leads em agendamentos e o volume diário de reuniões marcadas"
            />
            <div className="space-y-6">
              {/* Cards de KPI de Agendamentos */}
              <SchedulingSummaryCards />
              
              {/* Análise de Agendamentos */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="p-6 card-glow border-border/50">
                  <h3 className="text-lg font-semibold mb-2">Volume Diário de Agendamentos</h3>
                  <DailyAppointmentsChart />
                </Card>
                <Card className="p-6 card-glow border-border/50">
                  <h3 className="text-lg font-semibold mb-2">Agendamentos por Pessoa</h3>
                  <AppointmentsByPersonChart />
                </Card>
              </div>
            </div>
          </section>

          


        </div>
      </main>
    </div>
  );
};

export default Index;
