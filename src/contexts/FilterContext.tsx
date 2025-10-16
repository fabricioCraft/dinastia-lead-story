import React, { createContext, useContext, useState, ReactNode } from 'react';

export interface DateRange {
  from: Date | undefined;
  to: Date | undefined;
}

export interface FilterState {
  // Filtros de período
  selectedPeriod: number | null;
  dateRange: DateRange | null;
}

interface FilterContextType {
  filters: FilterState;
  setSelectedPeriod: (days: number | null) => void;
  setDateRange: (range: DateRange | null) => void;
  clearAllFilters: () => void;
  getActiveFiltersCount: () => number;
  getFilterParams: () => URLSearchParams;
}

const FilterContext = createContext<FilterContextType | undefined>(undefined);

interface FilterProviderProps {
  children: ReactNode;
}

export const FilterProvider = ({ children }: FilterProviderProps) => {
  const [filters, setFilters] = useState<FilterState>({
    selectedPeriod: null,
    dateRange: null,
  });

  const setSelectedPeriod = (days: number | null) => {
    setFilters(prev => ({
      ...prev,
      selectedPeriod: days,
      // Limpar dateRange quando usar período predefinido
      dateRange: days ? null : prev.dateRange,
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



  const clearAllFilters = () => {
    setFilters({
      selectedPeriod: null,
      dateRange: null,
    });
  };

  const getActiveFiltersCount = () => {
    let count = 0;
    
    if (filters.selectedPeriod) count++;
    if (filters.dateRange?.from && filters.dateRange?.to) count++;
    
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