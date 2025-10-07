import React from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { ChevronDown, Calendar } from "lucide-react";
import { usePeriod } from "@/contexts/PeriodContext";

const PeriodSelector: React.FC = () => {
  const { selectedPeriod, setSelectedPeriod } = usePeriod();

  const periods = [
    { label: "All periods", value: null },
    { label: "Last 7 days", value: 7 },
    { label: "Last 14 days", value: 14 },
    { label: "Last 21 days", value: 21 },
    { label: "Last 30 days", value: 30 },
  ];

  const getSelectedLabel = () => {
    const selected = periods.find(p => p.value === selectedPeriod);
    return selected ? selected.label : "All periods";
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="w-[180px] justify-between">
          <div className="flex items-center">
            <Calendar className="mr-2 h-4 w-4" />
            {getSelectedLabel()}
          </div>
          <ChevronDown className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-[180px]">
        {periods.map((period) => (
          <DropdownMenuItem
            key={period.value || 'all'}
            onClick={() => setSelectedPeriod(period.value)}
            className={selectedPeriod === period.value ? "bg-accent" : ""}
          >
            {period.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default PeriodSelector;