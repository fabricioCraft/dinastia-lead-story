import React, { createContext, useContext, useState, ReactNode } from 'react';

export interface DateRange {
  from: Date | undefined;
  to: Date | undefined;
}

export interface FilterState {
  // Filtros de período
  selectedPeriod: number | null;
  dateRange: DateRange | null;
  categoricalFilters: {
    campaign?: string;
    source?: string;
    content?: string;
    classification?: string;
    origin?: string;
  };
}

interface FilterContextType {
  filters: FilterState;
  setSelectedPeriod: (days: number | null) => void;
  setDateRange: (range: DateRange | null) => void;
  clearAllFilters: () => void;
  getActiveFiltersCount: () => number;
  getFilterParams: () => URLSearchParams;
  setCategoricalFilter: (category: keyof FilterState['categoricalFilters'], value: string | undefined) => void;
  clearCategoricalFilter: (category: keyof FilterState['categoricalFilters']) => void;
  clearAllCategoricalFilters: () => void;
}

const FilterContext = createContext<FilterContextType | undefined>(undefined);

interface FilterProviderProps {
  children: ReactNode;
}

export const FilterProvider = ({ children }: FilterProviderProps) => {
  const [filters, setFilters] = useState<FilterState>({
    selectedPeriod: null,
    dateRange: null,
    categoricalFilters: {}
  });

  const setSelectedPeriod = (days: number | null) => {
    setFilters(prev => ({
      ...prev,
      selectedPeriod: days,
      // Manter dateRange para que componentes que dependem dele (charts) funcionem com presets
      // DateRangePicker já sincroniza o range ao escolher presets
      dateRange: prev.dateRange,
    }));
  };

  const setDateRange = (range: DateRange | null) => {
    setFilters(prev => ({
      ...prev,
      dateRange: range,
      // Limpar selectedPeriod quando usar range customizado
      selectedPeriod: range?.from && range?.to ? null : prev.selectedPeriod,
    }));
  };

  const setCategoricalFilter = (category: keyof FilterState['categoricalFilters'], value: string | undefined) => {
    setFilters(prev => ({
      ...prev,
      categoricalFilters: {
        ...prev.categoricalFilters,
        [category]: value
      }
    }));
  };

  const clearCategoricalFilter = (category: keyof FilterState['categoricalFilters']) => {
    setFilters(prev => ({
      ...prev,
      categoricalFilters: {
        ...prev.categoricalFilters,
        [category]: undefined
      }
    }));
  };

  const clearAllCategoricalFilters = () => {
    setFilters(prev => ({
      ...prev,
      categoricalFilters: {}
    }));
  };


  const clearAllFilters = () => {
    setFilters({
      selectedPeriod: null,
      dateRange: null,
      categoricalFilters: {}
    });
  };

  const getActiveFiltersCount = () => {
    let count = 0;
    
    if (filters.selectedPeriod) count++;
    if (filters.dateRange?.from && filters.dateRange?.to) count++;
    const cf = filters.categoricalFilters;
    if (cf.campaign) count++;
    if (cf.source) count++;
    if (cf.content) count++;
    if (cf.classification) count++;
    if (cf.origin) count++;
    
    return count;
  };

  const getFilterParams = () => {
    const params = new URLSearchParams();
    
    // Período ou range de datas
    if (filters.selectedPeriod) {
      params.append('days', filters.selectedPeriod.toString());
    } else if (filters.dateRange?.from && filters.dateRange?.to) {
      params.append('from', filters.dateRange.from.toISOString());
      params.append('to', filters.dateRange.to.toISOString());
    }
    const cf = filters.categoricalFilters;
    if (cf.campaign) params.append('campaign', cf.campaign);
    if (cf.source) params.append('source', cf.source);
    if (cf.content) params.append('content', cf.content);
    if (cf.classification) params.append('classification', cf.classification);
    if (cf.origin) params.append('origin', cf.origin);
    
    return params;
  };

  return (
    <FilterContext.Provider value={{
      filters,
      setSelectedPeriod,
      setDateRange,
      clearAllFilters,
      getActiveFiltersCount,
      getFilterParams,
      setCategoricalFilter,
      clearCategoricalFilter,
      clearAllCategoricalFilters,
    }}>
      {children}
    </FilterContext.Provider>
  );
};

export const useFilters = () => {
  const context = useContext(FilterContext);
  if (context === undefined) {
    throw new Error('useFilters must be used within a FilterProvider');
  }
  return context;
};

// Hook de compatibilidade com o sistema antigo
export const usePeriod = () => {
  const { filters, setSelectedPeriod } = useFilters();
  return {
    selectedPeriod: filters.selectedPeriod,
    setSelectedPeriod,
  };
};
