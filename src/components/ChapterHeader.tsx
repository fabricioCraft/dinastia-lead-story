interface ChapterHeaderProps {
  number: number;
  title: string;
  description?: string;
}

export function ChapterHeader({ number, title, description }: ChapterHeaderProps) {
  return (
    <div className="mb-8">
      <div className="flex items-center gap-3 mb-2">
        <span className="text-primary font-bold text-lg">Capítulo {number}</span>
        <div className="h-px flex-1 bg-gradient-primary opacity-30" />
      </div>
      <h2 className="text-2xl font-bold text-foreground mb-2">{title}</h2>
      {description && (
        <p className="text-muted-foreground">{description}</p>
      )}
    </div>
  );
}
