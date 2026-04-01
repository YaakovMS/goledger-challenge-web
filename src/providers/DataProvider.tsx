import { createContext, useContext, useCallback, useMemo, useEffect, type ReactNode } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tvShowsService, seasonsService, episodesService, watchlistService } from '@/services';
import type { TvShow, Season, Episode, Watchlist, WatchlistFormData, TvShowFormData } from '@/types';
import { usePosterStore } from '@/stores';

// Query keys constants
export const QUERY_KEYS = {
  tvShows: ['tvShows'] as const,
  seasons: ['seasons'] as const,
  episodes: ['episodes'] as const,
  watchlists: ['watchlists'] as const,
} as const;

interface DataContextValue {
  // Data
  tvShows: TvShow[];
  seasons: Season[];
  episodes: Episode[];
  watchlists: Watchlist[];
  
  // Loading states
  isLoading: boolean;
  isTvShowsLoading: boolean;
  isSeasonsLoading: boolean;
  isEpisodesLoading: boolean;
  isWatchlistsLoading: boolean;
  
  // Error state
  error: Error | null;
  
  // Helper functions
  getShowSeasons: (showKey: string) => Season[];
  getShowEpisodesCount: (showKey: string) => number;
  getSeasonEpisodes: (seasonKey: string) => Episode[];
  isShowInWatchlist: (showKey: string) => boolean;
  getWatchlistsWithShow: (showKey: string) => Watchlist[];
  
  // Watchlist mutations
  addToWatchlist: (watchlistKey: string, showKey: string) => void;
  removeFromWatchlist: (watchlistKey: string, showKey: string) => void;
  createWatchlist: (data: WatchlistFormData) => Promise<void>;
  updateWatchlist: (key: string, data: Partial<WatchlistFormData>) => Promise<void>;
  deleteWatchlist: (key: string) => Promise<void>;
  
  // TV Show mutations
  createTvShow: (data: TvShowFormData) => Promise<void>;
  updateTvShow: (key: string, data: Partial<TvShowFormData>, oldTitle?: string) => Promise<void>;
  deleteTvShow: (show: TvShow) => Promise<void>;
  
  // Mutation states
  isAddingToWatchlist: boolean;
  isRemovingFromWatchlist: boolean;
}

const DataContext = createContext<DataContextValue | null>(null);

// Shared query options for consistency
const sharedQueryOptions = {
  staleTime: 1000 * 60 * 2, // 2 minutes
  gcTime: 1000 * 60 * 10, // 10 minutes
  refetchOnMount: false,
  refetchOnWindowFocus: false,
};

export function DataProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const { removePoster, updatePoster, fetchPosters } = usePosterStore();

  // Centralized queries - data is fetched once and shared
  const { data: tvShows = [], isLoading: isTvShowsLoading, error: tvShowsError } = useQuery({
    queryKey: QUERY_KEYS.tvShows,
    queryFn: tvShowsService.getAll,
    ...sharedQueryOptions,
  });

  const { data: seasons = [], isLoading: isSeasonsLoading, error: seasonsError } = useQuery({
    queryKey: QUERY_KEYS.seasons,
    queryFn: seasonsService.getAll,
    ...sharedQueryOptions,
  });

  const { data: episodes = [], isLoading: isEpisodesLoading, error: episodesError } = useQuery({
    queryKey: QUERY_KEYS.episodes,
    queryFn: episodesService.getAll,
    ...sharedQueryOptions,
  });

  const { data: watchlists = [], isLoading: isWatchlistsLoading, error: watchlistsError } = useQuery({
    queryKey: QUERY_KEYS.watchlists,
    queryFn: watchlistService.getAll,
    ...sharedQueryOptions,
  });

  const isLoading = isTvShowsLoading || isSeasonsLoading || isEpisodesLoading || isWatchlistsLoading;
  const error = tvShowsError || seasonsError || episodesError || watchlistsError || null;

  // Pre-fetch all posters when tvShows load for instant navigation
  useEffect(() => {
    if (tvShows.length > 0) {
      const titles = tvShows.map(show => show.title);
      fetchPosters(titles);
    }
  }, [tvShows, fetchPosters]);

  // Memoized helper functions
  const getShowSeasons = useCallback((showKey: string) => {
    return seasons.filter((s) => s.tvShow?.['@key'] === showKey);
  }, [seasons]);

  const getSeasonEpisodes = useCallback((seasonKey: string) => {
    return episodes.filter((e) => e.season?.['@key'] === seasonKey);
  }, [episodes]);

  const getShowEpisodesCount = useCallback((showKey: string) => {
    const showSeasons = getShowSeasons(showKey);
    return showSeasons.reduce((acc, season) => {
      return acc + getSeasonEpisodes(season['@key']).length;
    }, 0);
  }, [getShowSeasons, getSeasonEpisodes]);

  const isShowInWatchlist = useCallback((showKey: string) => {
    return watchlists.some((w) => w.tvShows?.some((t) => t['@key'] === showKey));
  }, [watchlists]);

  const getWatchlistsWithShow = useCallback((showKey: string) => {
    return watchlists.filter((w) => w.tvShows?.some((t) => t['@key'] === showKey));
  }, [watchlists]);

  // Optimistic add to watchlist
  const addToWatchlistMutation = useMutation({
    mutationFn: async ({ watchlistKey, showKey }: { watchlistKey: string; showKey: string }) => {
      const watchlist = watchlists.find((w) => w['@key'] === watchlistKey);
      const currentShows = watchlist?.tvShows?.map((t) => t['@key']) || [];
      return watchlistService.addTvShow(watchlistKey, showKey, currentShows);
    },
    onMutate: async ({ watchlistKey, showKey }) => {
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.watchlists });
      const previous = queryClient.getQueryData<Watchlist[]>(QUERY_KEYS.watchlists);
      
      queryClient.setQueryData<Watchlist[]>(QUERY_KEYS.watchlists, (old = []) =>
        old.map((w) =>
          w['@key'] === watchlistKey
            ? { ...w, tvShows: [...(w.tvShows || []), { '@key': showKey, '@assetType': 'tvShows' }] }
            : w
        )
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(QUERY_KEYS.watchlists, context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.watchlists });
    },
  });

  // Optimistic remove from watchlist
  const removeFromWatchlistMutation = useMutation({
    mutationFn: async ({ watchlistKey, showKey }: { watchlistKey: string; showKey: string }) => {
      const watchlist = watchlists.find((w) => w['@key'] === watchlistKey);
      const currentShows = watchlist?.tvShows?.map((t) => t['@key']) || [];
      return watchlistService.removeTvShow(watchlistKey, showKey, currentShows);
    },
    onMutate: async ({ watchlistKey, showKey }) => {
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.watchlists });
      const previous = queryClient.getQueryData<Watchlist[]>(QUERY_KEYS.watchlists);
      
      queryClient.setQueryData<Watchlist[]>(QUERY_KEYS.watchlists, (old = []) =>
        old.map((w) =>
          w['@key'] === watchlistKey
            ? { ...w, tvShows: w.tvShows?.filter((t) => t['@key'] !== showKey) || [] }
            : w
        )
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(QUERY_KEYS.watchlists, context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.watchlists });
    },
  });

  // Create watchlist mutation
  const createWatchlistMutation = useMutation({
    mutationFn: watchlistService.create,
    onMutate: async (newData) => {
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.watchlists });
      const previous = queryClient.getQueryData<Watchlist[]>(QUERY_KEYS.watchlists);
      
      const optimistic: Watchlist = {
        '@key': `temp-${Date.now()}`,
        '@assetType': 'watchlist',
        title: newData.title,
        description: newData.description,
        tvShows: newData.tvShowKeys?.map((key) => ({ '@key': key, '@assetType': 'tvShows' })) || [],
      };
      
      queryClient.setQueryData<Watchlist[]>(QUERY_KEYS.watchlists, (old = []) => [...old, optimistic]);
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(QUERY_KEYS.watchlists, context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.watchlists });
    },
  });

  // Update watchlist mutation
  const updateWatchlistMutation = useMutation({
    mutationFn: ({ key, data }: { key: string; data: Partial<WatchlistFormData> }) =>
      watchlistService.update(key, data),
    onMutate: async ({ key, data }) => {
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.watchlists });
      const previous = queryClient.getQueryData<Watchlist[]>(QUERY_KEYS.watchlists);
      
      queryClient.setQueryData<Watchlist[]>(QUERY_KEYS.watchlists, (old = []) =>
        old.map((w) =>
          w['@key'] === key
            ? {
                ...w,
                ...(data.title && { title: data.title }),
                ...(data.description !== undefined && { description: data.description }),
                ...(data.tvShowKeys && {
                  tvShows: data.tvShowKeys.map((k) => ({ '@key': k, '@assetType': 'tvShows' })),
                }),
              }
            : w
        )
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(QUERY_KEYS.watchlists, context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.watchlists });
    },
  });

  // Delete watchlist mutation
  const deleteWatchlistMutation = useMutation({
    mutationFn: watchlistService.delete,
    onMutate: async (key) => {
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.watchlists });
      const previous = queryClient.getQueryData<Watchlist[]>(QUERY_KEYS.watchlists);
      
      queryClient.setQueryData<Watchlist[]>(QUERY_KEYS.watchlists, (old = []) =>
        old.filter((w) => w['@key'] !== key)
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(QUERY_KEYS.watchlists, context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.watchlists });
    },
  });

  // TV Show mutations
  const createTvShowMutation = useMutation({
    mutationFn: tvShowsService.create,
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.tvShows });
    },
  });

  const updateTvShowMutation = useMutation({
    mutationFn: ({ key, data }: { key: string; data: Partial<TvShowFormData>; oldTitle?: string }) =>
      tvShowsService.update(key, data),
    onSuccess: (_, variables) => {
      if (variables.data.title && variables.oldTitle && variables.oldTitle !== variables.data.title) {
        updatePoster(variables.oldTitle, variables.data.title);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.tvShows });
    },
  });

  const deleteTvShowMutation = useMutation({
    mutationFn: (show: TvShow) => tvShowsService.delete(show['@key']),
    onSuccess: (_, deletedShow) => {
      removePoster(deletedShow.title);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.tvShows });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.seasons });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.episodes });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.watchlists });
    },
  });

  // Exposed mutation handlers
  const addToWatchlist = useCallback(
    (watchlistKey: string, showKey: string) => {
      addToWatchlistMutation.mutate({ watchlistKey, showKey });
    },
    [addToWatchlistMutation]
  );

  const removeFromWatchlist = useCallback(
    (watchlistKey: string, showKey: string) => {
      removeFromWatchlistMutation.mutate({ watchlistKey, showKey });
    },
    [removeFromWatchlistMutation]
  );

  const createWatchlist = useCallback(
    async (data: WatchlistFormData) => {
      await createWatchlistMutation.mutateAsync(data);
    },
    [createWatchlistMutation]
  );

  const updateWatchlist = useCallback(
    async (key: string, data: Partial<WatchlistFormData>) => {
      await updateWatchlistMutation.mutateAsync({ key, data });
    },
    [updateWatchlistMutation]
  );

  const deleteWatchlist = useCallback(
    async (key: string) => {
      await deleteWatchlistMutation.mutateAsync(key);
    },
    [deleteWatchlistMutation]
  );

  const createTvShow = useCallback(
    async (data: TvShowFormData) => {
      await createTvShowMutation.mutateAsync(data);
    },
    [createTvShowMutation]
  );

  const updateTvShow = useCallback(
    async (key: string, data: Partial<TvShowFormData>, oldTitle?: string) => {
      await updateTvShowMutation.mutateAsync({ key, data, oldTitle });
    },
    [updateTvShowMutation]
  );

  const deleteTvShow = useCallback(
    async (show: TvShow) => {
      await deleteTvShowMutation.mutateAsync(show);
    },
    [deleteTvShowMutation]
  );

  const value = useMemo<DataContextValue>(
    () => ({
      tvShows,
      seasons,
      episodes,
      watchlists,
      isLoading,
      isTvShowsLoading,
      isSeasonsLoading,
      isEpisodesLoading,
      isWatchlistsLoading,
      error,
      getShowSeasons,
      getShowEpisodesCount,
      getSeasonEpisodes,
      isShowInWatchlist,
      getWatchlistsWithShow,
      addToWatchlist,
      removeFromWatchlist,
      createWatchlist,
      updateWatchlist,
      deleteWatchlist,
      createTvShow,
      updateTvShow,
      deleteTvShow,
      isAddingToWatchlist: addToWatchlistMutation.isPending,
      isRemovingFromWatchlist: removeFromWatchlistMutation.isPending,
    }),
    [
      tvShows,
      seasons,
      episodes,
      watchlists,
      isLoading,
      isTvShowsLoading,
      isSeasonsLoading,
      isEpisodesLoading,
      isWatchlistsLoading,
      error,
      getShowSeasons,
      getShowEpisodesCount,
      getSeasonEpisodes,
      isShowInWatchlist,
      getWatchlistsWithShow,
      addToWatchlist,
      removeFromWatchlist,
      createWatchlist,
      updateWatchlist,
      deleteWatchlist,
      createTvShow,
      updateTvShow,
      deleteTvShow,
      addToWatchlistMutation.isPending,
      removeFromWatchlistMutation.isPending,
    ]
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
}
