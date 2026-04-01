import { useState, useCallback, memo } from 'react';
import { Tv } from 'lucide-react';
import { usePoster } from '@/stores';

interface TvShowPosterProps {
  title: string;
  className?: string;
  aspectRatio?: 'video' | 'poster' | 'square' | 'compact';
  showOverlay?: boolean;
  overlayContent?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

export const TvShowPoster = memo(function TvShowPoster({
  title,
  className = '',
  aspectRatio = 'video',
  showOverlay = false,
  overlayContent,
  size = 'md',
}: TvShowPosterProps) {
  const { poster, isLoading } = usePoster(title);
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  // Memoize callbacks to prevent unnecessary re-renders
  const handleLoad = useCallback(() => setImageLoaded(true), []);
  const handleError = useCallback(() => setImageError(true), []);

  // Determine aspect ratio classes
  const aspectClasses = {
    video: 'aspect-video',
    poster: 'aspect-[2/3]',
    square: 'aspect-square',
    compact: 'aspect-[4/5]',
  };

  // Determine size for fallback icon
  const iconSizes = {
    sm: 'w-8 h-8',
    md: 'w-16 h-16',
    lg: 'w-24 h-24',
  };

  const hasPoster = poster?.posterUrl && !imageError;
  // Show skeleton when loading OR when we have poster URL but image hasn't loaded yet
  const showSkeleton = isLoading || (hasPoster && !imageLoaded);

  return (
    <div
      className={`
        relative overflow-hidden rounded-t-xl
        ${aspectClasses[aspectRatio]}
        bg-slate-900
        ${className}
      `}
    >
      {/* Loading skeleton - shows during load AND while image is loading */}
      {showSkeleton && (
        <div className="absolute inset-0 bg-slate-700 animate-pulse flex items-center justify-center">
          <Tv className={`${iconSizes[size]} text-white/30`} />
        </div>
      )}

      {/* Poster image - absolute positioned to prevent CLS */}
      {hasPoster && (
        <img
          src={poster.posterUrl!}
          alt={title}
          width={300}
          height={450}
          decoding="async"
          className={`
            absolute inset-0 w-full h-full object-cover transition-opacity duration-300
            ${imageLoaded ? 'opacity-100' : 'opacity-0'}
          `}
          onLoad={handleLoad}
          onError={handleError}
          loading="lazy"
        />
      )}

      {/* Fallback gradient with icon - only show when data loaded but no image */}
      {!hasPoster && !isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-linear-to-br from-indigo-600 to-purple-700">
          <Tv className={`${iconSizes[size]} text-white/50`} />
        </div>
      )}

      {/* Optional overlay content */}
      {showOverlay && overlayContent && (
        <div className="absolute inset-x-0 bottom-0 p-2 bg-linear-to-t from-black/80 to-transparent">
          {overlayContent}
        </div>
      )}
    </div>
  );
});

// Backdrop version for hero sections
interface TvShowBackdropProps {
  title: string;
  className?: string;
  children?: React.ReactNode;
}

export function TvShowBackdrop({ title, className = '', children }: TvShowBackdropProps) {
  const { poster, isLoading } = usePoster(title);
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  const handleLoad = useCallback(() => setImageLoaded(true), []);
  const handleError = useCallback(() => setImageError(true), []);

  const hasBackdrop = poster?.backdropUrl && !imageError;
  const showSkeleton = isLoading || (hasBackdrop && !imageLoaded);

  return (
    <div
      className={`
        relative overflow-hidden bg-slate-900
        ${className}
      `}
    >
      {/* Loading state */}
      {showSkeleton && (
        <div className="absolute inset-0 bg-slate-800 animate-pulse" />
      )}

      {/* Backdrop image */}
      {hasBackdrop && (
        <img
          src={poster.backdropUrl!}
          alt={title}
          width={1280}
          height={720}
          decoding="async"
          className={`
            absolute inset-0 w-full h-full object-cover transition-opacity duration-500
            ${imageLoaded ? 'opacity-100' : 'opacity-0'}
          `}
          onLoad={handleLoad}
          onError={handleError}
          loading="lazy"
        />
      )}

      {/* Gradient overlay for readability */}
      <div className="absolute inset-0 bg-linear-to-t from-slate-900 via-slate-900/80 to-slate-900/40" />

      {/* Content */}
      <div className="relative z-10">{children}</div>
    </div>
  );
}
