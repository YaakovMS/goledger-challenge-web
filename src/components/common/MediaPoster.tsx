import { useState, useEffect, useCallback } from 'react';
import { Film, Clapperboard } from 'lucide-react';
import { useSeasonImage, useEpisodeImage } from '@/stores/mediaImageStore';
import { usePosterStore } from '@/stores/posterStore';

interface SeasonPosterProps {
  showTitle: string;
  seasonNumber: number;
  className?: string;
  aspectRatio?: 'video' | 'poster' | 'square';
  size?: 'sm' | 'md' | 'lg';
}

export function SeasonPoster({
  showTitle,
  seasonNumber,
  className = '',
  aspectRatio = 'poster',
  size = 'md',
}: SeasonPosterProps) {
  const { getPoster, fetchPoster, isCached, isLoading: isPosterLoading } = usePosterStore();
  
  // Auto-fetch show poster if not cached
  useEffect(() => {
    if (showTitle && !isCached(showTitle) && !isPosterLoading(showTitle)) {
      fetchPoster(showTitle);
    }
  }, [showTitle, isCached, isPosterLoading, fetchPoster]);
  
  const showPoster = getPoster(showTitle);
  const tmdbId = showPoster?.tmdbId;

  const { image, isLoading } = useSeasonImage(tmdbId, seasonNumber);
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  const handleLoad = useCallback(() => setImageLoaded(true), []);
  const handleError = useCallback(() => setImageError(true), []);

  const aspectClasses = {
    video: 'aspect-video',
    poster: 'aspect-[2/3]',
    square: 'aspect-square',
  };

  const iconSizes = {
    sm: 'w-6 h-6',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
  };

  const hasPoster = image?.posterUrl && !imageError;
  const showSkeleton = isLoading || (hasPoster && !imageLoaded);

  return (
    <div
      className={`
        relative overflow-hidden rounded-xl
        ${aspectClasses[aspectRatio]}
        bg-slate-800
        ${className}
      `}
    >
      {/* Loading skeleton */}
      {showSkeleton && (
        <div className="absolute inset-0 bg-slate-700 animate-pulse flex items-center justify-center">
          <Film className={`${iconSizes[size]} text-white/30`} />
        </div>
      )}

      {/* Season poster image */}
      {hasPoster && (
        <img
          src={image.posterUrl!}
          alt={`Season ${seasonNumber}`}
          width={300}
          height={450}
          decoding="async"
          className={`
            w-full h-full object-cover transition-opacity duration-300
            ${imageLoaded ? 'opacity-100' : 'opacity-0'}
          `}
          onLoad={handleLoad}
          onError={handleError}
          loading="lazy"
        />
      )}

      {/* Fallback gradient with icon */}
      {!hasPoster && !isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-linear-to-br from-emerald-600 to-teal-700">
          <Film className={`${iconSizes[size]} text-white/50`} />
        </div>
      )}

      {/* Season number badge */}
      <div className="absolute top-2 left-2 px-2 py-1 bg-black/60 rounded-md text-xs font-bold text-white">
        T{seasonNumber}
      </div>
    </div>
  );
}

interface EpisodeStillProps {
  showTitle: string;
  seasonNumber: number;
  episodeNumber: number;
  className?: string;
  showOverlay?: boolean;
  overlayContent?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

export function EpisodeStill({
  showTitle,
  seasonNumber,
  episodeNumber,
  className = '',
  showOverlay = false,
  overlayContent,
  size = 'md',
}: EpisodeStillProps) {
  const { getPoster, fetchPoster, isCached, isLoading: isPosterLoading } = usePosterStore();
  
  // Auto-fetch show poster if not cached
  useEffect(() => {
    if (showTitle && !isCached(showTitle) && !isPosterLoading(showTitle)) {
      fetchPoster(showTitle);
    }
  }, [showTitle, isCached, isPosterLoading, fetchPoster]);
  
  const showPoster = getPoster(showTitle);
  const tmdbId = showPoster?.tmdbId;

  const { image, isLoading } = useEpisodeImage(tmdbId, seasonNumber, episodeNumber);
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  const handleLoad = useCallback(() => setImageLoaded(true), []);
  const handleError = useCallback(() => setImageError(true), []);

  const iconSizes = {
    sm: 'w-6 h-6',
    md: 'w-10 h-10',
    lg: 'w-14 h-14',
  };

  const hasStill = image?.stillUrl && !imageError;
  const showSkeleton = isLoading || (hasStill && !imageLoaded);

  return (
    <div
      className={`
        relative overflow-hidden rounded-lg aspect-video
        bg-slate-800
        ${className}
      `}
    >
      {/* Loading skeleton */}
      {showSkeleton && (
        <div className="absolute inset-0 bg-slate-700 animate-pulse flex items-center justify-center">
          <Clapperboard className={`${iconSizes[size]} text-white/30`} />
        </div>
      )}

      {/* Episode still image */}
      {hasStill && (
        <img
          src={image.stillUrl!}
          alt={`S${seasonNumber}E${episodeNumber}`}
          width={640}
          height={360}
          decoding="async"
          className={`
            w-full h-full object-cover transition-opacity duration-300
            ${imageLoaded ? 'opacity-100' : 'opacity-0'}
          `}
          onLoad={handleLoad}
          onError={handleError}
          loading="lazy"
        />
      )}

      {/* Fallback gradient with icon */}
      {!hasStill && !isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-linear-to-br from-orange-600 to-red-700">
          <Clapperboard className={`${iconSizes[size]} text-white/50`} />
        </div>
      )}

      {/* Episode number badge */}
      <div className="absolute top-2 left-2 flex gap-1">
        <span className="px-1.5 py-0.5 bg-emerald-500/90 rounded text-xs font-bold text-white">
          T{seasonNumber}
        </span>
        <span className="px-1.5 py-0.5 bg-orange-500/90 rounded text-xs font-bold text-white">
          E{episodeNumber}
        </span>
      </div>

      {/* Optional overlay content */}
      {showOverlay && overlayContent && (
        <div className="absolute inset-x-0 bottom-0 p-2 bg-linear-to-t from-black/80 to-transparent">
          {overlayContent}
        </div>
      )}
    </div>
  );
}
