import React from 'react';

interface TooltipProps {
  data: { status: string; count: number }[] | null;
  position: { x: number; y: number };
  isLoading: boolean;
}

export const FunnelTooltip: React.FC<TooltipProps> = ({ data, position, isLoading }) => {
  const style: React.CSSProperties = {
    top: position.y + 15,
    left: position.x + 15,
  };

  return (
    <div
      style={style}
      className="fixed z-50 p-4 rounded-lg shadow-lg bg-background-light border border-primary text-sm transition-opacity duration-200"
    >
      {isLoading ? (
        <div className="text-text-secondary">Carregando...</div>
      ) : (
        <div>
          <h4 className="font-bold text-primary mb-2">Etapas no Funil</h4>
          {data && data.length > 0 ? (
            <ul className="space-y-1">
              {data.map((item) => (
                <li key={item.status} className="flex justify-between items-center">
                  <span className="text-text-secondary mr-4">{item.status}</span>
                  <span className="font-bold text-accent">{item.count}</span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-text-secondary">Nenhum lead encontrado nestas etapas.</div>
          )}
        </div>
      )}
    </div>
  );
};