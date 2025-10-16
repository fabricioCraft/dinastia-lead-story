import { Sidebar } from "@/components/Sidebar";
import { KpiCard } from "@/components/KpiCard";
import { ChapterHeader } from "@/components/ChapterHeader";

import { UnifiedOriginChart } from "@/components/charts/UnifiedOriginChart";

import { DailyLeadVolumeChart } from "@/components/charts/DailyLeadVolumeChart";
import { DailyAppointmentsChart } from "@/components/charts/DailyAppointmentsChart";

import { SchedulingSummaryCards } from "@/components/SchedulingSummaryCards";
import { Card } from "@/components/ui/card";
import DateRangePicker from "@/components/DateRangePicker";
import { useFilters } from "@/contexts/FilterContext";


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
          </div>






          {/* Capítulo 1 */}
          <section className="space-y-6">
            <ChapterHeader
              number={1}
              title="De Onde Nossos Leads Vêm?"
              description="Entenda a origem e distribuição dos seus leads por canal de aquisição"
            />
            <div className="grid grid-cols-1 gap-6">
              {/* Gráfico de Volume Diário de Leads */}
              <DailyLeadVolumeChart />
              
              {/* Gráfico de Origem dos Leads */}
              <Card className="p-6 card-glow border-border/50">
                <h4 className="text-md font-semibold text-foreground mb-4">Origem dos Leads</h4>
                <UnifiedOriginChart />
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
              
              {/* Gráfico de Volume Diário de Agendamentos */}
              <DailyAppointmentsChart />
            </div>
          </section>


        </div>
      </main>
    </div>
  );
};

export default Index;
