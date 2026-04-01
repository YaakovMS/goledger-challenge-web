import { useState, useEffect } from 'react';
import { Loader2, ChevronDown } from 'lucide-react';
import { Button } from './Button';
import { TvShowPoster } from './TvShowPoster';

interface PaginationControlsProps {
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => void;
  totalFetched?: number;
  itemName?: string;
}

// Hook para detectar breakpoint e retornar número de colunas
export function useGridColumns(gridCols: [number, number, number, number] = [2, 3, 4, 5]) {
  const [columns, setColumns] = useState(gridCols[0]);

  useEffect(() => {
    const updateColumns = () => {
      const width = window.innerWidth;
      if (width >= 1280) setColumns(gridCols[3]); // xl
      else if (width >= 1024) setColumns(gridCols[2]); // lg
      else if (width >= 640) setColumns(gridCols[1]); // sm
      else setColumns(gridCols[0]); // mobile
    };

    updateColumns();
    window.addEventListener('resize', updateColumns);
    return () => window.removeEventListener('resize', updateColumns);
  }, [gridCols]);

  return columns;
}

// Card com imagem real e blur por cima
function PreviewCardWithImage({ title }: { title: string }) {
  return (
    <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 relative">
      {/* Imagem real do poster */}
      <div className="blur-sm opacity-60">
        <TvShowPoster title={title} aspectRatio="compact" />
      </div>
      {/* Overlay com gradiente */}
      <div className="absolute inset-0 bg-linear-to-t from-white/80 dark:from-slate-950/80 to-transparent pointer-events-none" />
    </div>
  );
}

// Skeleton card para preview (fallback)
export function PreviewCard() {
  return (
    <div className="rounded-xl overflow-hidden bg-slate-200 dark:bg-slate-800/50 animate-pulse opacity-50 blur-[2px] border border-slate-300 dark:border-slate-700">
      <div className="aspect-2/3 bg-slate-300 dark:bg-slate-700" />
      <div className="p-3 space-y-2">
        <div className="h-4 bg-slate-300 dark:bg-slate-700 rounded w-3/4" />
        <div className="h-3 bg-slate-300 dark:bg-slate-700 rounded w-1/2" />
      </div>
    </div>
  );
}

// Componente para gerar os cards de preview - usar dentro do grid principal
export function PreviewCards({ 
  totalItems, 
  hasMore, 
  existingTitles = [] 
}: { 
  totalItems: number; 
  hasMore: boolean;
  existingTitles?: string[];
}) {
  const columns = useGridColumns();
  
  if (!hasMore) return null;
  
  const remainder = totalItems % columns;
  const cardsToFill = remainder === 0 ? 0 : columns - remainder;
  
  if (cardsToFill === 0) return null;
  
  return (
    <>
      {[...Array(cardsToFill)].map((_, i) => {
        // Usa título existente se disponível, senão mostra skeleton
        const title = existingTitles[i % existingTitles.length];
        return title ? (
          <PreviewCardWithImage key={`preview-${i}`} title={title} />
        ) : (
          <PreviewCard key={`preview-${i}`} />
        );
      })}
    </>
  );
}

export function PaginationControls({
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
  totalFetched = 0,
  itemName = 'items',
}: PaginationControlsProps) {
  if (!hasNextPage && !isFetchingNextPage) {
    return totalFetched ? (
      <div className="text-center py-4 text-slate-400 dark:text-slate-500">
        Showing all {totalFetched} {itemName}
      </div>
    ) : null;
  }

  return (
    <div className="flex flex-col items-center gap-2 py-6">
      {totalFetched > 0 && (
        <span className="text-sm text-slate-500 dark:text-slate-400">
          Showing {totalFetched} {itemName}
        </span>
      )}
      <Button
        onClick={() => fetchNextPage()}
        disabled={isFetchingNextPage}
        variant="secondary"
        className="min-w-50"
      >
        {isFetchingNextPage ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Loading...
          </>
        ) : (
          <>
            <ChevronDown className="w-4 h-4 mr-2" />
            Load More
          </>
        )}
      </Button>
    </div>
  );
}
