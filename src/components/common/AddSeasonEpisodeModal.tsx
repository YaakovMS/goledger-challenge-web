import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Modal, Button, Input, TextArea } from '@/components/common';
import { Plus, Check, Film, Clapperboard, X } from 'lucide-react';

interface SeasonData {
  number: number;
  year: number;
}

interface EpisodeData {
  episodeNumber: number;
  title: string;
  description: string;
  releaseDate: string;
  rating: number;
}

type AddMode = 'select' | 'season' | 'episodes';

interface Season {
  '@key': string;
  number: number;
  year: number;
}

interface AddSeasonEpisodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  tvShowTitle: string;
  existingSeasons: number[];
  seasons?: Season[];
  onAddSeason?: (data: SeasonData) => void;
  onAddEpisodes?: (seasonKey: string, episodes: EpisodeData[]) => void;
  onComplete: (data: {
    season: SeasonData;
    episodes: EpisodeData[];
  }) => void;
  isLoading?: boolean;
}

export function AddSeasonEpisodeModal({ 
  isOpen, 
  onClose, 
  tvShowTitle,
  existingSeasons,
  seasons = [],
  onAddSeason,
  onAddEpisodes,
  onComplete, 
  isLoading 
}: AddSeasonEpisodeModalProps) {
  const [mode, setMode] = useState<AddMode>('select');
  const [seasonData, setSeasonData] = useState<SeasonData>({
    number: 1,
    year: new Date().getFullYear(),
  });
  const [selectedSeasonKey, setSelectedSeasonKey] = useState<string>('');
  const [episodes, setEpisodes] = useState<EpisodeData[]>([]);

  // Reset quando o modal abre
  useEffect(() => {
    if (isOpen) {
      const nextNumber = existingSeasons.length > 0 ? Math.max(...existingSeasons) + 1 : 1;
      setMode('select');
      setSeasonData({ number: nextNumber, year: new Date().getFullYear() });
      // Seleciona a primeira temporada se disponível
      if (seasons && seasons.length > 0) {
        setSelectedSeasonKey(seasons[0]['@key']);
      } else {
        setSelectedSeasonKey('');
      }
      setEpisodes([]);
    }
  }, [isOpen, existingSeasons, seasons]);

  const handleClose = () => {
    setMode('select');
    onClose();
  };

  const handleSelectMode = (selectedMode: AddMode) => {
    setMode(selectedMode);
    if (selectedMode === 'episodes' && episodes.length === 0) {
      addEpisode();
    }
  };

  const handleAddSeason = () => {
    if (onAddSeason && isSeasonValid) {
      onAddSeason(seasonData);
    } else if (isSeasonValid) {
      // Fallback: adiciona temporada com array vazio de episódios
      onComplete({ season: seasonData, episodes: [] });
    }
  };

  const handleAddEpisodes = () => {
    if (onAddEpisodes && selectedSeasonKey && isEpisodesValid) {
      onAddEpisodes(selectedSeasonKey, episodes);
    }
  };

  // Episode management
  const addEpisode = () => {
    const nextNumber = episodes.length > 0 
      ? Math.max(...episodes.map(e => e.episodeNumber)) + 1 
      : 1;
    
    setEpisodes(prev => [...prev, {
      episodeNumber: nextNumber,
      title: '',
      description: '',
      releaseDate: new Date().toISOString().split('T')[0],
      rating: 0,
    }]);
  };

  const removeEpisode = (index: number) => {
    setEpisodes(prev => prev.filter((_, i) => i !== index));
  };

  const updateEpisode = (index: number, field: keyof EpisodeData, value: string | number) => {
    setEpisodes(prev => {
      const newEpisodes = [...prev];
      newEpisodes[index] = { ...newEpisodes[index], [field]: value };
      return newEpisodes;
    });
  };

  // Validações
  const seasonExists = existingSeasons.includes(seasonData.number);
  const isSeasonValid = seasonData.number > 0 && seasonData.year >= 1900 && !seasonExists;
  const isEpisodesValid = episodes.length > 0 && episodes.every(e => e.title.trim() !== '') && selectedSeasonKey;
  
  const selectedSeason = seasons.find(s => s['@key'] === selectedSeasonKey);

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title=""
      size="lg"
    >
      <div className="space-y-5">
        {/* Header */}
        <div className="text-center pb-4 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-1">
            Adicionar Conteúdo
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">{tvShowTitle}</p>
        </div>

        <AnimatePresence mode="wait">
          {/* Tela de seleção */}
          {mode === 'select' && (
            <motion.div
              key="select"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="grid grid-cols-2 gap-4"
            >
              {/* Card: Nova Temporada */}
              <button
                onClick={() => handleSelectMode('season')}
                className="group p-6 rounded-2xl border-2 border-slate-200 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-500 bg-slate-50 dark:bg-slate-800/50 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition-all text-left"
              >
                <div className="w-14 h-14 rounded-xl bg-indigo-100 dark:bg-indigo-500/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Film className="w-7 h-7 text-indigo-500" />
                </div>
                <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-1">
                  Nova Temporada
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Criar uma nova temporada para esta série
                </p>
                {existingSeasons.length > 0 && (
                  <p className="text-xs text-indigo-500 mt-3">
                    Próxima: Temporada {Math.max(...existingSeasons) + 1}
                  </p>
                )}
              </button>

              {/* Card: Novos Episódios */}
              <button
                onClick={() => handleSelectMode('episodes')}
                disabled={seasons.length === 0}
                className="group p-6 rounded-2xl border-2 border-slate-200 dark:border-slate-700 hover:border-emerald-400 dark:hover:border-emerald-500 bg-slate-50 dark:bg-slate-800/50 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition-all text-left disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-slate-200 dark:disabled:hover:border-slate-700 disabled:hover:bg-slate-50 dark:disabled:hover:bg-slate-800/50"
              >
                <div className="w-14 h-14 rounded-xl bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center mb-4 group-hover:scale-110 group-disabled:group-hover:scale-100 transition-transform">
                  <Clapperboard className="w-7 h-7 text-emerald-500" />
                </div>
                <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-1">
                  Novos Episódios
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {seasons.length === 0 
                    ? 'Crie uma temporada primeiro' 
                    : 'Adicionar episódios a uma temporada existente'
                  }
                </p>
                {seasons.length > 0 && (
                  <p className="text-xs text-emerald-500 mt-3">
                    {seasons.length} temporada{seasons.length !== 1 ? 's' : ''} disponíve{seasons.length !== 1 ? 'is' : 'l'}
                  </p>
                )}
              </button>
            </motion.div>
          )}

          {/* Formulário de Nova Temporada */}
          {mode === 'season' && (
            <motion.div
              key="season"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-5"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-lg bg-indigo-100 dark:bg-indigo-500/20 flex items-center justify-center">
                  <Film className="w-5 h-5 text-indigo-500" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-800 dark:text-white">Nova Temporada</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Defina o número e ano da temporada</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Número da Temporada */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Número da Temporada
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={seasonData.number}
                      onChange={(e) => setSeasonData({ ...seasonData, number: parseInt(e.target.value) || 1 })}
                      min={1}
                      className={`w-full px-4 py-3 rounded-xl text-lg font-semibold text-center transition-all ${
                        seasonExists
                          ? 'border-2 border-red-400 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400'
                          : 'border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500'
                      }`}
                    />
                  </div>
                  {seasonExists ? (
                    <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1">
                      <X className="w-3 h-3" /> Temporada {seasonData.number} já existe
                    </p>
                  ) : existingSeasons.length > 0 ? (
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5">
                      Sugestão: Temporada {Math.max(...existingSeasons) + 1}
                    </p>
                  ) : null}
                </div>

                {/* Ano de Lançamento */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Ano de Lançamento
                  </label>
                  <input
                    type="number"
                    value={seasonData.year}
                    onChange={(e) => setSeasonData({ ...seasonData, year: parseInt(e.target.value) || new Date().getFullYear() })}
                    min={1900}
                    max={2100}
                    className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-lg font-semibold text-center text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                  />
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5">
                    Ano atual: {new Date().getFullYear()}
                  </p>
                </div>
              </div>

              {/* Info de temporadas existentes */}
              {existingSeasons.length > 0 && (
                <div className="bg-slate-100 dark:bg-slate-800 rounded-xl p-3">
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    <span className="font-medium">Temporadas existentes:</span>{' '}
                    {existingSeasons.sort((a, b) => a - b).map((num, i) => (
                      <span key={num} className="inline-flex items-center">
                        {i > 0 && ', '}
                        <span className={`${num === seasonData.number ? 'text-red-500 font-bold' : ''}`}>
                          {num}
                        </span>
                      </span>
                    ))}
                  </p>
                </div>
              )}

              {/* Botões */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-700">
                <Button variant="ghost" onClick={() => setMode('select')}>
                  Voltar
                </Button>
                <Button
                  onClick={handleAddSeason}
                  disabled={!isSeasonValid || isLoading}
                  isLoading={isLoading}
                  leftIcon={<Check className="w-4 h-4" />}
                  className="bg-indigo-600 hover:bg-indigo-500"
                >
                  Criar Temporada {seasonData.number}
                </Button>
              </div>
            </motion.div>
          )}

          {/* Formulário de Episódios */}
          {mode === 'episodes' && (
            <motion.div
              key="episodes"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              {/* Seletor de temporada */}
              <div className="bg-emerald-50 dark:bg-emerald-500/10 rounded-xl p-4 border border-emerald-100 dark:border-emerald-500/20">
                <label className="block text-sm font-medium text-emerald-700 dark:text-emerald-300 mb-2">
                  Selecione a Temporada
                </label>
                <div className="flex flex-wrap gap-2">
                  {seasons.map(season => (
                    <button
                      key={season['@key']}
                      onClick={() => setSelectedSeasonKey(season['@key'])}
                      className={`px-4 py-2 rounded-lg font-medium transition-all ${
                        selectedSeasonKey === season['@key']
                          ? 'bg-emerald-500 text-white'
                          : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-emerald-100 dark:hover:bg-emerald-500/20'
                      }`}
                    >
                      T{season.number} ({season.year})
                    </button>
                  ))}
                </div>
              </div>

              {/* Info da temporada selecionada */}
              {selectedSeason && (
                <div className="flex items-center justify-between bg-slate-100 dark:bg-slate-800/50 rounded-lg px-4 py-2">
                  <span className="text-sm text-slate-600 dark:text-slate-400">
                    Temporada <strong className="text-emerald-500">{selectedSeason.number}</strong> ({selectedSeason.year})
                  </span>
                  <span className="text-sm text-slate-500 dark:text-slate-400">
                    {episodes.length} episódio{episodes.length !== 1 ? 's' : ''} novo{episodes.length !== 1 ? 's' : ''}
                  </span>
                </div>
              )}

              {/* Lista de episódios */}
              <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                {episodes.map((episode, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden"
                  >
                    <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-700/50 px-4 py-2 border-b border-slate-200 dark:border-slate-700">
                      <div className="flex items-center gap-3">
                        <span className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center text-sm font-bold">
                          {episode.episodeNumber}
                        </span>
                        <span className="font-medium text-slate-700 dark:text-slate-200">
                          {episode.title || 'Sem título'}
                        </span>
                      </div>
                      <button
                        onClick={() => removeEpisode(index)}
                        className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-all"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="p-4 space-y-3">
                      <div className="grid grid-cols-3 gap-3">
                        <div className="col-span-2">
                          <Input
                            label="Título"
                            value={episode.title}
                            onChange={(e) => updateEpisode(index, 'title', e.target.value)}
                            placeholder="Título do episódio"
                            error={!episode.title.trim() ? 'Obrigatório' : undefined}
                          />
                        </div>
                        <Input
                          label="Nº"
                          type="number"
                          value={episode.episodeNumber}
                          onChange={(e) => updateEpisode(index, 'episodeNumber', parseInt(e.target.value) || 1)}
                          min={1}
                        />
                      </div>
                      
                      <TextArea
                        label="Descrição"
                        value={episode.description}
                        onChange={(e) => updateEpisode(index, 'description', e.target.value)}
                        rows={2}
                      />

                      <div className="grid grid-cols-2 gap-3">
                        <Input
                          label="Data"
                          type="date"
                          value={episode.releaseDate}
                          onChange={(e) => updateEpisode(index, 'releaseDate', e.target.value)}
                        />
                        <Input
                          label="Rating"
                          type="number"
                          value={episode.rating || ''}
                          onChange={(e) => updateEpisode(index, 'rating', parseFloat(e.target.value) || 0)}
                          min={0}
                          max={10}
                          step={0.1}
                        />
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Botão adicionar */}
              <button
                onClick={addEpisode}
                className="w-full py-3 border-2 border-dashed border-emerald-300 dark:border-emerald-600 rounded-xl text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition-all flex items-center justify-center gap-2 font-medium"
              >
                <Plus className="w-5 h-5" />
                Adicionar Episódio
              </button>

              {/* Botões */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-700">
                <Button variant="ghost" onClick={() => setMode('select')}>
                  Voltar
                </Button>
                <Button
                  onClick={handleAddEpisodes}
                  disabled={!isEpisodesValid || isLoading}
                  isLoading={isLoading}
                  leftIcon={<Check className="w-4 h-4" />}
                  className="bg-emerald-600 hover:bg-emerald-500"
                >
                  Adicionar {episodes.length} Episódio{episodes.length !== 1 ? 's' : ''}
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Modal>
  );
}
