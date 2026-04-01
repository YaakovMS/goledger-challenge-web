import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { 
  Tv, Film, Clapperboard, Plus, Pencil, Trash2, 
  RefreshCw, Search, Settings, ExternalLink
} from 'lucide-react';
import { tvShowsService, seasonsService, episodesService } from '@/services';
import { 
  Button, Input, TextArea, Select, Modal,
  LoadingSpinner, ConfirmDialog, EmptyState 
} from '@/components/common';
import type { TvShow, Season, Episode, TvShowFormData, SeasonFormData, EpisodeFormData } from '@/types';

type TabType = 'tvshows' | 'seasons' | 'episodes';

interface TabConfig {
  id: TabType;
  label: string;
  icon: typeof Tv;
}

const TABS: TabConfig[] = [
  { id: 'tvshows', label: 'TV Shows', icon: Tv },
  { id: 'seasons', label: 'Temporadas', icon: Film },
  { id: 'episodes', label: 'Episódios', icon: Clapperboard },
];

export function Admin() {
  const [activeTab, setActiveTab] = useState<TabType>('tvshows');
  const [searchTerm, setSearchTerm] = useState('');
  const queryClient = useQueryClient();

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Settings className="w-8 h-8 text-indigo-500" />
              <div>
                <h1 className="text-2xl font-bold text-slate-800 dark:text-white">
                  Painel Admin
                </h1>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Gerenciamento de conteúdo
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
                <input
                  type="text"
                  placeholder="Buscar..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 bg-slate-100 dark:bg-slate-800 border border-transparent rounded-lg text-sm text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 w-64"
                />
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => queryClient.invalidateQueries()}
                leftIcon={<RefreshCw className="w-4 h-4" />}
              >
                Atualizar
              </Button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mt-4">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                    activeTab === tab.id
                      ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/30'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'tvshows' && <TvShowsTab searchTerm={searchTerm} />}
        {activeTab === 'seasons' && <SeasonsTab searchTerm={searchTerm} />}
        {activeTab === 'episodes' && <EpisodesTab searchTerm={searchTerm} />}
      </div>
    </div>
  );
}

// ==================== TV SHOWS TAB ====================
function TvShowsTab({ searchTerm }: { searchTerm: string }) {
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<TvShow | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: tvShows = [], isLoading } = useQuery({
    queryKey: ['admin-tvshows'],
    queryFn: () => tvShowsService.getAll(),
  });

  const createMutation = useMutation({
    mutationFn: tvShowsService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-tvshows'] });
      queryClient.invalidateQueries({ queryKey: ['tvShows'] });
      setIsModalOpen(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ key, data }: { key: string; data: Partial<TvShowFormData> }) =>
      tvShowsService.update(key, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-tvshows'] });
      queryClient.invalidateQueries({ queryKey: ['tvShows'] });
      setEditingItem(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: tvShowsService.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-tvshows'] });
      queryClient.invalidateQueries({ queryKey: ['tvShows'] });
      setDeleteConfirm(null);
    },
  });

  const filteredItems = tvShows.filter(item =>
    item.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-slate-500 dark:text-slate-400">{filteredItems.length} TV Shows</p>
        <Button leftIcon={<Plus className="w-4 h-4" />} onClick={() => setIsModalOpen(true)}>
          Adicionar TV Show
        </Button>
      </div>

      {filteredItems.length === 0 ? (
        <EmptyState
          title="Nenhum TV Show"
          description="Clique em 'Adicionar TV Show' para começar"
          icon={Tv}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredItems.map((item) => (
            <motion.div
              key={item['@key']}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700 shadow-sm"
            >
              <h3 className="font-semibold text-slate-800 dark:text-white truncate">{item.title}</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2 mt-1">{item.description}</p>
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100 dark:border-slate-700">
                <span className="text-xs bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 px-2 py-1 rounded">
                  +{item.recommendedAge} anos
                </span>
                <div className="flex gap-1">
                  <button
                    onClick={() => navigate(`/tv-shows/${item['@key']}`)}
                    className="p-2 text-slate-400 dark:text-slate-500 hover:text-green-500 hover:bg-green-50 dark:hover:bg-green-500/10 rounded-lg transition-colors"
                    title="Ver página"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setEditingItem(item)}
                    className="p-2 text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-lg transition-colors"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setDeleteConfirm(item['@key'])}
                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      <TvShowFormModal
        isOpen={isModalOpen || !!editingItem}
        onClose={() => { setIsModalOpen(false); setEditingItem(null); }}
        onSubmit={(data) => {
          if (editingItem) {
            updateMutation.mutate({ key: editingItem['@key'], data });
          } else {
            createMutation.mutate(data);
          }
        }}
        initialData={editingItem}
        isLoading={createMutation.isPending || updateMutation.isPending}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={() => deleteConfirm && deleteMutation.mutate(deleteConfirm)}
        title="Excluir TV Show"
        message="Tem certeza que deseja excluir este TV Show? Esta ação não pode ser desfeita."
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}

function TvShowFormModal({ 
  isOpen, onClose, onSubmit, initialData, isLoading 
}: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: TvShowFormData) => void;
  initialData?: TvShow | null;
  isLoading: boolean;
}) {
  const [formData, setFormData] = useState<TvShowFormData>({
    title: initialData?.title || '',
    description: initialData?.description || '',
    recommendedAge: initialData?.recommendedAge || 12,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  // Reset form when modal opens/closes or initialData changes
  useState(() => {
    setFormData({
      title: initialData?.title || '',
      description: initialData?.description || '',
      recommendedAge: initialData?.recommendedAge || 12,
    });
  });

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? 'Editar TV Show' : 'Novo TV Show'}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Título"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          required
        />
        <TextArea
          label="Descrição"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          required
        />
        <Input
          label="Idade Recomendada"
          type="number"
          value={formData.recommendedAge}
          onChange={(e) => setFormData({ ...formData, recommendedAge: parseInt(e.target.value) || 0 })}
          min={0}
          max={21}
          required
        />
        <div className="flex justify-end gap-3 pt-4">
          <Button variant="secondary" onClick={onClose} type="button">
            Cancelar
          </Button>
          <Button type="submit" isLoading={isLoading}>
            {initialData ? 'Salvar' : 'Criar'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// ==================== SEASONS TAB ====================
function SeasonsTab({ searchTerm }: { searchTerm: string }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Season | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [tvShowFilter, setTvShowFilter] = useState<string>('');
  const queryClient = useQueryClient();

  const { data: tvShows = [] } = useQuery({
    queryKey: ['admin-tvshows'],
    queryFn: () => tvShowsService.getAll(),
  });

  const { data: seasons = [], isLoading } = useQuery({
    queryKey: ['admin-seasons'],
    queryFn: () => seasonsService.getAll(),
  });

  const createMutation = useMutation({
    mutationFn: seasonsService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-seasons'] });
      queryClient.invalidateQueries({ queryKey: ['seasons'] });
      setIsModalOpen(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ key, data }: { key: string; data: Partial<SeasonFormData> }) =>
      seasonsService.update(key, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-seasons'] });
      queryClient.invalidateQueries({ queryKey: ['seasons'] });
      setEditingItem(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: seasonsService.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-seasons'] });
      queryClient.invalidateQueries({ queryKey: ['seasons'] });
      setDeleteConfirm(null);
    },
  });

  const filteredItems = seasons.filter(item => {
    const showTitle = tvShows.find(s => s['@key'] === item.tvShow['@key'])?.title || '';
    const matchesSearch = showTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
      `Temporada ${item.number}`.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = !tvShowFilter || item.tvShow['@key'] === tvShowFilter;
    return matchesSearch && matchesFilter;
  });

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-between items-center gap-4">
        <div className="flex items-center gap-4">
          <p className="text-sm text-slate-500 dark:text-slate-400">{filteredItems.length} Temporadas</p>
          <Select
            value={tvShowFilter}
            onChange={(e) => setTvShowFilter(e.target.value)}
            options={[
              { value: '', label: 'Todos os TV Shows' },
              ...tvShows.map(s => ({ value: s['@key'], label: s.title })),
            ]}
          />
        </div>
        <Button leftIcon={<Plus className="w-4 h-4" />} onClick={() => setIsModalOpen(true)}>
          Adicionar Temporada
        </Button>
      </div>

      {filteredItems.length === 0 ? (
        <EmptyState
          title="Nenhuma Temporada"
          description="Filtre por TV Show ou adicione uma nova temporada"
          icon={Film}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredItems.map((item) => {
            const showTitle = tvShows.find(s => s['@key'] === item.tvShow['@key'])?.title || 'TV Show';
            return (
              <motion.div
                key={item['@key']}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700 shadow-sm"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-indigo-500 font-medium">{showTitle}</p>
                    <h3 className="font-semibold text-slate-800 dark:text-white">
                      Temporada {item.number}
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{item.year}</p>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => setEditingItem(item)}
                      className="p-2 text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-lg transition-colors"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(item['@key'])}
                      className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Create/Edit Modal */}
      <SeasonFormModal
        isOpen={isModalOpen || !!editingItem}
        onClose={() => { setIsModalOpen(false); setEditingItem(null); }}
        onSubmit={(data) => {
          if (editingItem) {
            updateMutation.mutate({ key: editingItem['@key'], data });
          } else {
            createMutation.mutate(data);
          }
        }}
        tvShows={tvShows}
        initialData={editingItem}
        isLoading={createMutation.isPending || updateMutation.isPending}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={() => deleteConfirm && deleteMutation.mutate(deleteConfirm)}
        title="Excluir Temporada"
        message="Tem certeza que deseja excluir esta temporada? Esta ação não pode ser desfeita."
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}

function SeasonFormModal({
  isOpen, onClose, onSubmit, tvShows, initialData, isLoading
}: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: SeasonFormData) => void;
  tvShows: TvShow[];
  initialData?: Season | null;
  isLoading: boolean;
}) {
  const [formData, setFormData] = useState<SeasonFormData>({
    number: initialData?.number || 1,
    tvShowKey: initialData?.tvShow['@key'] || '',
    year: initialData?.year || new Date().getFullYear(),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? 'Editar Temporada' : 'Nova Temporada'}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {!initialData && (
          <Select
            label="TV Show"
            value={formData.tvShowKey}
            onChange={(e) => setFormData({ ...formData, tvShowKey: e.target.value })}
            options={tvShows.map(s => ({ value: s['@key'], label: s.title }))}
            placeholder="Selecione um TV Show"
            required
          />
        )}
        <Input
          label="Número"
          type="number"
          value={formData.number}
          onChange={(e) => setFormData({ ...formData, number: parseInt(e.target.value) || 1 })}
          min={1}
          required
        />
        <Input
          label="Ano"
          type="number"
          value={formData.year}
          onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) || 2024 })}
          min={1900}
          max={2100}
          required
        />
        <div className="flex justify-end gap-3 pt-4">
          <Button variant="secondary" onClick={onClose} type="button">
            Cancelar
          </Button>
          <Button type="submit" isLoading={isLoading} disabled={!formData.tvShowKey && !initialData}>
            {initialData ? 'Salvar' : 'Criar'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// ==================== EPISODES TAB ====================
function EpisodesTab({ searchTerm }: { searchTerm: string }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Episode | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [seasonFilter, setSeasonFilter] = useState<string>('');
  const queryClient = useQueryClient();

  const { data: tvShows = [] } = useQuery({
    queryKey: ['admin-tvshows'],
    queryFn: () => tvShowsService.getAll(),
  });

  const { data: seasons = [] } = useQuery({
    queryKey: ['admin-seasons'],
    queryFn: () => seasonsService.getAll(),
  });

  const { data: episodes = [], isLoading } = useQuery({
    queryKey: ['admin-episodes'],
    queryFn: () => episodesService.getAll(),
  });

  const createMutation = useMutation({
    mutationFn: episodesService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-episodes'] });
      queryClient.invalidateQueries({ queryKey: ['episodes'] });
      setIsModalOpen(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ key, data }: { key: string; data: Partial<EpisodeFormData> }) =>
      episodesService.update(key, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-episodes'] });
      queryClient.invalidateQueries({ queryKey: ['episodes'] });
      setEditingItem(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: episodesService.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-episodes'] });
      queryClient.invalidateQueries({ queryKey: ['episodes'] });
      setDeleteConfirm(null);
    },
  });

  const getSeasonLabel = (seasonKey: string) => {
    const season = seasons.find(s => s['@key'] === seasonKey);
    if (!season) return 'Temporada';
    const show = tvShows.find(s => s['@key'] === season.tvShow['@key']);
    return `${show?.title || 'Show'} - T${season.number}`;
  };

  const filteredItems = episodes.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = !seasonFilter || item.season['@key'] === seasonFilter;
    return matchesSearch && matchesFilter;
  });

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-between items-center gap-4">
        <div className="flex items-center gap-4">
          <p className="text-sm text-slate-500 dark:text-slate-400">{filteredItems.length} Episódios</p>
          <Select
            value={seasonFilter}
            onChange={(e) => setSeasonFilter(e.target.value)}
            options={[
              { value: '', label: 'Todas as Temporadas' },
              ...seasons.map(s => {
                const show = tvShows.find(tv => tv['@key'] === s.tvShow['@key']);
                return { value: s['@key'], label: `${show?.title || 'Show'} - T${s.number}` };
              }),
            ]}
          />
        </div>
        <Button leftIcon={<Plus className="w-4 h-4" />} onClick={() => setIsModalOpen(true)}>
          Adicionar Episódio
        </Button>
      </div>

      {filteredItems.length === 0 ? (
        <EmptyState
          title="Nenhum Episódio"
          description="Filtre por temporada ou adicione um novo episódio"
          icon={Clapperboard}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredItems.map((item) => (
            <motion.div
              key={item['@key']}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700 shadow-sm"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-indigo-500 font-medium truncate">
                    {getSeasonLabel(item.season['@key'])}
                  </p>
                  <h3 className="font-semibold text-slate-800 dark:text-white truncate">
                    E{item.episodeNumber}: {item.title}
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-1">{item.description}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs text-slate-400 dark:text-slate-500">{item.releaseDate}</span>
                    {item.rating && (
                      <span className="text-xs bg-yellow-100 dark:bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 px-1.5 py-0.5 rounded">
                        ⭐ {item.rating}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex gap-1 ml-2">
                  <button
                    onClick={() => setEditingItem(item)}
                    className="p-2 text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-lg transition-colors"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setDeleteConfirm(item['@key'])}
                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      <EpisodeFormModal
        isOpen={isModalOpen || !!editingItem}
        onClose={() => { setIsModalOpen(false); setEditingItem(null); }}
        onSubmit={(data) => {
          if (editingItem) {
            updateMutation.mutate({ key: editingItem['@key'], data });
          } else {
            createMutation.mutate(data);
          }
        }}
        tvShows={tvShows}
        seasons={seasons}
        initialData={editingItem}
        isLoading={createMutation.isPending || updateMutation.isPending}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={() => deleteConfirm && deleteMutation.mutate(deleteConfirm)}
        title="Excluir Episódio"
        message="Tem certeza que deseja excluir este episódio? Esta ação não pode ser desfeita."
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}

function EpisodeFormModal({
  isOpen, onClose, onSubmit, tvShows, seasons, initialData, isLoading
}: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: EpisodeFormData) => void;
  tvShows: TvShow[];
  seasons: Season[];
  initialData?: Episode | null;
  isLoading: boolean;
}) {
  const [selectedTvShow, setSelectedTvShow] = useState<string>('');
  const [formData, setFormData] = useState<EpisodeFormData>({
    episodeNumber: initialData?.episodeNumber || 1,
    title: initialData?.title || '',
    seasonKey: initialData?.season['@key'] || '',
    releaseDate: initialData?.releaseDate || new Date().toISOString().split('T')[0],
    description: initialData?.description || '',
    rating: initialData?.rating || 0,
  });

  // Filter seasons by selected TV show
  const filteredSeasons = seasons.filter(s => 
    !selectedTvShow || s.tvShow['@key'] === selectedTvShow
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? 'Editar Episódio' : 'Novo Episódio'}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {!initialData && (
          <>
            <Select
              label="TV Show"
              value={selectedTvShow}
              onChange={(e) => {
                setSelectedTvShow(e.target.value);
                setFormData({ ...formData, seasonKey: '' });
              }}
              options={[
                { value: '', label: 'Selecione' },
                ...tvShows.map(s => ({ value: s['@key'], label: s.title })),
              ]}
            />
            <Select
              label="Temporada"
              value={formData.seasonKey}
              onChange={(e) => setFormData({ ...formData, seasonKey: e.target.value })}
              options={[
                { value: '', label: 'Selecione uma temporada' },
                ...filteredSeasons.map(s => ({ value: s['@key'], label: `Temporada ${s.number} (${s.year})` })),
              ]}
              disabled={!selectedTvShow}
              required
            />
          </>
        )}
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Número do Episódio"
            type="number"
            value={formData.episodeNumber}
            onChange={(e) => setFormData({ ...formData, episodeNumber: parseInt(e.target.value) || 1 })}
            min={1}
            required
          />
          <Input
            label="Data de Lançamento"
            type="date"
            value={formData.releaseDate}
            onChange={(e) => setFormData({ ...formData, releaseDate: e.target.value })}
            required
          />
        </div>
        <Input
          label="Título"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          required
        />
        <TextArea
          label="Descrição"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          required
        />
        <Input
          label="Rating (0-10)"
          type="number"
          value={formData.rating}
          onChange={(e) => setFormData({ ...formData, rating: parseFloat(e.target.value) || 0 })}
          min={0}
          max={10}
          step={0.1}
        />
        <div className="flex justify-end gap-3 pt-4">
          <Button variant="secondary" onClick={onClose} type="button">
            Cancelar
          </Button>
          <Button type="submit" isLoading={isLoading} disabled={!formData.seasonKey && !initialData}>
            {initialData ? 'Salvar' : 'Criar'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
