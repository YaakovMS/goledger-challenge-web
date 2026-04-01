import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, Clapperboard, Calendar, Star, X, Film } from 'lucide-react';
import { episodesService, seasonsService, tvShowsService } from '@/services';
import { usePagination } from '@/hooks';
import type { Episode, EpisodeFormData, Season, TvShow } from '@/types';
import {
  Button,
  Card,
  CardContent,
  Modal,
  Input,
  TextArea,
  Select,
  PageLoader,
  EmptyState,
  ConfirmDialog,
  EpisodeStill,
  PaginationControls,
} from '@/components/common';

export function EpisodesPage() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [detailsEpisode, setDetailsEpisode] = useState<Episode | null>(null);
  const [selectedEpisode, setSelectedEpisode] = useState<Episode | null>(null);
  const [formData, setFormData] = useState<EpisodeFormData>({
    episodeNumber: 1,
    title: '',
    seasonKey: '',
    releaseDate: '',
    description: '',
    rating: undefined,
  });

  // Fetch Episodes with pagination
  const { 
    items: episodes, 
    isLoading: episodesLoading,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
    totalFetched,
  } = usePagination<Episode>({
    queryKey: ['episodes'],
    queryFn: episodesService.getPaginated,
    pageSize: 12,
  });

  // Fetch Seasons for the dropdown
  const { data: seasons } = useQuery({
    queryKey: ['seasons'],
    queryFn: seasonsService.getAll,
  });

  // Fetch TV Shows for display
  const { data: tvShows } = useQuery({
    queryKey: ['tvShows'],
    queryFn: tvShowsService.getAll,
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: episodesService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['episodes'] });
      queryClient.invalidateQueries({ queryKey: ['watchlists'] });
      handleCloseModal();
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ key, data }: { key: string; data: Partial<EpisodeFormData> }) =>
      episodesService.update(key, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['episodes'] });
      queryClient.invalidateQueries({ queryKey: ['watchlists'] });
      handleCloseModal();
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: episodesService.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['episodes'] });
      queryClient.invalidateQueries({ queryKey: ['watchlists'] });
      setIsDeleteDialogOpen(false);
      setSelectedEpisode(null);
    },
  });

  const handleOpenModal = (episode?: Episode) => {
    if (episode) {
      setSelectedEpisode(episode);
      setFormData({
        episodeNumber: episode.episodeNumber,
        title: episode.title,
        seasonKey: episode.season?.['@key'] || '',
        releaseDate: episode.releaseDate?.split('T')[0] || '',
        description: episode.description,
        rating: episode.rating,
      });
    } else {
      setSelectedEpisode(null);
      setFormData({
        episodeNumber: 1,
        title: '',
        seasonKey: '',
        releaseDate: '',
        description: '',
        rating: undefined,
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedEpisode(null);
    setFormData({
      episodeNumber: 1,
      title: '',
      seasonKey: '',
      releaseDate: '',
      description: '',
      rating: undefined,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedEpisode) {
      updateMutation.mutate({
        key: selectedEpisode['@key'],
        data: {
          episodeNumber: formData.episodeNumber,
          title: formData.title,
          releaseDate: formData.releaseDate,
          description: formData.description,
          rating: formData.rating,
        },
      });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDelete = (episode: Episode) => {
    setSelectedEpisode(episode);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (selectedEpisode) {
      deleteMutation.mutate(selectedEpisode['@key']);
    }
  };

  const getSeasonInfo = (seasonKey: string): { seasonNumber: number; tvShowTitle: string } => {
    const season = seasons?.find((s: Season) => s['@key'] === seasonKey);
    if (!season) return { seasonNumber: 0, tvShowTitle: 'Unknown' };
    
    const tvShowKey = season.tvShow?.['@key'];
    const tvShow = tvShows?.find((t: TvShow) => t['@key'] === tvShowKey);
    
    return {
      seasonNumber: season.number,
      tvShowTitle: tvShow?.title || 'Unknown Show',
    };
  };

  const getSeasonOptions = () => {
    if (!seasons || !tvShows) return [];
    
    return seasons.map((season: Season) => {
      const tvShowKey = season.tvShow?.['@key'];
      const tvShow = tvShows.find((t: TvShow) => t['@key'] === tvShowKey);
      return {
        value: season['@key'],
        label: `${tvShow?.title || 'Unknown'} - Season ${season.number}`,
      };
    });
  };

  const openDetailsModal = (episode: Episode) => {
    setDetailsEpisode(episode);
    setIsDetailsModalOpen(true);
  };

  const closeDetailsModal = () => {
    setIsDetailsModalOpen(false);
    setDetailsEpisode(null);
  };

  if (episodesLoading) return <PageLoader message="Loading Episodes..." />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Episodes</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Manage episodes for your seasons</p>
        </div>
        <Button leftIcon={<Plus className="w-4 h-4" />} onClick={() => handleOpenModal()}>
          Add Episode
        </Button>
      </div>

      {/* Grid */}
      {episodes && episodes.length > 0 ? (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-6">
            {episodes.map((episode) => {
            const { seasonNumber, tvShowTitle } = getSeasonInfo(episode.season?.['@key'] || '');
            return (
              <Card 
                key={episode['@key']} 
                className="group cursor-pointer hover:border-orange-500/50 transition-colors overflow-hidden h-full flex flex-col"
                onClick={() => openDetailsModal(episode)}
              >
                <CardContent className="p-0 flex flex-col h-full">
                  {/* Episode Still from TMDB */}
                  <EpisodeStill
                    showTitle={tvShowTitle}
                    seasonNumber={seasonNumber}
                    episodeNumber={episode.episodeNumber}
                    className="rounded-t-xl"
                  />
                  <div className="p-2 sm:p-4 flex flex-col flex-1">
                    <h3 className="text-sm sm:text-lg font-semibold text-slate-800 dark:text-slate-200 line-clamp-1 mb-1">
                      {episode.title}
                    </h3>
                    <p className="text-xs sm:text-sm text-indigo-600 dark:text-indigo-400 line-clamp-1 mb-1">
                      {tvShowTitle} - S{seasonNumber}
                    </p>
                    <div className="flex flex-wrap gap-1 sm:gap-2 mb-2">
                      {episode.rating !== undefined && (
                        <span className="flex items-center gap-0.5 sm:gap-1 px-1.5 sm:px-2 py-0.5 sm:py-1 text-[10px] sm:text-xs rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400">
                          <Star className="w-2.5 sm:w-3 h-2.5 sm:h-3" />
                          {episode.rating}
                        </span>
                      )}
                    </div>
                    <div className="flex gap-1 sm:gap-2 mt-auto" onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="ghost"
                        size="sm"
                        leftIcon={<Pencil className="w-3 sm:w-4 h-3 sm:h-4" />}
                        onClick={() => handleOpenModal(episode)}
                        className="text-xs sm:text-sm px-1.5 sm:px-3"
                      >
                        <span className="hidden sm:inline">Edit</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        leftIcon={<Trash2 className="w-3 sm:w-4 h-3 sm:h-4" />}
                        onClick={() => handleDelete(episode)}
                        className="text-red-400 hover:text-red-300 hover:bg-red-500/10 text-xs sm:text-sm px-1.5 sm:px-3"
                      >
                        <span className="hidden sm:inline">Delete</span>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
          </div>
          <PaginationControls
            hasNextPage={hasNextPage}
            isFetchingNextPage={isFetchingNextPage}
            fetchNextPage={fetchNextPage}
            totalFetched={totalFetched}
            itemName="episodes"
          />
        </>
      ) : (
        <EmptyState
          icon={Clapperboard}
          title="No Episodes yet"
          description="Add episodes to fill your seasons with content."
          action={
            <Button leftIcon={<Plus className="w-4 h-4" />} onClick={() => handleOpenModal()}>
              Add Episode
            </Button>
          }
        />
      )}

      {/* Create/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={selectedEpisode ? 'Edit Episode' : 'Add Episode'}
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Select
            label="Season"
            value={formData.seasonKey}
            onChange={(e) => setFormData({ ...formData, seasonKey: e.target.value })}
            options={getSeasonOptions()}
            placeholder="Select a season"
            required
            disabled={!!selectedEpisode}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Episode Number"
              type="number"
              value={formData.episodeNumber}
              onChange={(e) =>
                setFormData({ ...formData, episodeNumber: parseInt(e.target.value, 10) || 1 })
              }
              min={1}
              required
            />
            <Input
              label="Rating (optional)"
              type="number"
              value={formData.rating ?? ''}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  rating: e.target.value ? parseFloat(e.target.value) : undefined,
                })
              }
              placeholder="8.5"
              min={0}
              max={10}
              step={0.1}
            />
          </div>
          <Input
            label="Episode Title"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="Enter episode title"
            required
          />
          <Input
            label="Release Date"
            type="date"
            value={formData.releaseDate}
            onChange={(e) => setFormData({ ...formData, releaseDate: e.target.value })}
            required
          />
          <TextArea
            label="Description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Enter description"
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
              {selectedEpisode ? 'Update' : 'Create'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirm Dialog */}
      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={confirmDelete}
        title="Delete Episode"
        message={`Are you sure you want to delete "${selectedEpisode?.title}"? This action cannot be undone.`}
        confirmText="Delete"
        isLoading={deleteMutation.isPending}
      />

      {/* Details Modal */}
      {isDetailsModalOpen && detailsEpisode && (() => {
        const { seasonNumber, tvShowTitle } = getSeasonInfo(detailsEpisode.season?.['@key'] || '');
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="relative bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden border border-slate-200 dark:border-slate-700/50 shadow-2xl">
              {/* Header Banner with Episode Still */}
              <div className="h-40 relative">
                <EpisodeStill
                  showTitle={tvShowTitle}
                  seasonNumber={seasonNumber}
                  episodeNumber={detailsEpisode.episodeNumber}
                  className="absolute inset-0 w-full h-full rounded-none"
                />
                <div className="absolute inset-0 bg-linear-to-t from-black/70 to-transparent" />
                <button
                  onClick={closeDetailsModal}
                  className="absolute top-4 right-4 p-2 rounded-full bg-black/40 text-white hover:bg-black/60 transition-colors z-10"
                >
                  <X className="w-5 h-5" />
                </button>
                <div className="absolute bottom-4 left-4 flex gap-2">
                  <span className="px-3 py-1 bg-orange-500/90 text-white text-sm font-medium rounded-full">
                    Episode {detailsEpisode.episodeNumber}
                  </span>
                  {detailsEpisode.rating !== undefined && (
                    <span className="flex items-center gap-1 px-3 py-1 bg-amber-500/90 text-white text-sm font-medium rounded-full">
                      <Star className="w-3.5 h-3.5" />
                      {detailsEpisode.rating}
                    </span>
                  )}
                </div>
              </div>

              {/* Content */}
              <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-10rem)]">
                {/* Title & Show Info */}
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{detailsEpisode.title}</h2>
                  <p className="text-indigo-600 dark:text-indigo-400 mt-1">{tvShowTitle} - Season {seasonNumber}</p>
                </div>

                {/* Info Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  <div className="px-4 py-3 bg-slate-100 dark:bg-slate-800/50 rounded-lg">
                    <span className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-1">
                      <Film className="w-3.5 h-3.5" />
                      Season
                    </span>
                    <p className="text-lg font-semibold text-slate-800 dark:text-slate-200">{seasonNumber}</p>
                  </div>
                  <div className="px-4 py-3 bg-slate-100 dark:bg-slate-800/50 rounded-lg">
                    <span className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-1">
                      <Clapperboard className="w-3.5 h-3.5" />
                      Episode
                    </span>
                    <p className="text-lg font-semibold text-slate-800 dark:text-slate-200">{detailsEpisode.episodeNumber}</p>
                  </div>
                  {detailsEpisode.releaseDate && (
                    <div className="px-4 py-3 bg-slate-100 dark:bg-slate-800/50 rounded-lg">
                      <span className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        Release Date
                      </span>
                      <p className="text-lg font-semibold text-slate-800 dark:text-slate-200">
                        {new Date(detailsEpisode.releaseDate).toLocaleDateString()}
                      </p>
                    </div>
                  )}
                  {detailsEpisode.rating !== undefined && (
                    <div className="px-4 py-3 bg-slate-100 dark:bg-slate-800/50 rounded-lg">
                      <span className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-1">
                        <Star className="w-3.5 h-3.5" />
                        Rating
                      </span>
                      <p className="text-lg font-semibold text-amber-500 dark:text-amber-400">{detailsEpisode.rating}/10</p>
                    </div>
                  )}
                </div>

                {/* Description */}
                <div>
                  <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-2">Description</h3>
                  <p className="text-slate-500 dark:text-slate-400 leading-relaxed">
                    {detailsEpisode.description || 'No description available.'}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
                  <Button
                    variant="secondary"
                    leftIcon={<Pencil className="w-4 h-4" />}
                    onClick={() => {
                      closeDetailsModal();
                      handleOpenModal(detailsEpisode);
                    }}
                  >
                    Edit Episode
                  </Button>
                  <Button
                    variant="danger"
                    leftIcon={<Trash2 className="w-4 h-4" />}
                    onClick={() => {
                      closeDetailsModal();
                      handleDelete(detailsEpisode);
                    }}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
