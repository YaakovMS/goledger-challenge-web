import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, Film, Calendar, Clapperboard, Star, X } from 'lucide-react';
import { seasonsService, tvShowsService, episodesService } from '@/services';
import { usePagination } from '@/hooks';
import type { Season, SeasonFormData, TvShow, Episode } from '@/types';
import {
  Button,
  Card,
  CardContent,
  Modal,
  Input,
  Select,
  PageLoader,
  EmptyState,
  ConfirmDialog,
  SeasonPoster,
  EpisodeStill,
  PaginationControls,
} from '@/components/common';

export function SeasonsPage() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [detailsSeason, setDetailsSeason] = useState<Season | null>(null);
  const [selectedSeason, setSelectedSeason] = useState<Season | null>(null);
  const [formData, setFormData] = useState<SeasonFormData>({
    number: 1,
    tvShowKey: '',
    year: new Date().getFullYear(),
  });

  // Fetch Seasons with pagination
  const { 
    items: seasons, 
    isLoading: seasonsLoading,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
    totalFetched,
  } = usePagination<Season>({
    queryKey: ['seasons'],
    queryFn: seasonsService.getPaginated,
    pageSize: 12,
  });

  // Fetch TV Shows for the dropdown
  const { data: tvShows } = useQuery({
    queryKey: ['tvShows'],
    queryFn: tvShowsService.getAll,
  });

  // Fetch Episodes for details modal
  const { data: episodes } = useQuery({
    queryKey: ['episodes'],
    queryFn: episodesService.getAll,
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: seasonsService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seasons'] });
      queryClient.invalidateQueries({ queryKey: ['watchlists'] });
      handleCloseModal();
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ key, data }: { key: string; data: Partial<SeasonFormData> }) =>
      seasonsService.update(key, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seasons'] });
      queryClient.invalidateQueries({ queryKey: ['watchlists'] });
      handleCloseModal();
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: seasonsService.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seasons'] });
      queryClient.invalidateQueries({ queryKey: ['episodes'] });
      queryClient.invalidateQueries({ queryKey: ['watchlists'] });
      setIsDeleteDialogOpen(false);
      setSelectedSeason(null);
    },
  });

  const handleOpenModal = (season?: Season) => {
    if (season) {
      setSelectedSeason(season);
      setFormData({
        number: season.number,
        tvShowKey: season.tvShow?.['@key'] || '',
        year: season.year,
      });
    } else {
      setSelectedSeason(null);
      setFormData({
        number: 1,
        tvShowKey: '',
        year: new Date().getFullYear(),
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedSeason(null);
    setFormData({
      number: 1,
      tvShowKey: '',
      year: new Date().getFullYear(),
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedSeason) {
      updateMutation.mutate({
        key: selectedSeason['@key'],
        data: {
          number: formData.number,
          year: formData.year,
        },
      });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDelete = (season: Season) => {
    setSelectedSeason(season);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (selectedSeason) {
      deleteMutation.mutate(selectedSeason['@key']);
    }
  };

  const getTvShowTitle = (tvShowKey: string): string => {
    const show = tvShows?.find((s: TvShow) => s['@key'] === tvShowKey);
    return show?.title || 'Unknown Show';
  };

  const getSeasonEpisodes = (seasonKey: string): Episode[] => {
    return episodes?.filter((ep: Episode) => ep.season?.['@key'] === seasonKey) || [];
  };

  const openDetailsModal = (season: Season) => {
    setDetailsSeason(season);
    setIsDetailsModalOpen(true);
  };

  const closeDetailsModal = () => {
    setIsDetailsModalOpen(false);
    setDetailsSeason(null);
  };

  if (seasonsLoading) return <PageLoader message="Loading Seasons..." />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Seasons</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Manage seasons for your TV shows</p>
        </div>
        <Button leftIcon={<Plus className="w-4 h-4" />} onClick={() => handleOpenModal()}>
          Add Season
        </Button>
      </div>

      {/* Grid */}
      {seasons && seasons.length > 0 ? (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-6">
            {seasons.map((season) => {
              const seasonEpisodes = getSeasonEpisodes(season['@key']);
              return (
                <Card 
                  key={season['@key']} 
                  className="group cursor-pointer hover:border-emerald-500/50 transition-colors overflow-hidden h-full flex flex-col"
                  onClick={() => openDetailsModal(season)}
                >
                  <CardContent className="p-0 flex flex-col h-full">
                    {/* Season Poster from TMDB */}
                    <SeasonPoster
                      showTitle={getTvShowTitle(season.tvShow?.['@key'] || '')}
                      seasonNumber={season.number}
                      aspectRatio="video"
                      className="rounded-t-xl"
                    />
                    <div className="p-2 sm:p-4 flex flex-col flex-1">
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <h3 className="text-sm sm:text-lg font-semibold text-slate-800 dark:text-slate-200">
                          Season {season.number}
                        </h3>
                        <span className="flex items-center gap-0.5 sm:gap-1 px-1.5 sm:px-2 py-0.5 sm:py-1 text-[10px] sm:text-xs rounded-full bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                          <Calendar className="w-2.5 sm:w-3 h-2.5 sm:h-3" />
                          {season.year}
                        </span>
                      </div>
                      <p className="text-xs sm:text-sm text-indigo-600 dark:text-indigo-400 line-clamp-1 mb-1">
                        {getTvShowTitle(season.tvShow?.['@key'] || '')}
                      </p>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="px-1.5 sm:px-2 py-0.5 sm:py-1 text-[10px] sm:text-xs rounded-full bg-orange-500/20 text-orange-400">
                          {seasonEpisodes.length} ep{seasonEpisodes.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                      <div className="flex gap-1 sm:gap-2 mt-auto" onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="sm"
                          leftIcon={<Pencil className="w-3 sm:w-4 h-3 sm:h-4" />}
                          onClick={() => handleOpenModal(season)}
                          className="text-xs sm:text-sm px-1.5 sm:px-3"
                        >
                          <span className="hidden sm:inline">Edit</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          leftIcon={<Trash2 className="w-3 sm:w-4 h-3 sm:h-4" />}
                          onClick={() => handleDelete(season)}
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
            itemName="seasons"
          />
        </>
      ) : (
        <EmptyState
          icon={Film}
          title="No Seasons yet"
          description="Add seasons to organize your TV shows content."
          action={
            <Button leftIcon={<Plus className="w-4 h-4" />} onClick={() => handleOpenModal()}>
              Add Season
            </Button>
          }
        />
      )}

      {/* Create/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={selectedSeason ? 'Edit Season' : 'Add Season'}
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Select
            label="TV Show"
            value={formData.tvShowKey}
            onChange={(e) => setFormData({ ...formData, tvShowKey: e.target.value })}
            options={
              tvShows?.map((show: TvShow) => ({
                value: show['@key'],
                label: show.title,
              })) || []
            }
            placeholder="Select a TV show"
            required
            disabled={!!selectedSeason}
          />
          <Input
            label="Season Number"
            type="number"
            value={formData.number}
            onChange={(e) =>
              setFormData({ ...formData, number: parseInt(e.target.value, 10) || 1 })
            }
            min={1}
            required
          />
          <Input
            label="Year of Release"
            type="number"
            value={formData.year}
            onChange={(e) =>
              setFormData({
                ...formData,
                year: parseInt(e.target.value, 10) || new Date().getFullYear(),
              })
            }
            placeholder="2024"
            min={1900}
            max={2100}
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
              {selectedSeason ? 'Update' : 'Create'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirm Dialog */}
      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={confirmDelete}
        title="Delete Season"
        message={`Are you sure you want to delete Season ${selectedSeason?.number}? This action cannot be undone.`}
        confirmText="Delete"
        isLoading={deleteMutation.isPending}
      />

      {/* Details Modal */}
      {isDetailsModalOpen && detailsSeason && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="relative bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden border border-slate-200 dark:border-slate-700/50 shadow-2xl">
            {/* Header Banner with Season Poster */}
            <div className="h-40 relative">
              <SeasonPoster
                showTitle={getTvShowTitle(detailsSeason.tvShow?.['@key'] || '')}
                seasonNumber={detailsSeason.number}
                aspectRatio="video"
                className="absolute inset-0 w-full h-full"
              />
              <div className="absolute inset-0 bg-linear-to-t from-black/70 to-transparent" />
              <button
                onClick={closeDetailsModal}
                className="absolute top-4 right-4 p-2 rounded-full bg-black/40 text-white hover:bg-black/60 transition-colors z-10"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="absolute bottom-4 left-4">
                <span className="px-3 py-1 bg-emerald-500/90 text-white text-sm font-medium rounded-full">
                  Season {detailsSeason.number}
                </span>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-10rem)]">
              {/* TV Show Info */}
              <div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  {getTvShowTitle(detailsSeason.tvShow?.['@key'] || '')}
                </h2>
                <p className="text-slate-500 dark:text-slate-400 mt-1">Season {detailsSeason.number} - {detailsSeason.year}</p>
              </div>

              {/* Stats */}
              <div className="flex gap-4">
                <div className="px-4 py-2 bg-slate-100 dark:bg-slate-800/50 rounded-lg">
                  <span className="text-sm text-slate-500 dark:text-slate-400">Year</span>
                  <p className="text-lg font-semibold text-slate-800 dark:text-slate-200">{detailsSeason.year}</p>
                </div>
                <div className="px-4 py-2 bg-slate-100 dark:bg-slate-800/50 rounded-lg">
                  <span className="text-sm text-slate-500 dark:text-slate-400">Episodes</span>
                  <p className="text-lg font-semibold text-slate-800 dark:text-slate-200">
                    {getSeasonEpisodes(detailsSeason['@key']).length}
                  </p>
                </div>
              </div>

              {/* Episodes List */}
              <div>
                <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-3">Episodes</h3>
                {getSeasonEpisodes(detailsSeason['@key']).length > 0 ? (
                  <div className="space-y-2">
                    {getSeasonEpisodes(detailsSeason['@key'])
                      .sort((a, b) => a.episodeNumber - b.episodeNumber)
                      .map((episode) => (
                        <div
                          key={episode['@key']}
                          className="flex items-center gap-4 p-3 bg-slate-100 dark:bg-slate-800/40 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800/60 transition-colors"
                        >
                          {/* Episode Still */}
                          <div className="w-24 shrink-0">
                            <EpisodeStill
                              showTitle={getTvShowTitle(detailsSeason.tvShow?.['@key'] || '')}
                              seasonNumber={detailsSeason.number}
                              episodeNumber={episode.episodeNumber}
                              size="sm"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-medium text-orange-600 dark:text-orange-400">E{episode.episodeNumber}</span>
                              <h4 className="font-medium text-slate-800 dark:text-slate-200 truncate">{episode.title}</h4>
                            </div>
                            {episode.description && (
                              <p className="text-sm text-slate-500 dark:text-slate-400 truncate">{episode.description}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {episode.rating !== undefined && (
                              <span className="flex items-center gap-1 px-2 py-1 text-xs rounded-full bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400">
                                <Star className="w-3 h-3" />
                                {episode.rating}
                              </span>
                            )}
                            {episode.releaseDate && (
                              <span className="flex items-center gap-1 px-2 py-1 text-xs rounded-full bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                                <Calendar className="w-3 h-3" />
                                {new Date(episode.releaseDate).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                  </div>
                ) : (
                  <div className="text-center py-8 bg-slate-100 dark:bg-slate-800/30 rounded-lg border border-dashed border-slate-300 dark:border-slate-700">
                    <Clapperboard className="w-10 h-10 text-slate-400 dark:text-slate-600 mx-auto mb-2" />
                    <p className="text-slate-500 dark:text-slate-500">No episodes in this season yet</p>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
                <Button
                  variant="secondary"
                  leftIcon={<Pencil className="w-4 h-4" />}
                  onClick={() => {
                    closeDetailsModal();
                    handleOpenModal(detailsSeason);
                  }}
                >
                  Edit Season
                </Button>
                <Button
                  variant="danger"
                  leftIcon={<Trash2 className="w-4 h-4" />}
                  onClick={() => {
                    closeDetailsModal();
                    handleDelete(detailsSeason);
                  }}
                >
                  Delete
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
