import React, { useState } from 'react';
import { Calendar, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { useFilters } from '@/contexts/FilterContext';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function AdvancedFilter() {
  const {
    filters,
    setDateRange,
    clearAllFilters,
    getActiveFiltersCount,
  } = useFilters();

  const [isCustomDateOpen, setIsCustomDateOpen] = useState(false);

  const activeFiltersCount = getActiveFiltersCount();

  const handleDateRangeSelect = (range: { from: Date | undefined; to: Date | undefined } | undefined) => {
    if (range?.from && range?.to) {
      setDateRange({ from: range.from, to: range.to });
      setIsCustomDateOpen(false);
    } else if (range?.from && !range?.to) {
      // Permite seleção parcial (apenas data inicial)
      setDateRange({ from: range.from, to: undefined });
    } else if (!range) {
      setDateRange(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="h-5 w-5" />
          <h3 className="text-lg font-semibold">Filtro de Período</h3>
          {activeFiltersCount > 0 && (
            <Badge variant="secondary">{activeFiltersCount}</Badge>
          )}
        </div>
        {activeFiltersCount > 0 && (
          <Button variant="outline" size="sm" onClick={clearAllFilters}>
            Limpar Filtro
          </Button>
        )}
      </div>

      <div className="max-w-md">
        {/* Filtro de Data Customizada */}
        <div className="space-y-2">
          <Label>Período Customizado</Label>
          <Popover open={isCustomDateOpen} onOpenChange={setIsCustomDateOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full justify-start text-left font-normal">
                <Calendar className="mr-2 h-4 w-4" />
                {filters.dateRange?.from && filters.dateRange?.to ? (
                  `${format(filters.dateRange.from, 'dd/MM/yyyy', { locale: ptBR })} - ${format(filters.dateRange.to, 'dd/MM/yyyy', { locale: ptBR })}`
                ) : (
                  'Selecionar período'
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <CalendarComponent
                mode="range"
                selected={filters.dateRange}
                onSelect={handleDateRangeSelect}
                numberOfMonths={2}
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </div>
  );
}