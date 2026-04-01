import { useState } from 'react';
import { Modal, Button, Input, TextArea, Select } from '@/components/common';
import { Plus, Trash2, ChevronRight, ChevronLeft, Check, Tv, Film, Clapperboard } from 'lucide-react';

interface TvShowData {
  title: string;
  description: string;
  recommendedAge: number;
}

interface SeasonData {
  number: number;
  year: number;
  episodes: EpisodeData[];
}

interface EpisodeData {
  episodeNumber: number;
  title: string;
  description: string;
  releaseDate: string;
  rating: number;
}

interface MultiStepModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (data: {
    tvShow: TvShowData;
    seasons: SeasonData[];
  }) => void;
  isLoading?: boolean;
}

const STEPS = [
  { id: 1, title: 'TV Show', icon: Tv },
  { id: 2, title: 'Temporadas', icon: Film },
  { id: 3, title: 'Episódios', icon: Clapperboard },
];

export function MultiStepModal({ isOpen, onClose, onComplete, isLoading }: MultiStepModalProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [tvShowData, setTvShowData] = useState<TvShowData>({
    title: '',
    description: '',
    recommendedAge: 12,
  });
  const [seasons, setSeasons] = useState<SeasonData[]>([]);
  const [selectedSeasonIndex, setSelectedSeasonIndex] = useState<number>(0);

  const resetForm = () => {
    setCurrentStep(1);
    setTvShowData({ title: '', description: '', recommendedAge: 12 });
    setSeasons([]);
    setSelectedSeasonIndex(0);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleNext = () => {
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = () => {
    onComplete({ tvShow: tvShowData, seasons });
    resetForm();
  };

  // Season management
  const addSeason = () => {
    const nextNumber = seasons.length > 0 ? Math.max(...seasons.map(s => s.number)) + 1 : 1;
    setSeasons([...seasons, { number: nextNumber, year: new Date().getFullYear(), episodes: [] }]);
  };

  const removeSeason = (index: number) => {
    const newSeasons = seasons.filter((_, i) => i !== index);
    setSeasons(newSeasons);
    if (selectedSeasonIndex >= newSeasons.length && newSeasons.length > 0) {
      setSelectedSeasonIndex(newSeasons.length - 1);
    }
  };

  const updateSeason = (index: number, field: keyof Omit<SeasonData, 'episodes'>, value: number) => {
    const newSeasons = [...seasons];
    newSeasons[index] = { ...newSeasons[index], [field]: value };
    setSeasons(newSeasons);
  };

  // Episode management
  const addEpisode = (seasonIndex: number) => {
    const season = seasons[seasonIndex];
    const nextNumber = season.episodes.length > 0 
      ? Math.max(...season.episodes.map(e => e.episodeNumber)) + 1 
      : 1;
    
    const newSeasons = [...seasons];
    newSeasons[seasonIndex].episodes.push({
      episodeNumber: nextNumber,
      title: '',
      description: '',
      releaseDate: new Date().toISOString().split('T')[0],
      rating: 0,
    });
    setSeasons(newSeasons);
  };

  const removeEpisode = (seasonIndex: number, episodeIndex: number) => {
    const newSeasons = [...seasons];
    newSeasons[seasonIndex].episodes = newSeasons[seasonIndex].episodes.filter((_, i) => i !== episodeIndex);
    setSeasons(newSeasons);
  };

  const updateEpisode = (seasonIndex: number, episodeIndex: number, field: keyof EpisodeData, value: string | number) => {
    const newSeasons = [...seasons];
    newSeasons[seasonIndex].episodes[episodeIndex] = {
      ...newSeasons[seasonIndex].episodes[episodeIndex],
      [field]: value,
    };
    setSeasons(newSeasons);
  };

  // Validation
  const isStep1Valid = tvShowData.title.trim() !== '' && tvShowData.description.trim() !== '';
  const isStep2Valid = seasons.length > 0;
  const isStep3Valid = seasons.every(s => s.episodes.length > 0 && s.episodes.every(e => e.title.trim() !== ''));

  const canProceed = () => {
    switch (currentStep) {
      case 1: return isStep1Valid;
      case 2: return isStep2Valid;
      case 3: return isStep3Valid;
      default: return false;
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Adicionar Série Completa"
      size="lg"
    >
      <div className="space-y-6">
        {/* Progress Steps */}
        <div className="flex items-center justify-center gap-2">
          {STEPS.map((step, index) => {
            const Icon = step.icon;
            const isActive = currentStep === step.id;
            const isCompleted = currentStep > step.id;
            
            return (
              <div key={step.id} className="flex items-center">
                <div
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${
                    isActive
                      ? 'bg-indigo-500 text-white'
                      : isCompleted
                      ? 'bg-green-500/20 text-green-400'
                      : 'bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                  }`}
                >
                  {isCompleted ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <Icon className="w-4 h-4" />
                  )}
                  <span className="text-sm font-medium hidden sm:inline">{step.title}</span>
                </div>
                {index < STEPS.length - 1 && (
                  <ChevronRight className="w-4 h-4 mx-2 text-slate-400" />
                )}
              </div>
            );
          })}
        </div>

        {/* Step Content */}
        <div className="min-h-75">
          {/* Step 1: TV Show */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4">
                Informações da Série
              </h3>
              <Input
                label="Título"
                value={tvShowData.title}
                onChange={(e) => setTvShowData({ ...tvShowData, title: e.target.value })}
                placeholder="Ex: Breaking Bad"
                required
              />
              <TextArea
                label="Descrição"
                value={tvShowData.description}
                onChange={(e) => setTvShowData({ ...tvShowData, description: e.target.value })}
                placeholder="Sinopse da série..."
                required
              />
              <Input
                label="Idade Recomendada"
                type="number"
                value={tvShowData.recommendedAge}
                onChange={(e) => setTvShowData({ ...tvShowData, recommendedAge: parseInt(e.target.value) || 0 })}
                min={0}
                max={21}
                required
              />
            </div>
          )}

          {/* Step 2: Seasons */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">
                  Temporadas de "{tvShowData.title}"
                </h3>
                <Button size="sm" leftIcon={<Plus className="w-4 h-4" />} onClick={addSeason}>
                  Adicionar Temporada
                </Button>
              </div>

              {seasons.length === 0 ? (
                <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                  <Film className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>Nenhuma temporada adicionada</p>
                  <p className="text-sm mt-1">Clique em "Adicionar Temporada" para começar</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-75 overflow-y-auto pr-2">
                  {seasons.map((season, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-4 p-4 bg-slate-100 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700"
                    >
                      <div className="flex-1 grid grid-cols-2 gap-4">
                        <Input
                          label="Número"
                          type="number"
                          value={season.number}
                          onChange={(e) => updateSeason(index, 'number', parseInt(e.target.value) || 1)}
                          min={1}
                        />
                        <Input
                          label="Ano"
                          type="number"
                          value={season.year}
                          onChange={(e) => updateSeason(index, 'year', parseInt(e.target.value) || 2024)}
                          min={1900}
                          max={2100}
                        />
                      </div>
                      <button
                        onClick={() => removeSeason(index)}
                        className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/20 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Step 3: Episodes */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">
                  Episódios
                </h3>
              </div>

              {seasons.length === 0 ? (
                <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                  <p>Volte e adicione temporadas primeiro</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Season selector */}
                  <Select
                    label="Selecione a Temporada"
                    value={selectedSeasonIndex.toString()}
                    onChange={(e) => setSelectedSeasonIndex(parseInt(e.target.value))}
                    options={seasons.map((s, i) => ({
                      value: i.toString(),
                      label: `Temporada ${s.number} (${s.year})`,
                    }))}
                  />

                  {/* Episodes for selected season */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600 dark:text-slate-400">
                      {seasons[selectedSeasonIndex]?.episodes.length || 0} episódio(s)
                    </span>
                    <Button
                      size="sm"
                      leftIcon={<Plus className="w-4 h-4" />}
                      onClick={() => addEpisode(selectedSeasonIndex)}
                    >
                      Adicionar Episódio
                    </Button>
                  </div>

                  <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
                    {seasons[selectedSeasonIndex]?.episodes.map((episode, epIndex) => (
                      <div
                        key={epIndex}
                        className="p-4 bg-slate-100 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700"
                      >
                        <div className="flex items-start justify-between gap-2 mb-3">
                          <span className="text-sm font-semibold text-indigo-500">
                            Episódio {episode.episodeNumber}
                          </span>
                          <button
                            onClick={() => removeEpisode(selectedSeasonIndex, epIndex)}
                            className="p-1 text-red-400 hover:text-red-300 hover:bg-red-500/20 rounded transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <Input
                            label="Título"
                            value={episode.title}
                            onChange={(e) => updateEpisode(selectedSeasonIndex, epIndex, 'title', e.target.value)}
                            placeholder="Título do episódio"
                          />
                          <Input
                            label="Data de Lançamento"
                            type="date"
                            value={episode.releaseDate}
                            onChange={(e) => updateEpisode(selectedSeasonIndex, epIndex, 'releaseDate', e.target.value)}
                          />
                          <div className="sm:col-span-2">
                            <TextArea
                              label="Descrição"
                              value={episode.description}
                              onChange={(e) => updateEpisode(selectedSeasonIndex, epIndex, 'description', e.target.value)}
                              placeholder="Sinopse do episódio..."
                              rows={2}
                            />
                          </div>
                          <Input
                            label="Nº Episódio"
                            type="number"
                            value={episode.episodeNumber}
                            onChange={(e) => updateEpisode(selectedSeasonIndex, epIndex, 'episodeNumber', parseInt(e.target.value) || 1)}
                            min={1}
                          />
                          <Input
                            label="Rating (0-10)"
                            type="number"
                            value={episode.rating}
                            onChange={(e) => updateEpisode(selectedSeasonIndex, epIndex, 'rating', parseFloat(e.target.value) || 0)}
                            min={0}
                            max={10}
                            step={0.1}
                          />
                        </div>
                      </div>
                    ))}

                    {seasons[selectedSeasonIndex]?.episodes.length === 0 && (
                      <div className="text-center py-6 text-slate-500 dark:text-slate-400">
                        <Clapperboard className="w-10 h-10 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">Nenhum episódio adicionado</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-700">
          <Button
            variant="ghost"
            onClick={handleBack}
            disabled={currentStep === 1}
            leftIcon={<ChevronLeft className="w-4 h-4" />}
          >
            Voltar
          </Button>

          <div className="flex gap-3">
            <Button variant="secondary" onClick={handleClose}>
              Cancelar
            </Button>
            
            {currentStep < 3 ? (
              <Button
                onClick={handleNext}
                disabled={!canProceed()}
                rightIcon={<ChevronRight className="w-4 h-4" />}
              >
                Próximo
              </Button>
            ) : (
              <Button
                onClick={handleComplete}
                disabled={!canProceed() || isLoading}
                isLoading={isLoading}
                leftIcon={<Check className="w-4 h-4" />}
              >
                Finalizar
              </Button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}
