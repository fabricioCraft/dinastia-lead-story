import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

const data = [
  { channel: "Google Ads", leads: 450, customers: 55, conversion: 12.2, highlight: false },
  { channel: "Busca Orgânica", leads: 280, customers: 35, conversion: 12.5, highlight: true },
  { channel: "Meta Ads", leads: 320, customers: 20, conversion: 6.3, highlight: false },
  { channel: "LinkedIn", leads: 150, customers: 5, conversion: 3.3, highlight: false },
];

export function ChannelPerformanceTable() {
  return (
    <Card className="p-6 card-glow border-border/50 hover:shadow-lg transition-shadow duration-300">
      <h3 className="text-lg font-semibold text-foreground mb-6">Performance de Conversão por Canal</h3>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Canal</TableHead>
            <TableHead className="text-right">Leads Gerados</TableHead>
            <TableHead className="text-right">Clientes Ganhos</TableHead>
            <TableHead className="text-right">Taxa de Conversão</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((row) => (
            <TableRow
              key={row.channel}
              className={cn(
                "transition-all duration-200 hover:scale-[1.01]",
                row.highlight && "bg-accent/10 hover:bg-accent/20 border-l-2 border-accent"
              )}
            >
              <TableCell className="font-medium">{row.channel}</TableCell>
              <TableCell className="text-right">{row.leads}</TableCell>
              <TableCell className="text-right">{row.customers}</TableCell>
              <TableCell className="text-right">
                <span className={cn(
                  "font-semibold",
                  row.highlight && "text-accent"
                )}>
                  {row.conversion}%
                </span>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}
