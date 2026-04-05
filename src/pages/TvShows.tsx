import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, Tv, Users, Heart, Sparkles, Check } from 'lucide-react';
import { tvShowsService, seasonsService, episodesService, watchlistService } from '@/services';
import { useData } from '@/providers';
import type { TvShow, TvShowFormData, Watchlist } from '@/types';
import {
  Button,
  Card,
  CardContent,
  Modal,
  Input,
  TextArea,
  PageLoader,
  EmptyState,
  ConfirmDialog,
  TvShowPoster,
  MultiStepModal,
} from '@/components/common';
import { usePosterStore } from '@/stores';

// Preload TvShowDetails chunk on hover for instant navigation
const preloadTvShowDetails = () => {
  import('@/pages/TvShowDetails');
};
let hasPreloaded = false;

export function TvShowsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { removePoster, updatePoster } = usePosterStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isMultiStepModalOpen, setIsMultiStepModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isWatchlistModalOpen, setIsWatchlistModalOpen] = useState(false);
  const [selectedShow, setSelectedShow] = useState<TvShow | null>(null);
  const [watchlistTargetShow, setWatchlistTargetShow] = useState<TvShow | null>(null);
  const [selectedWatchlistKeys, setSelectedWatchlistKeys] = useState<Set<string>>(new Set());
  const [initialWatchlistKeys, setInitialWatchlistKeys] = useState<Set<string>>(new Set());
  const [formData, setFormData] = useState<TvShowFormData>({
    title: '',
    description: '',
    recommendedAge: 0,
  });

  // Use centralized data from DataProvider
  const { 
    tvShows, 
    watchlists,
    isTvShowsLoading,
    error,
    isShowInWatchlist,
    getShowSeasons,
    getShowEpisodesCount,
  } = useData();

  // Get seasons count for a show
  const getShowSeasonsCount = (showKey: string): number => {
    return getShowSeasons(showKey).length;
  };

  // Create mutation
  const createMutation = useMutation({
    mutationFn: tvShowsService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tvShows'] });
      queryClient.invalidateQueries({ queryKey: ['watchlists'] });
      handleCloseModal();
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ key, data }: { key: string; data: Partial<TvShowFormData>; oldTitle: string }) =>
      tvShowsService.update(key, data),
    onSuccess: (_, variables) => {
      // Update poster cache if title changed
      if (variables.data.title && variables.oldTitle !== variables.data.title) {
        updatePoster(variables.oldTitle, variables.data.title);
      }
      queryClient.invalidateQueries({ queryKey: ['tvShows'] });
      queryClient.invalidateQueries({ queryKey: ['watchlists'] });
      handleCloseModal();
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (show: TvShow) => tvShowsService.delete(show['@key']),
    onSuccess: (_, deletedShow) => {
      // Remove poster from cache
      removePoster(deletedShow.title);
      queryClient.invalidateQueries({ queryKey: ['tvShows'] });
      queryClient.invalidateQueries({ queryKey: ['watchlists'] });
      queryClient.invalidateQueries({ queryKey: ['seasons'] });
      queryClient.invalidateQueries({ queryKey: ['episodes'] });
      setIsDeleteDialogOpen(false);
      setSelectedShow(null);
    },
  });

  // Add to watchlist mutation with optimistic update
  const addToWatchlistMutation = useMutation({
    mutationFn: ({ watchlistKey, showKey }: { watchlistKey: string; showKey: string }) => {
      const watchlist = watchlists?.find((w) => w['@key'] === watchlistKey);
      const currentShows = watchlist?.tvShows?.map((t) => t['@key']) || [];
      return watchlistService.addTvShow(watchlistKey, showKey, currentShows);
    },
    onMutate: async ({ watchlistKey, showKey }) => {
      await queryClient.cancelQueries({ queryKey: ['watchlists'] });
      const previousWatchlists = queryClient.getQueryData(['watchlists']);
      queryClient.setQueryData(['watchlists'], (old: Watchlist[] | undefined) => {
        return old?.map(w => w['@key'] === watchlistKey ? {
          ...w,
          tvShows: [...(w.tvShows || []), { '@key': showKey, '@assetType': 'tvShows' }],
        } : w) || [];
      });
      return { previousWatchlists };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousWatchlists) {
        queryClient.setQueryData(['watchlists'], context.previousWatchlists);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['watchlists'] });
    },
  });

  // Remove from watchlist mutation with optimistic update
  const removeFromWatchlistMutation = useMutation({
    mutationFn: ({ watchlistKey, showKey }: { watchlistKey: string; showKey: string }) => {
      const watchlist = watchlists?.find((w) => w['@key'] === watchlistKey);
      const currentShows = watchlist?.tvShows?.map((t) => t['@key']) || [];
      return watchlistService.removeTvShow(watchlistKey, showKey, currentShows);
    },
    onMutate: async ({ watchlistKey, showKey }) => {
      await queryClient.cancelQueries({ queryKey: ['watchlists'] });
      const previousWatchlists = queryClient.getQueryData(['watchlists']);
      queryClient.setQueryData(['watchlists'], (old: Watchlist[] | undefined) => {
        return old?.map(w => w['@key'] === watchlistKey ? {
          ...w,
          tvShows: w.tvShows?.filter(t => t['@key'] !== showKey) || [],
        } : w) || [];
      });
      return { previousWatchlists };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousWatchlists) {
        queryClient.setQueryData(['watchlists'], context.previousWatchlists);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['watchlists'] });
    },
  });

  // Multi-step creation mutation
  const createCompleteMutation = useMutation({
    mutationFn: async (data: {
      tvShow: { title: string; description: string; recommendedAge: number };
      seasons: Array<{
        number: number;
        year: number;
        episodes: Array<{
          episodeNumber: number;
          title: string;
          description: string;
          releaseDate: string;
          rating: number;
        }>;
      }>;
    }) => {
      // 1. Create TV Show
      const tvShowResult = await tvShowsService.create(data.tvShow);
      const tvShowKey = tvShowResult[0]['@key'];

      // 2. Create Seasons and Episodes
      for (const season of data.seasons) {
        const seasonResult = await seasonsService.create({
          number: season.number,
          year: season.year,
          tvShowKey: tvShowKey,
        });
        const seasonKey = seasonResult[0]['@key'];

        // 3. Create Episodes for this season
        for (const episode of season.episodes) {
          await episodesService.create({
            episodeNumber: episode.episodeNumber,
            title: episode.title,
            description: episode.description,
            releaseDate: episode.releaseDate,
            rating: episode.rating,
            seasonKey: seasonKey,
          });
        }
      }

      return tvShowResult[0];
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tvShows'] });
      queryClient.invalidateQueries({ queryKey: ['seasons'] });
      queryClient.invalidateQueries({ queryKey: ['episodes'] });
      setIsMultiStepModalOpen(false);
    },
  });

  const handleOpenModal = (show?: TvShow) => {
    if (show) {
      setSelectedShow(show);
      setFormData({
        title: show.title,
        description: show.description,
        recommendedAge: show.recommendedAge,
      });
    } else {
      setSelectedShow(null);
      setFormData({
        title: '',
        description: '',
        recommendedAge: 0,
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedShow(null);
    setFormData({
      title: '',
      description: '',
      recommendedAge: 0,
    });
  };

  // Navigate to TV Show details page
  const handleShowClick = (show: TvShow) => {
    navigate(`/tv-shows/${show['@key']}`);
  };

  // Preload TvShowDetails on first hover
  const handleCardHover = useCallback(() => {
    if (!hasPreloaded) {
      hasPreloaded = true;
      preloadTvShowDetails();
    }
  }, []);

  const handleOpenWatchlistModal = (show: TvShow, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setWatchlistTargetShow(show);
    // Get watchlists that already contain this show
    const existingKeys = new Set(
      watchlists
        ?.filter((w) => w.tvShows?.some((t) => t['@key'] === show['@key']))
        .map((w) => w['@key']) || []
    );
    setSelectedWatchlistKeys(new Set(existingKeys));
    setInitialWatchlistKeys(new Set(existingKeys));
    setIsWatchlistModalOpen(true);
  };

  const handleCloseWatchlistModal = () => {
    setIsWatchlistModalOpen(false);
    setWatchlistTargetShow(null);
    setSelectedWatchlistKeys(new Set());
    setInitialWatchlistKeys(new Set());
  };

  const handleToggleWatchlist = (watchlistKey: string) => {
    setSelectedWatchlistKeys((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(watchlistKey)) {
        newSet.delete(watchlistKey);
      } else {
        newSet.add(watchlistKey);
      }
      return newSet;
    });
  };

  const handleSaveWatchlistChanges = async () => {
    if (!watchlistTargetShow) return;

    const showKey = watchlistTargetShow['@key'];
    const toAdd = [...selectedWatchlistKeys].filter((key) => !initialWatchlistKeys.has(key));
    const toRemove = [...initialWatchlistKeys].filter((key) => !selectedWatchlistKeys.has(key));

    // Execute all mutations
    for (const watchlistKey of toAdd) {
      addToWatchlistMutation.mutate({ watchlistKey, showKey });
    }
    for (const watchlistKey of toRemove) {
      removeFromWatchlistMutation.mutate({ watchlistKey, showKey });
    }

    handleCloseWatchlistModal();
  };

  const handleAddToWatchlist = () => {
    handleSaveWatchlistChanges();
  };

  const handleHeartClick = (show: TvShow, e: React.MouseEvent) => {
    e.stopPropagation();
    // Always open the modal to manage watchlists
    handleOpenWatchlistModal(show, e);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedShow) {
      updateMutation.mutate({ key: selectedShow['@key'], data: formData, oldTitle: selectedShow.title });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDelete = (show: TvShow, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedShow(show);
    setIsDeleteDialogOpen(true);
  };

  const handleEdit = (show: TvShow, e: React.MouseEvent) => {
    e.stopPropagation();
    handleOpenModal(show);
  };

  const confirmDelete = () => {
    if (selectedShow) {
      deleteMutation.mutate(selectedShow);
    }
  };

  // Only show loading on initial load when no data is cached
  if (isTvShowsLoading && tvShows.length === 0) return <PageLoader message="Loading TV Shows..." />;
  if (error) return <div className="text-red-500 dark:text-red-400">Error loading TV shows</div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">TV Shows</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Manage your TV shows collection</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="secondary" 
            leftIcon={<Sparkles className="w-4 h-4" />} 
            onClick={() => setIsMultiStepModalOpen(true)}
          >
            <span className="hidden sm:inline">Série Completa</span>
            <span className="sm:hidden">Completa</span>
          </Button>
          <Button leftIcon={<Plus className="w-4 h-4" />} onClick={() => handleOpenModal()}>
            <span className="hidden sm:inline">Add TV Show</span>
            <span className="sm:hidden">Add</span>
          </Button>
        </div>
      </div>

      {/* Grid */}
      {tvShows && tvShows.length > 0 ? (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
            {tvShows.map((show) => {
              const seasonsCount = getShowSeasonsCount(show['@key']);
              const episodesCount = getShowEpisodesCount(show['@key']);
              const inWatchlist = isShowInWatchlist(show['@key']);
              return (
                <Card
                  key={show['@key']}
                  className="group cursor-pointer hover:border-indigo-500/50 transition-all h-full flex flex-col overflow-hidden"
                  onClick={() => handleShowClick(show)}
                  onMouseEnter={handleCardHover}
                >
                  <CardContent className="p-0 flex flex-col h-full">
                    {/* TV Show Poster from TMDB */}
                    <div className="relative">
                      <TvShowPoster
                        title={show.title}
                        aspectRatio="compact"
                        showOverlay
                        overlayContent={
                          <div className="flex flex-wrap gap-1">
                            <span className="px-1 sm:px-2 py-0.5 text-[9px] sm:text-xs rounded-full bg-black/60 text-white font-medium whitespace-nowrap">
                              {seasonsCount} Temp.
                            </span>
                            <span className="px-1 sm:px-2 py-0.5 text-[9px] sm:text-xs rounded-full bg-black/60 text-white font-medium whitespace-nowrap">
                              {episodesCount} Eps.
                            </span>
                          </div>
                        }
                      />
                      {/* Heart button */}
                      <button
                        onClick={(e) => handleHeartClick(show, e)}
                        className={`absolute top-2 right-2 p-1.5 sm:p-2 rounded-full backdrop-blur-sm transition-all ${
                          inWatchlist
                            ? 'bg-red-500/90 text-white hover:bg-red-600'
                            : 'bg-black/40 text-white/80 hover:bg-black/60 hover:text-white'
                        }`}
                      >
                        <Heart className={`w-3.5 sm:w-5 h-3.5 sm:h-5 ${inWatchlist ? 'fill-current' : ''}`} />
                      </button>
                    </div>
                    <div className="p-2 sm:p-4 flex flex-col flex-1 overflow-hidden">
                      <h3 className="text-xs sm:text-base font-semibold text-slate-800 dark:text-slate-200 truncate mb-1 sm:mb-2">
                        {show.title}
                      </h3>
                      <div className="flex flex-wrap gap-1 sm:gap-2 mb-2">
                        <span className="flex items-center gap-0.5 sm:gap-1 px-1.5 sm:px-2 py-0.5 sm:py-1 text-[10px] sm:text-xs rounded-full bg-amber-500/20 text-amber-400">
                          <Users className="w-2.5 sm:w-3 h-2.5 sm:h-3" />
                          {show.recommendedAge}+
                        </span>
                      </div>
                      <div className="flex items-center gap-2 sm:gap-2 mt-auto">
                        <button
                          onClick={(e) => handleEdit(show, e)}
                          className="flex items-center gap-1 text-slate-400 hover:text-indigo-400 transition-colors p-1 sm:p-1.5"
                          title="Edit"
                        >
                          <Pencil className="w-4 h-4 sm:w-4 sm:h-4" />
                          <span className="hidden sm:inline text-xs">Edit</span>
                        </button>
                        <button
                          onClick={(e) => handleDelete(show, e)}
                          className="flex items-center gap-1 text-red-400 hover:text-red-300 transition-colors p-1 sm:p-1.5"
                          title="Delete"
                      >
                        <Trash2 className="w-4 h-4 sm:w-4 sm:h-4" />
                        <span className="hidden sm:inline text-xs">Delete</span>
                      </button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
          </div>
        </>
      ) : (
        <EmptyState
          icon={Tv}
          title="No TV Shows yet"
          description="Get started by adding your first TV show to the collection."
          action={
            <Button leftIcon={<Plus className="w-4 h-4" />} onClick={() => handleOpenModal()}>
              Add TV Show
            </Button>
          }
        />
      )}

      {/* Create/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={selectedShow ? 'Edit TV Show' : 'Add TV Show'}
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Title"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="Enter TV show title"
            required
          />
          <TextArea
            label="Description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Enter description"
            required
          />
          <Input
            label="Recommended Age"
            type="number"
            value={formData.recommendedAge}
            onChange={(e) =>
              setFormData({
                ...formData,
                recommendedAge: parseInt(e.target.value, 10) || 0,
              })
            }
            placeholder="12"
            min={0}
            max={21}
            required
          />
          <div className="flex gap-3 justify-end pt-4">
            <Button type="button" variant="secondary" onClick={handleCloseModal}>
              Cancel
            </Button>
            <Button
              type="submit"
              isLoading={createMutation.isPending || updateMutation.isPending}
            >
              {selectedShow ? 'Update' : 'Create'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirm Dialog */}
      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={confirmDelete}
        title="Delete TV Show"
        message={`Are you sure you want to delete "${selectedShow?.title}"? This action cannot be undone.`}
        confirmText="Delete"
        isLoading={deleteMutation.isPending}
      />

      {/* Add to Watchlist Modal */}
      <Modal
        isOpen={isWatchlistModalOpen}
        onClose={handleCloseWatchlistModal}
        title="Gerenciar Watchlists"
        size="sm"
      >
        <div className="space-y-4">
          {watchlistTargetShow && (
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Selecione as listas para <strong className="text-slate-900 dark:text-slate-100">{watchlistTargetShow.title}</strong>:
            </p>
          )}
          {watchlists && watchlists.length > 0 ? (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {watchlists.map((watchlist) => {
                const isSelected = selectedWatchlistKeys.has(watchlist['@key']);
                const wasInitiallySelected = initialWatchlistKeys.has(watchlist['@key']);
                const hasChanged = isSelected !== wasInitiallySelected;
                
                return (
                  <label
                    key={watchlist['@key']}
                    className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all border-2 ${
                      isSelected
                        ? 'bg-indigo-50 dark:bg-indigo-900/30 border-indigo-500'
                        : 'bg-slate-50 dark:bg-slate-800 border-transparent hover:bg-slate-100 dark:hover:bg-slate-700'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded flex items-center justify-center transition-colors ${
                        isSelected
                          ? 'bg-indigo-500 text-white'
                          : 'bg-white dark:bg-slate-600 border-2 border-slate-300 dark:border-slate-500'
                      }`}
                    >
                      {isSelected && <Check className="w-3.5 h-3.5" />}
                    </div>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleToggleWatchlist(watchlist['@key'])}
                      className="sr-only"
                    />
                    <div className="flex-1 min-w-0">
                      <span className="font-medium text-slate-900 dark:text-slate-100 truncate block">
                        {watchlist.title}
                      </span>
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        {watchlist.tvShows?.length || 0} séries
                      </span>
                    </div>
                    {hasChanged && (
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        isSelected 
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
                          : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                      }`}>
                        {isSelected ? '+ Adicionar' : '- Remover'}
                      </span>
                    )}
                  </label>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-4 text-slate-500 dark:text-slate-400">
              <p className="mb-2">Nenhuma watchlist encontrada.</p>
              <p className="text-sm">Crie uma watchlist primeiro na página de Watchlists.</p>
            </div>
          )}
          <div className="flex gap-3 justify-end pt-4 border-t border-slate-200 dark:border-slate-700">
            <Button variant="secondary" onClick={handleCloseWatchlistModal}>
              Cancelar
            </Button>
            <Button
              onClick={handleAddToWatchlist}
              disabled={
                // Disable if no changes were made
                [...selectedWatchlistKeys].sort().join(',') === [...initialWatchlistKeys].sort().join(',')
              }
              isLoading={addToWatchlistMutation.isPending || removeFromWatchlistMutation.isPending}
              leftIcon={<Heart className="w-4 h-4" />}
            >
              Salvar
            </Button>
          </div>
        </div>
      </Modal>

      {/* Multi-Step Modal for Complete Series */}
      <MultiStepModal
        isOpen={isMultiStepModalOpen}
        onClose={() => setIsMultiStepModalOpen(false)}
        onComplete={(data) => createCompleteMutation.mutate(data)}
        isLoading={createCompleteMutation.isPending}
      />
    </div>
  );
}
