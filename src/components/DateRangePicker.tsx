import React, { useState, useRef, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Calendar, ChevronDown } from "lucide-react";
import { useFilters } from "@/contexts/FilterContext";
import { 
  addDays, 
  subDays, 
  startOfMonth, 
  endOfMonth, 
  subMonths,
  format,
  isEqual,
  startOfDay
} from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface PresetRange {
  label: string;
  range: () => { startDate: Date; endDate: Date };
  days?: number | null;
}

const PREDEFINED_RANGES: PresetRange[] = [
  {
    label: 'Todos os períodos',
    range: () => ({
      startDate: subDays(new Date(), 365),
      endDate: new Date(),
    }),
    days: null,
  },
  {
    label: 'Últimos 7 dias',
    range: () => ({
      startDate: subDays(new Date(), 6),
      endDate: new Date(),
    }),
    days: 7,
  },
  {
    label: 'Últimos 14 dias',
    range: () => ({
      startDate: subDays(new Date(), 13),
      endDate: new Date(),
    }),
    days: 14,
  },
  {
    label: 'Últimos 21 dias',
    range: () => ({
      startDate: subDays(new Date(), 20),
      endDate: new Date(),
    }),
    days: 21,
  },
  {
    label: 'Últimos 30 dias',
    range: () => ({
      startDate: subDays(new Date(), 29),
      endDate: new Date(),
    }),
    days: 30,
  },
  {
    label: 'Este Mês',
    range: () => ({
      startDate: startOfMonth(new Date()),
      endDate: endOfMonth(new Date()),
    }),
    days: new Date().getDate(),
  },
  {
    label: 'Mês Anterior',
    range: () => {
      const lastMonth = subMonths(new Date(), 1);
      return {
        startDate: startOfMonth(lastMonth),
        endDate: endOfMonth(lastMonth),
      };
    },
    days: endOfMonth(subMonths(new Date(), 1)).getDate(),
  },
];

function DateRangePicker() {
  const [isOpen, setIsOpen] = useState(false);
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [showCustomInputs, setShowCustomInputs] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { filters, setSelectedPeriod, setDateRange } = useFilters();

  // Função para converter Date para formato yyyy-MM-dd (input date)
  const formatDateForInput = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Função para converter string yyyy-MM-dd para formato brasileiro dd/MM/yyyy
  const formatDateToBrazilian = (dateString: string): string => {
    if (!dateString) return '';
    const [year, month, day] = dateString.split('-');
    return `${day}/${month}/${year}`;
  };

  // Fechar dropdown quando clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setShowCustomInputs(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Determinar o label ativo
  const getSelectedLabel = (): string => {
    // Verificar se corresponde a um preset
    if (filters.selectedPeriod !== null) {
      const preset = PREDEFINED_RANGES.find(range => range.days === filters.selectedPeriod);
      if (preset) return preset.label;
    }

    // Verificar se "Todos os períodos" está selecionado (selectedPeriod === null)
    if (filters.selectedPeriod === null) {
      // Verificar se é um período customizado ou "Todos os períodos"
      const todosOsPeriodosPreset = PREDEFINED_RANGES.find(range => range.days === null);
      if (todosOsPeriodosPreset && filters.dateRange?.from && filters.dateRange?.to) {
        const todosOsPeriodosRange = todosOsPeriodosPreset.range();
        // Se as datas correspondem ao preset "Todos os períodos", mostrar o label
        if (
          Math.abs(filters.dateRange.from.getTime() - todosOsPeriodosRange.startDate.getTime()) < 24 * 60 * 60 * 1000 &&
          Math.abs(filters.dateRange.to.getTime() - todosOsPeriodosRange.endDate.getTime()) < 24 * 60 * 60 * 1000
        ) {
          return todosOsPeriodosPreset.label;
        }
      }
    }

    // Verificar se há um dateRange customizado
    if (filters.dateRange?.from && filters.dateRange?.to) {
      return `${format(filters.dateRange.from, 'dd/MM/yyyy', { locale: ptBR })} - ${format(filters.dateRange.to, 'dd/MM/yyyy', { locale: ptBR })}`;
    }

    return 'Todos os períodos';
  };

  // Determinar qual preset está ativo
  const getActivePreset = (): number | null => {
    return filters.selectedPeriod;
  };

  // Manipular clique em preset
  const handlePresetClick = (preset: PresetRange) => {
    const range = preset.range();
    
    if (preset.days !== undefined) {
      setSelectedPeriod(preset.days);
    } else {
      setSelectedPeriod(null);
    }
    
    setDateRange({
      from: range.startDate,
      to: range.endDate,
    });
    
    setIsOpen(false);
    setShowCustomInputs(false);
  };

  // Manipular período customizado
  const handleCustomDateSubmit = () => {
    if (customStartDate && customEndDate) {
      // Criar datas usando o formato yyyy-MM-dd e ajustar para timezone local
      // Para evitar problemas de timezone, criamos a data com horário específico
      const [startYear, startMonth, startDay] = customStartDate.split('-').map(Number);
      const [endYear, endMonth, endDay] = customEndDate.split('-').map(Number);
      
      const startDate = new Date(startYear, startMonth - 1, startDay, 0, 0, 0, 0);
      const endDate = new Date(endYear, endMonth - 1, endDay, 23, 59, 59, 999);
      
      if (startDate <= endDate) {
        setDateRange({
          from: startDate,
          to: endDate,
        });
        setSelectedPeriod(null); // Limpar preset selecionado
        setIsOpen(false);
        setShowCustomInputs(false);
        setCustomStartDate('');
        setCustomEndDate('');
      }
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <Button
        variant="outline"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 bg-[#1E2875] border-[#38F2E0] text-white hover:bg-[#38F2E0] hover:text-[#090C40] transition-colors"
      >
        <Calendar className="h-4 w-4" />
        <span className="text-sm font-medium">{getSelectedLabel()}</span>
        <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </Button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-80 bg-[#090C40] border border-[#38F2E0] rounded-lg shadow-lg z-50 overflow-hidden">
          <div className="p-4">
            <h3 className="text-sm font-semibold text-[#38F2E0] mb-3">Períodos Rápidos</h3>
            
            <div className="space-y-1">
              {PREDEFINED_RANGES.map((preset, index) => (
                <button
                  key={index}
                  onClick={() => handlePresetClick(preset)}
                  className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                    getActivePreset() === preset.days
                      ? 'bg-[#38F2E0] text-[#090C40] font-medium'
                      : 'text-white hover:bg-[#1E2875] hover:text-[#38F2E0]'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            <div className="mt-4 pt-4 border-t border-[#1E2875]">
              {!showCustomInputs ? (
                <button
                  onClick={() => setShowCustomInputs(true)}
                  className="w-full text-left px-3 py-2 rounded-md text-sm text-white hover:bg-[#1E2875] hover:text-[#38F2E0] transition-colors"
                >
                  📅 Período Personalizado
                </button>
              ) : (
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-[#38F2E0]">Período Personalizado</h4>
                  
                  <div className="space-y-2">
                    <div>
                      <label className="block text-xs text-gray-300 mb-1">Data Inicial</label>
                      <input
                        type="date"
                        value={customStartDate}
                        onChange={(e) => setCustomStartDate(e.target.value)}
                        className="w-full px-3 py-2 bg-[#1E2875] border border-[#38F2E0] rounded-md text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#38F2E0]"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-xs text-gray-300 mb-1">Data Final</label>
                      <input
                        type="date"
                        value={customEndDate}
                        onChange={(e) => setCustomEndDate(e.target.value)}
                        className="w-full px-3 py-2 bg-[#1E2875] border border-[#38F2E0] rounded-md text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#38F2E0]"
                      />
                    </div>
                  </div>

                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={handleCustomDateSubmit}
                      disabled={!customStartDate || !customEndDate}
                      className="flex-1 px-3 py-2 bg-[#38F2E0] text-[#090C40] rounded-md text-sm font-medium hover:bg-[#2DD4C7] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Aplicar
                    </button>
                    <button
                      onClick={() => {
                        setShowCustomInputs(false);
                        setCustomStartDate('');
                        setCustomEndDate('');
                      }}
                      className="px-3 py-2 bg-[#1E2875] text-white rounded-md text-sm hover:bg-[#2A3284] transition-colors"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default DateRangePicker;