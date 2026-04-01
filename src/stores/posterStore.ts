import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { fetchPosterForShow, type PosterData } from '../services/tmdb';

// Cache expiration time (7 days in milliseconds)
const CACHE_TTL = 7 * 24 * 60 * 60 * 1000;

interface PosterCache {
  [showTitle: string]: PosterData | null;
}

// Use object instead of Set for proper React re-renders
interface LoadingState {
  [key: string]: boolean;
}

interface PosterStore {
  posters: PosterCache;
  loading: LoadingState;
  
  getPoster: (title: string) => PosterData | null;
  isCached: (title: string) => boolean;
  isLoading: (title: string) => boolean;
  fetchPoster: (title: string) => Promise<PosterData | null>;
  fetchPosters: (titles: string[]) => Promise<void>;
  removePoster: (title: string) => void;
  updatePoster: (oldTitle: string, newTitle: string) => Promise<void>;
  clearCache: () => void;
  clearExpired: () => void;
}

export const usePosterStore = create<PosterStore>()(
  persist(
    (set, get) => ({
      posters: {},
      loading: {},

      getPoster: (title: string) => {
        const cached = get().posters[title];
        if (!cached) return null;
        if (Date.now() - cached.fetchedAt > CACHE_TTL) return null;
        return cached;
      },

      isCached: (title: string) => {
        const cached = get().posters[title];
        if (!cached) return false;
        return Date.now() - cached.fetchedAt <= CACHE_TTL;
      },

      isLoading: (title: string) => {
        return !!get().loading[title];
      },

      fetchPoster: async (title: string) => {
        const state = get();
        
        if (state.isCached(title)) {
          return state.getPoster(title);
        }
        
        if (state.loading[title]) {
          return null;
        }

        set((state) => ({
          loading: { ...state.loading, [title]: true },
        }));

        try {
          const posterData = await fetchPosterForShow(title);
          
          set((state) => {
            const { [title]: _, ...restLoading } = state.loading;
            return {
              posters: { ...state.posters, [title]: posterData },
              loading: restLoading,
            };
          });

          return posterData;
        } catch (error) {
          console.error(`Error fetching poster for "${title}":`, error);
          
          set((state) => {
            const { [title]: _, ...restLoading } = state.loading;
            return { loading: restLoading };
          });

          return null;
        }
      },

      fetchPosters: async (titles: string[]) => {
        const { isCached, fetchPoster } = get();
        const uncached = titles.filter((title) => !isCached(title));
        if (uncached.length === 0) return;
        // Limit concurrent requests to avoid overwhelming TMDB API
        const BATCH_SIZE = 5;
        for (let i = 0; i < uncached.length; i += BATCH_SIZE) {
          const batch = uncached.slice(i, i + BATCH_SIZE);
          await Promise.all(batch.map(fetchPoster));
        }
      },

      removePoster: (title: string) => {
        set((state) => {
          const { [title]: _, ...restPosters } = state.posters;
          return { posters: restPosters };
        });
      },

      updatePoster: async (oldTitle: string, newTitle: string) => {
        const { posters, fetchPoster, removePoster } = get();
        
        if (oldTitle !== newTitle) {
          removePoster(oldTitle);
          await fetchPoster(newTitle);
        } else if (posters[oldTitle]) {
          set((state) => {
            const { [oldTitle]: _, ...restPosters } = state.posters;
            return { posters: restPosters };
          });
          await fetchPoster(newTitle);
        }
      },

      clearCache: () => {
        set({ posters: {}, loading: {} });
      },

      clearExpired: () => {
        const now = Date.now();
        set((state) => {
          const newPosters: PosterCache = {};
          Object.entries(state.posters).forEach(([title, data]) => {
            if (data && now - data.fetchedAt <= CACHE_TTL) {
              newPosters[title] = data;
            }
          });
          return { posters: newPosters };
        });
      },
    }),
    {
      name: 'poster-cache-storage',
      partialize: (state) => ({ posters: state.posters }),
      merge: (persistedState, currentState) => ({
        ...currentState,
        ...(persistedState as Partial<PosterStore>),
        loading: {},
      }),
    }
  )
);

// Hook with proper state subscriptions for re-renders
// Does NOT trigger fetch - batch fetch is done by DataProvider
export function usePoster(title: string | undefined) {
  // Subscribe to specific state slices - this triggers re-renders when they change
  const poster = usePosterStore((state) => title ? state.posters[title] : null);
  const isLoadingState = usePosterStore((state) => title ? !!state.loading[title] : false);
  
  const isCachedValue = poster ? Date.now() - poster.fetchedAt <= CACHE_TTL : false;

  return {
    poster: isCachedValue ? poster : null,
    isLoading: isLoadingState,
    isCached: isCachedValue,
  };
}
