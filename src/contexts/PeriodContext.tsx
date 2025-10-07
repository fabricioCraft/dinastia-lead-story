import React, { createContext, useContext, useState, ReactNode } from 'react';

interface PeriodContextType {
  selectedPeriod: number | null;
  setSelectedPeriod: (days: number | null) => void;
}

const PeriodContext = createContext<PeriodContextType | undefined>(undefined);

interface PeriodProviderProps {
  children: ReactNode;
}

export const PeriodProvider = ({ children }: PeriodProviderProps) => {
  const [selectedPeriod, setSelectedPeriod] = useState<number | null>(null);

  return (
    <PeriodContext.Provider value={{ selectedPeriod, setSelectedPeriod }}>
      {children}
    </PeriodContext.Provider>
  );
};

export const usePeriod = () => {
  const context = useContext(PeriodContext);
  if (context === undefined) {
    throw new Error('usePeriod must be used within a PeriodProvider');
  }
  return context;
};