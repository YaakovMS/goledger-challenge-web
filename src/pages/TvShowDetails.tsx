import { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { seasonsService, episodesService, watchlistService } from '@/services';
import type { Episode, Watchlist } from '@/types';
import { PageLoader, EmptyState, Modal, Select, AddSeasonEpisodeModal } from '@/components/common';
import { usePosterStore } from '@/stores/posterStore';
import { useMediaImageStore } from '@/stores/mediaImageStore';
import { useData } from '@/providers';
import { ArrowLeft, Heart, HeartOff, Star, Calendar, Clock, Play, Plus } from 'lucide-react';

export default function TvShowDetailsPage() {
  const { key } = useParams<{ key: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { getPoster, fetchPoster } = usePosterStore();
  const { getEpisodeImage, fetchEpisodeImage } = useMediaImageStore();
  
  const [selectedSeasonKey, setSelectedSeasonKey] = useState<string>('');
  const [selectedEpisode, setSelectedEpisode] = useState<Episode | null>(null);
  const [isAddContentModalOpen, setIsAddContentModalOpen] = useState(false);

  // Use centralized data from DataProvider
  const { 
    tvShows, 
    watchlists,
    isLoading,
    getShowSeasons,
    getSeasonEpisodes,
  } = useData();

  // Get the specific TV show from the centralized data
  const tvShow = useMemo(() => {
    return tvShows?.find(show => show['@key'] === key);
  }, [tvShows, key]);

  // Get seasons for this show
  const showSeasons = useMemo(() => {
    if (!key) return [];
    return getShowSeasons(key);
  }, [key, getShowSeasons]);

  // Build episodesBySeason from centralized data
  const episodesBySeason = useMemo(() => {
    if (!showSeasons) return {};
    const result: { [seasonKey: string]: Episode[] } = {};
    showSeasons.forEach(season => {
      result[season['@key']] = getSeasonEpisodes(season['@key']);
    });
    return result;
  }, [showSeasons, getSeasonEpisodes]);

  // Fetch poster do TMDB
  const posterData = tvShow ? getPoster(tvShow.title) : null;
  
  // Se não tem poster cacheado, buscar
  useEffect(() => {
    if (tvShow && !posterData) {
      fetchPoster(tvShow.title);
    }
  }, [tvShow, posterData, fetchPoster]);

  // Fetch episode images quando a season muda
  useEffect(() => {
    if (posterData?.tmdbId && selectedSeasonKey && showSeasons && episodesBySeason) {
      const season = showSeasons.find(s => s['@key'] === selectedSeasonKey);
      const episodes = episodesBySeason[selectedSeasonKey] || [];
      if (season) {
        episodes.forEach(ep => {
          fetchEpisodeImage(posterData.tmdbId, season.number, ep.episodeNumber);
        });
      }
    }
  }, [posterData?.tmdbId, selectedSeasonKey, showSeasons, episodesBySeason, fetchEpisodeImage]);

  // Auto-selecionar primeira temporada
  useEffect(() => {
    if (showSeasons && showSeasons.length > 0 && !selectedSeasonKey) {
      const sortedSeasonsArr = [...showSeasons].sort((a, b) => a.number - b.number);
      setSelectedSeasonKey(sortedSeasonsArr[0]['@key']);
    }
  }, [showSeasons, selectedSeasonKey]);

  // Ordenar temporadas
  const sortedSeasons = useMemo(() => {
    if (!showSeasons) return [];
    return [...showSeasons].sort((a, b) => a.number - b.number);
  }, [showSeasons]);

  // Episódios da temporada selecionada
  const currentEpisodes = useMemo(() => {
    if (!episodesBySeason || !selectedSeasonKey) return [];
    const episodes = episodesBySeason[selectedSeasonKey] || [];
    return [...episodes].sort((a, b) => a.episodeNumber - b.episodeNumber);
  }, [episodesBySeason, selectedSeasonKey]);

  // Season selecionada
  const selectedSeason = useMemo(() => {
    return showSeasons?.find(s => s['@key'] === selectedSeasonKey);
  }, [showSeasons, selectedSeasonKey]);

  // Lógica de watchlist
  const userWatchlist = watchlists && watchlists.length > 0 ? watchlists[0] : null;
  const isInWatchlist = tvShow ? userWatchlist?.tvShows?.some((s) => s['@key'] === tvShow['@key']) : false;
  
  const mutation = useMutation({
    mutationFn: async () => {
      if (!tvShow || !userWatchlist) return;
      if (isInWatchlist) {
        await watchlistService.removeTvShow(userWatchlist['@key'], tvShow['@key'], userWatchlist.tvShows?.map(s => s['@key']) || []);
      } else {
        await watchlistService.addTvShow(userWatchlist['@key'], tvShow['@key'], userWatchlist.tvShows?.map(s => s['@key']) || []);
      }
    },
    onMutate: async () => {
      if (!tvShow || !userWatchlist) return;
      await queryClient.cancelQueries({ queryKey: ['watchlists'] });
      const previousWatchlists = queryClient.getQueryData(['watchlists']);
      
      queryClient.setQueryData(['watchlists'], (old: Watchlist[] | undefined) => {
        return old?.map(w => {
          if (w['@key'] !== userWatchlist['@key']) return w;
          if (isInWatchlist) {
            return { ...w, tvShows: w.tvShows?.filter(t => t['@key'] !== tvShow['@key']) || [] };
          } else {
            return { ...w, tvShows: [...(w.tvShows || []), { '@key': tvShow['@key'], '@assetType': 'tvShows' }] };
          }
        }) || [];
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

  // Mutation para adicionar apenas temporada
  const addSeasonMutation = useMutation({
    mutationFn: async (data: { number: number; year: number }) => {
      if (!key) return;
      return await seasonsService.create({
        number: data.number,
        year: data.year,
        tvShowKey: key,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seasons'] });
      setIsAddContentModalOpen(false);
    },
  });

  // Mutation para adicionar episódios a uma temporada existente
  const addEpisodesMutation = useMutation({
    mutationFn: async ({ seasonKey, episodes }: {
      seasonKey: string;
      episodes: Array<{
        episodeNumber: number;
        title: string;
        description: string;
        releaseDate: string;
        rating: number;
      }>;
    }) => {
      for (const episode of episodes) {
        await episodesService.create({
          episodeNumber: episode.episodeNumber,
          title: episode.title,
          description: episode.description,
          releaseDate: episode.releaseDate,
          rating: episode.rating,
          seasonKey: seasonKey,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seasons'] });
      queryClient.invalidateQueries({ queryKey: ['episodes'] });
      setIsAddContentModalOpen(false);
    },
  });

  // Mutation para adicionar temporada com episódios (fallback/legacy)
  const addContentMutation = useMutation({
    mutationFn: async (data: {
      season: { number: number; year: number };
      episodes: Array<{
        episodeNumber: number;
        title: string;
        description: string;
        releaseDate: string;
        rating: number;
      }>;
    }) => {
      if (!key) return;
      
      // 1. Criar temporada
      const seasonResult = await seasonsService.create({
        number: data.season.number,
        year: data.season.year,
        tvShowKey: key,
      });
      const seasonKey = seasonResult[0]['@key'];

      // 2. Criar episódios (se houver)
      for (const episode of data.episodes) {
        await episodesService.create({
          episodeNumber: episode.episodeNumber,
          title: episode.title,
          description: episode.description,
          releaseDate: episode.releaseDate,
          rating: episode.rating,
          seasonKey: seasonKey,
        });
      }

      return seasonResult[0];
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seasons'] });
      queryClient.invalidateQueries({ queryKey: ['episodes'] });
      setIsAddContentModalOpen(false);
    },
  });

  // Números das temporadas existentes
  const existingSeasonNumbers = useMemo(() => {
    return showSeasons?.map(s => s.number) || [];
  }, [showSeasons]);

  // Totais
  const totalSeasons = showSeasons?.length || 0;
  const totalEpisodes = showSeasons && episodesBySeason
    ? showSeasons.reduce((acc, s) => acc + (episodesBySeason[s['@key']]?.length || 0), 0)
    : 0;

  if (isLoading) {
    return <PageLoader message="Carregando detalhes..." />;
  }

  if (!tvShow) {
    return <EmptyState title="TV Show não encontrado" description="Verifique o link ou selecione outro." />;
  }

  // Use HD backdrop for better quality on large screens
  const backdropUrl = posterData?.backdropUrlHD || posterData?.backdropUrl;

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Layout principal estilo Stremio */}
      <div className="flex flex-col lg:flex-row min-h-screen">
        {/* Lado esquerdo - Info da série com backdrop */}
        <div className="relative lg:w-[60%] xl:w-[65%] min-h-[40vh] lg:min-h-screen overflow-hidden">
          {/* Imagem de backdrop em alta qualidade - completa sem cortes */}
          {backdropUrl && (
            <img 
              src={backdropUrl}
              alt={tvShow.title}
              width={1920}
              height={1080}
              fetchPriority="high"
              decoding="async"
              className="absolute inset-0 w-full h-full object-contain object-top"
            />
          )}
          {/* Overlay gradiente */}
          <div className="absolute inset-0 bg-linear-to-r from-slate-950/90 via-slate-950/70 to-slate-950/50" />
          <div className="absolute inset-0 bg-linear-to-t from-slate-950 via-transparent to-transparent" />
          
          {/* Conteúdo */}
          <div className="relative z-10 p-6 lg:p-10 flex flex-col h-full">
            {/* Botão voltar */}
            <button 
              onClick={() => navigate('/tv-shows')}
              className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors w-fit mb-6"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="text-sm font-medium">Voltar</span>
            </button>

            {/* Logo/Título estilizado */}
            <div className="flex-1 flex flex-col justify-center max-w-2xl">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white mb-4 leading-tight tracking-tight drop-shadow-2xl">
                {tvShow.title}
              </h1>

              {/* Meta info */}
              <div className="flex flex-wrap items-center gap-4 text-sm text-slate-300 mb-6">
                <span className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {totalSeasons} Temp.
                </span>
                <span className="flex items-center gap-1">
                  <Play className="w-4 h-4" />
                  {totalEpisodes} Eps.
                </span>
                <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 font-semibold text-xs">
                  {tvShow.recommendedAge}+
                </span>
              </div>

              {/* Descrição */}
              <p className="text-slate-300 text-base lg:text-lg leading-relaxed mb-8 line-clamp-4 lg:line-clamp-6">
                {tvShow.description}
              </p>

              {/* Botões de ação */}
              <div className="flex flex-wrap gap-3">
                {/* Botão Adicionar Conteúdo */}
                <button
                  onClick={() => setIsAddContentModalOpen(true)}
                  className="flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all bg-green-600 text-white hover:bg-green-500"
                >
                  <Plus className="w-5 h-5" />
                  Adicionar Temporada
                </button>

                {/* Botão Watchlist */}
                {userWatchlist && (
                  <button
                    onClick={() => mutation.mutate()}
                    disabled={mutation.isPending}
                    className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all ${
                      isInWatchlist
                        ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30'
                        : 'bg-indigo-600 text-white hover:bg-indigo-500'
                    }`}
                  >
                    {isInWatchlist ? (
                      <>
                        <HeartOff className="w-5 h-5" />
                        Remover da Watchlist
                      </>
                    ) : (
                      <>
                        <Heart className="w-5 h-5" />
                        Adicionar à Watchlist
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Lado direito - Lista de episódios */}
        <div className="lg:w-[40%] xl:w-[35%] bg-white dark:bg-slate-900/95 backdrop-blur-sm border-l border-slate-200 dark:border-slate-800 flex flex-col max-h-screen lg:sticky lg:top-0">
          {/* Header com seletor de temporada */}
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm sticky top-0 z-20">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Episódios</h2>
              <span className="text-sm text-slate-500 dark:text-slate-400">{currentEpisodes.length} episódios</span>
            </div>
            
            {/* Seletor de temporada */}
            {sortedSeasons.length > 0 && (
              <div className="relative">
                <Select
                  value={selectedSeasonKey}
                  onChange={(e) => setSelectedSeasonKey(e.target.value)}
                  className="w-full"
                  options={sortedSeasons.map((season) => ({
                    value: season['@key'],
                    label: `Temporada ${season.number} (${season.year})`
                  }))}
                />
              </div>
            )}
          </div>

          {/* Lista de episódios */}
          <div className="flex-1 overflow-y-auto">
            {currentEpisodes.length > 0 ? (
              <div className="divide-y divide-slate-200 dark:divide-slate-800">
                {currentEpisodes.map((episode) => {
                  const episodeImage = posterData?.tmdbId && selectedSeason
                    ? getEpisodeImage(posterData.tmdbId, selectedSeason.number, episode.episodeNumber)
                    : null;
                  
                  return (
                    <button
                      key={episode['@key']}
                      onClick={() => setSelectedEpisode(episode)}
                      className="w-full p-4 hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors text-left flex gap-4"
                    >
                      {/* Thumbnail do episódio */}
                      <div className="w-28 h-16 shrink-0 rounded-lg overflow-hidden bg-slate-200 dark:bg-slate-800">
                        {episodeImage?.stillUrl ? (
                          <img 
                            src={episodeImage.stillUrl} 
                            alt={episode.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-linear-to-br from-slate-200 dark:from-slate-700 to-slate-300 dark:to-slate-800">
                            <Play className="w-6 h-6 text-slate-400 dark:text-slate-500" />
                          </div>
                        )}
                      </div>

                      {/* Info do episódio */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <h3 className="font-semibold text-slate-900 dark:text-white text-sm truncate">
                            {episode.episodeNumber}. {episode.title}
                          </h3>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">
                          {episode.releaseDate?.split('T')[0]}
                        </p>
                        {episode.rating && (
                          <div className="flex items-center gap-1">
                            <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                            <span className="text-xs text-amber-400">{episode.rating}</span>
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-64 text-slate-400 dark:text-slate-500">
                <Play className="w-12 h-12 mb-3 opacity-50" />
                <p className="text-sm">Nenhum episódio cadastrado</p>
                <p className="text-xs mt-1">para esta temporada</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal de detalhes do episódio */}
      <Modal
        isOpen={!!selectedEpisode}
        onClose={() => setSelectedEpisode(null)}
        title={selectedEpisode ? `Episódio ${selectedEpisode.episodeNumber}` : ''}
        size="lg"
      >
        {selectedEpisode && (
          <EpisodeDetailModal
            episode={selectedEpisode}
            tmdbId={posterData?.tmdbId}
            seasonNumber={selectedSeason?.number}
          />
        )}
      </Modal>

      {/* Modal para adicionar temporada e episódios */}
      <AddSeasonEpisodeModal
        isOpen={isAddContentModalOpen}
        onClose={() => setIsAddContentModalOpen(false)}
        tvShowTitle={tvShow.title}
        existingSeasons={existingSeasonNumbers}
        seasons={showSeasons || []}
        onAddSeason={(data) => addSeasonMutation.mutate(data)}
        onAddEpisodes={(seasonKey, episodes) => addEpisodesMutation.mutate({ seasonKey, episodes })}
        onComplete={(data) => addContentMutation.mutate(data)}
        isLoading={addSeasonMutation.isPending || addEpisodesMutation.isPending || addContentMutation.isPending}
      />
    </div>
  );
}

// Componente do modal de episódio
interface EpisodeDetailModalProps {
  episode: Episode;
  tmdbId?: number;
  seasonNumber?: number;
}

function EpisodeDetailModal({ episode, tmdbId, seasonNumber }: EpisodeDetailModalProps) {
  const { getEpisodeImage } = useMediaImageStore();
  const episodeImage = tmdbId && seasonNumber
    ? getEpisodeImage(tmdbId, seasonNumber, episode.episodeNumber)
    : null;

  return (
    <div className="space-y-4">
      {/* Imagem do episódio */}
      {episodeImage?.stillUrl && (
        <div className="w-full aspect-video rounded-lg overflow-hidden bg-slate-200 dark:bg-slate-800">
          <img 
            src={episodeImage.stillUrl} 
            alt={episode.title}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {/* Título */}
      <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
        {episode.title}
      </h2>

      {/* Meta info */}
      <div className="flex flex-wrap items-center gap-4 text-sm">
        <span className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
          <Calendar className="w-4 h-4" />
          {episode.releaseDate?.split('T')[0]}
        </span>
        {episode.rating && (
          <span className="flex items-center gap-1 text-amber-500">
            <Star className="w-4 h-4 fill-amber-500" />
            {episode.rating}/10
          </span>
        )}
        <span className="px-2 py-1 rounded bg-indigo-500/20 text-indigo-400 text-xs font-semibold">
          Episódio {episode.episodeNumber}
        </span>
      </div>

      {/* Descrição */}
      <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
        <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 mb-2">Sinopse</h3>
        <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
          {episode.description || episodeImage?.overview || 'Sem descrição disponível.'}
        </p>
      </div>
    </div>
  );
}
