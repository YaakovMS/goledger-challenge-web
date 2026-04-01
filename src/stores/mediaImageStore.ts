import { useEffect, useCallback } from 'react';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  fetchSeasonDetails,
  fetchEpisodeDetails,
  type SeasonImageData,
  type EpisodeImageData,
} from '../services/tmdb';

// Cache expiration time (7 days in milliseconds)
const CACHE_TTL = 7 * 24 * 60 * 60 * 1000;

const createSeasonKey = (tmdbId: number, seasonNumber: number) =>
  `${tmdbId}_s${seasonNumber}`;

const createEpisodeKey = (tmdbId: number, seasonNumber: number, episodeNumber: number) =>
  `${tmdbId}_s${seasonNumber}_e${episodeNumber}`;

interface SeasonCache {
  [key: string]: SeasonImageData | null;
}

interface EpisodeCache {
  [key: string]: EpisodeImageData | null;
}

// Use object instead of Set for proper React re-renders
interface LoadingState {
  [key: string]: boolean;
}

interface MediaImageStore {
  seasons: SeasonCache;
  episodes: EpisodeCache;
  loadingSeasons: LoadingState;
  loadingEpisodes: LoadingState;

  getSeasonImage: (tmdbId: number, seasonNumber: number) => SeasonImageData | null;
  isSeasonCached: (tmdbId: number, seasonNumber: number) => boolean;
  isSeasonLoading: (tmdbId: number, seasonNumber: number) => boolean;
  fetchSeasonImage: (tmdbId: number, seasonNumber: number) => Promise<SeasonImageData | null>;

  getEpisodeImage: (tmdbId: number, seasonNumber: number, episodeNumber: number) => EpisodeImageData | null;
  isEpisodeCached: (tmdbId: number, seasonNumber: number, episodeNumber: number) => boolean;
  isEpisodeLoading: (tmdbId: number, seasonNumber: number, episodeNumber: number) => boolean;
  fetchEpisodeImage: (tmdbId: number, seasonNumber: number, episodeNumber: number) => Promise<EpisodeImageData | null>;

  clearSeasonCache: (tmdbId: number) => void;
  clearEpisodeCache: (tmdbId: number) => void;
  clearAllCache: () => void;
}

export const useMediaImageStore = create<MediaImageStore>()(
  persist(
    (set, get) => ({
      seasons: {},
      episodes: {},
      loadingSeasons: {},
      loadingEpisodes: {},

      getSeasonImage: (tmdbId: number, seasonNumber: number) => {
        const key = createSeasonKey(tmdbId, seasonNumber);
        const cached = get().seasons[key];
        if (!cached) return null;
        if (Date.now() - cached.fetchedAt > CACHE_TTL) return null;
        return cached;
      },

      isSeasonCached: (tmdbId: number, seasonNumber: number) => {
        const key = createSeasonKey(tmdbId, seasonNumber);
        const cached = get().seasons[key];
        if (!cached) return false;
        return Date.now() - cached.fetchedAt <= CACHE_TTL;
      },

      isSeasonLoading: (tmdbId: number, seasonNumber: number) => {
        const key = createSeasonKey(tmdbId, seasonNumber);
        return !!get().loadingSeasons[key];
      },

      fetchSeasonImage: async (tmdbId: number, seasonNumber: number) => {
        const key = createSeasonKey(tmdbId, seasonNumber);
        const state = get();

        if (state.isSeasonCached(tmdbId, seasonNumber)) {
          return state.getSeasonImage(tmdbId, seasonNumber);
        }

        if (state.loadingSeasons[key]) return null;

        set((state) => ({
          loadingSeasons: { ...state.loadingSeasons, [key]: true },
        }));

        try {
          const data = await fetchSeasonDetails(tmdbId, seasonNumber);

          set((state) => {
            const { [key]: _, ...restLoading } = state.loadingSeasons;
            return {
              seasons: { ...state.seasons, [key]: data },
              loadingSeasons: restLoading,
            };
          });

          return data;
        } catch (error) {
          set((state) => {
            const { [key]: _, ...restLoading } = state.loadingSeasons;
            return { loadingSeasons: restLoading };
          });
          return null;
        }
      },

      getEpisodeImage: (tmdbId: number, seasonNumber: number, episodeNumber: number) => {
        const key = createEpisodeKey(tmdbId, seasonNumber, episodeNumber);
        const cached = get().episodes[key];
        if (!cached) return null;
        if (Date.now() - cached.fetchedAt > CACHE_TTL) return null;
        return cached;
      },

      isEpisodeCached: (tmdbId: number, seasonNumber: number, episodeNumber: number) => {
        const key = createEpisodeKey(tmdbId, seasonNumber, episodeNumber);
        const cached = get().episodes[key];
        if (!cached) return false;
        return Date.now() - cached.fetchedAt <= CACHE_TTL;
      },

      isEpisodeLoading: (tmdbId: number, seasonNumber: number, episodeNumber: number) => {
        const key = createEpisodeKey(tmdbId, seasonNumber, episodeNumber);
        return !!get().loadingEpisodes[key];
      },

      fetchEpisodeImage: async (tmdbId: number, seasonNumber: number, episodeNumber: number) => {
        const key = createEpisodeKey(tmdbId, seasonNumber, episodeNumber);
        const state = get();

        if (state.isEpisodeCached(tmdbId, seasonNumber, episodeNumber)) {
          return state.getEpisodeImage(tmdbId, seasonNumber, episodeNumber);
        }

        if (state.loadingEpisodes[key]) return null;

        set((state) => ({
          loadingEpisodes: { ...state.loadingEpisodes, [key]: true },
        }));

        try {
          const data = await fetchEpisodeDetails(tmdbId, seasonNumber, episodeNumber);

          set((state) => {
            const { [key]: _, ...restLoading } = state.loadingEpisodes;
            return {
              episodes: { ...state.episodes, [key]: data },
              loadingEpisodes: restLoading,
            };
          });

          return data;
        } catch (error) {
          set((state) => {
            const { [key]: _, ...restLoading } = state.loadingEpisodes;
            return { loadingEpisodes: restLoading };
          });
          return null;
        }
      },

      clearSeasonCache: (tmdbId: number) => {
        set((state) => {
          const newSeasons: SeasonCache = {};
          Object.entries(state.seasons).forEach(([key, data]) => {
            if (!key.startsWith(`${tmdbId}_`)) {
              newSeasons[key] = data;
            }
          });
          return { seasons: newSeasons };
        });
      },

      clearEpisodeCache: (tmdbId: number) => {
        set((state) => {
          const newEpisodes: EpisodeCache = {};
          Object.entries(state.episodes).forEach(([key, data]) => {
            if (!key.startsWith(`${tmdbId}_`)) {
              newEpisodes[key] = data;
            }
          });
          return { episodes: newEpisodes };
        });
      },

      clearAllCache: () => {
        set({
          seasons: {},
          episodes: {},
          loadingSeasons: {},
          loadingEpisodes: {},
        });
      },
    }),
    {
      name: 'media-image-cache-storage',
      partialize: (state) => ({
        seasons: state.seasons,
        episodes: state.episodes,
      }),
      merge: (persistedState, currentState) => ({
        ...currentState,
        ...(persistedState as Partial<MediaImageStore>),
        loadingSeasons: {},
        loadingEpisodes: {},
      }),
    }
  )
);

// Hooks with proper state subscriptions
export function useSeasonImage(tmdbId: number | undefined, seasonNumber: number | undefined) {
  const key = tmdbId && seasonNumber !== undefined ? createSeasonKey(tmdbId, seasonNumber) : null;
  
  const image = useMediaImageStore((state) => key ? state.seasons[key] : null);
  const isLoadingState = useMediaImageStore((state) => key ? !!state.loadingSeasons[key] : false);
  const fetchSeasonImage = useMediaImageStore((state) => state.fetchSeasonImage);

  const isCachedValue = image ? Date.now() - image.fetchedAt <= CACHE_TTL : false;

  const triggerFetch = useCallback(() => {
    if (tmdbId && seasonNumber !== undefined && !isCachedValue && !isLoadingState) {
      fetchSeasonImage(tmdbId, seasonNumber);
    }
  }, [tmdbId, seasonNumber, isCachedValue, isLoadingState, fetchSeasonImage]);

  useEffect(() => {
    triggerFetch();
  }, [triggerFetch]);

  return {
    image: isCachedValue ? image : null,
    isLoading: isLoadingState,
  };
}

export function useEpisodeImage(
  tmdbId: number | undefined,
  seasonNumber: number | undefined,
  episodeNumber: number | undefined
) {
  const key = tmdbId && seasonNumber !== undefined && episodeNumber !== undefined 
    ? createEpisodeKey(tmdbId, seasonNumber, episodeNumber) 
    : null;

  const image = useMediaImageStore((state) => key ? state.episodes[key] : null);
  const isLoadingState = useMediaImageStore((state) => key ? !!state.loadingEpisodes[key] : false);
  const fetchEpisodeImage = useMediaImageStore((state) => state.fetchEpisodeImage);

  const isCachedValue = image ? Date.now() - image.fetchedAt <= CACHE_TTL : false;

  const triggerFetch = useCallback(() => {
    if (tmdbId && seasonNumber !== undefined && episodeNumber !== undefined && !isCachedValue && !isLoadingState) {
      fetchEpisodeImage(tmdbId, seasonNumber, episodeNumber);
    }
  }, [tmdbId, seasonNumber, episodeNumber, isCachedValue, isLoadingState, fetchEpisodeImage]);

  useEffect(() => {
    triggerFetch();
  }, [triggerFetch]);

  return {
    image: isCachedValue ? image : null,
    isLoading: isLoadingState,
  };
}
