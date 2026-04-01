import { useState, memo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../providers/DataProvider';
import {
  PageLoader,
  EmptyState,
  Button,
  Modal,
  Input,
  ConfirmDialog,
  TvShowPoster,
} from '../components/common';
import { usePosterStore } from '../stores/posterStore';
import { Tv, Plus, Edit, Trash2, X, Eye } from 'lucide-react';
import type { Watchlist, TvShow } from '../types';

// Get poster URL from store
function usePosterUrl(title: string): string | null {
  const poster = usePosterStore((state) => state.getPoster(title));
  return poster?.posterUrl || null;
}

// Watchlist Card Component
interface WatchlistCardProps {
  watchlist: Watchlist;
  tvShows: TvShow[];
  onClick: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

const WatchlistCard = memo(function WatchlistCard({
  watchlist,
  tvShows,
  onClick,
  onEdit,
  onDelete,
}: WatchlistCardProps) {
  const linkedShows = watchlist.tvShows || [];
  const showCount = linkedShows.length;

  // Get up to 4 shows for the poster collage
  const showsForCollage = linkedShows.slice(0, 4).map((ref) => {
    return tvShows.find((s) => s['@key'] === ref['@key']);
  }).filter(Boolean) as TvShow[];

  // Get poster URLs for collage
  const poster1 = usePosterUrl(showsForCollage[0]?.title || '');
  const poster2 = usePosterUrl(showsForCollage[1]?.title || '');
  const poster3 = usePosterUrl(showsForCollage[2]?.title || '');
  const poster4 = usePosterUrl(showsForCollage[3]?.title || '');
  const posters = [poster1, poster2, poster3, poster4].filter(Boolean) as string[];

  return (
    <div
      className="group relative bg-white dark:bg-gray-800 rounded-xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden cursor-pointer"
      onClick={onClick}
    >
      {/* Poster Collage */}
      <div className="aspect-2/3 bg-gray-200 dark:bg-gray-700 relative overflow-hidden">
        {showCount === 0 && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Tv className="w-16 h-16 text-gray-400" />
          </div>
        )}
        {showCount === 1 && posters[0] && (
          <img src={posters[0]} alt="" className="absolute inset-0 w-full h-full object-cover" />
        )}
        {showCount === 2 && (
          <div className="absolute inset-0 flex">
            {posters[0] && <img src={posters[0]} alt="" className="w-1/2 h-full object-cover" />}
            {posters[1] && <img src={posters[1]} alt="" className="w-1/2 h-full object-cover" />}
          </div>
        )}
        {showCount === 3 && (
          <div className="absolute inset-0 grid grid-cols-2 grid-rows-2">
            {posters[0] && <img src={posters[0]} alt="" className="col-span-1 row-span-2 w-full h-full object-cover" />}
            {posters[1] && <img src={posters[1]} alt="" className="w-full h-full object-cover" />}
            {posters[2] && <img src={posters[2]} alt="" className="w-full h-full object-cover" />}
          </div>
        )}
        {showCount >= 4 && (
          <div className="absolute inset-0 grid grid-cols-2 grid-rows-2">
            {posters.slice(0, 4).map((p, i) => (
              <img key={i} src={p} alt="" className="w-full h-full object-cover" />
            ))}
          </div>
        )}
        
        {/* Shows Count Badge */}
        <div className="absolute top-2 right-2 bg-black/70 text-white px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1">
          <Eye className="w-3 h-3" />
          {showCount}
        </div>

        {/* Hover Actions */}
        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
          <button
            onClick={(e) => { e.stopPropagation(); onEdit(); }}
            className="p-2 bg-white/20 hover:bg-white/30 rounded-full transition-colors"
          >
            <Edit className="w-5 h-5 text-white" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="p-2 bg-red-500/80 hover:bg-red-500 rounded-full transition-colors"
          >
            <Trash2 className="w-5 h-5 text-white" />
          </button>
        </div>
      </div>

      {/* Card Footer */}
      <div className="p-4">
        <h3 className="font-semibold text-gray-900 dark:text-white truncate text-lg">
          {watchlist.title}
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          {showCount} {showCount === 1 ? 'série' : 'séries'}
        </p>
      </div>
    </div>
  );
});

// Watchlist Shows Modal Component
interface WatchlistShowsModalProps {
  isOpen: boolean;
  onClose: () => void;
  watchlist: Watchlist | null;
  tvShows: TvShow[];
  onRemoveShow: (showKey: string) => void;
  isRemoving: boolean;
}

function WatchlistShowsModal({
  isOpen,
  onClose,
  watchlist,
  tvShows,
  onRemoveShow,
  isRemoving,
}: WatchlistShowsModalProps) {
  const navigate = useNavigate();

  if (!watchlist) return null;

  const linkedShows = (watchlist.tvShows || [])
    .map((ref) => tvShows.find((s) => s['@key'] === ref['@key']))
    .filter(Boolean) as TvShow[];

  const handleShowClick = (showKey: string) => {
    onClose();
    navigate(`/tv-shows/${showKey}`);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={watchlist.title}>
      <div className="min-h-75">
        {linkedShows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-500 dark:text-gray-400">
            <Tv className="w-16 h-16 mb-4 opacity-50" />
            <p className="text-lg font-medium">Nenhuma série nesta lista</p>
            <p className="text-sm mt-1">Adicione séries da página de TV Shows</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 max-h-[60vh] overflow-y-auto p-1">
            {linkedShows.map((show) => (
              <div
                key={show['@key']}
                className="group relative cursor-pointer"
                onClick={() => handleShowClick(show['@key'])}
              >
                <div className="aspect-2/3 rounded-lg overflow-hidden shadow-md hover:shadow-xl transition-shadow">
                  <TvShowPoster
                    title={show.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveShow(show['@key']);
                  }}
                  disabled={isRemoving}
                  className="absolute top-2 right-2 p-1.5 bg-red-500 hover:bg-red-600 disabled:bg-red-300 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-4 h-4 text-white" />
                </button>
                <p className="mt-2 text-sm font-medium text-gray-900 dark:text-white truncate">
                  {show.title}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}

// Main Watchlist Page
export function WatchlistPage() {
  const {
    watchlists,
    tvShows,
    isWatchlistsLoading,
    isTvShowsLoading,
    createWatchlist,
    updateWatchlist,
    deleteWatchlist,
    removeFromWatchlist,
    isRemovingFromWatchlist,
  } = useData();

  // Modal states
  const [selectedWatchlist, setSelectedWatchlist] = useState<Watchlist | null>(null);
  const [isShowsModalOpen, setIsShowsModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  // Form state
  const [watchlistTitle, setWatchlistTitle] = useState('');

  // Handlers
  const handleCardClick = useCallback((watchlist: Watchlist) => {
    setSelectedWatchlist(watchlist);
    setIsShowsModalOpen(true);
  }, []);

  const handleEditClick = useCallback((watchlist: Watchlist) => {
    setSelectedWatchlist(watchlist);
    setWatchlistTitle(watchlist.title);
    setIsEditModalOpen(true);
  }, []);

  const handleDeleteClick = useCallback((watchlist: Watchlist) => {
    setSelectedWatchlist(watchlist);
    setIsDeleteDialogOpen(true);
  }, []);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!watchlistTitle.trim()) return;
    await createWatchlist({ title: watchlistTitle.trim() });
    setWatchlistTitle('');
    setIsCreateModalOpen(false);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWatchlist || !watchlistTitle.trim()) return;
    await updateWatchlist(selectedWatchlist['@key'], { title: watchlistTitle.trim() });
    setWatchlistTitle('');
    setIsEditModalOpen(false);
    setSelectedWatchlist(null);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedWatchlist) return;
    await deleteWatchlist(selectedWatchlist['@key']);
    setIsDeleteDialogOpen(false);
    setSelectedWatchlist(null);
  };

  const handleRemoveShow = (showKey: string) => {
    if (!selectedWatchlist) return;
    removeFromWatchlist(selectedWatchlist['@key'], showKey);
    // Update local state for modal
    setSelectedWatchlist((prev) =>
      prev
        ? { ...prev, tvShows: prev.tvShows?.filter((s) => s['@key'] !== showKey) || [] }
        : null
    );
  };

  const isLoading = isWatchlistsLoading || isTvShowsLoading;

  if (isLoading && watchlists.length === 0) {
    return <PageLoader />;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Minhas Listas</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            {watchlists.length} {watchlists.length === 1 ? 'lista' : 'listas'}
          </p>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)}>
          <Plus className="w-5 h-5 mr-2" />
          Nova Lista
        </Button>
      </div>

      {/* Watchlist Grid */}
      {watchlists.length === 0 ? (
        <EmptyState
          icon={Tv}
          title="Nenhuma lista criada"
          description="Crie sua primeira lista para organizar suas séries favoritas"
          action={
            <Button onClick={() => setIsCreateModalOpen(true)}>
              <Plus className="w-5 h-5 mr-2" />
              Criar Lista
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
          {watchlists.map((watchlist) => (
            <WatchlistCard
              key={watchlist['@key']}
              watchlist={watchlist}
              tvShows={tvShows}
              onClick={() => handleCardClick(watchlist)}
              onEdit={() => handleEditClick(watchlist)}
              onDelete={() => handleDeleteClick(watchlist)}
            />
          ))}
        </div>
      )}

      {/* Shows Modal */}
      <WatchlistShowsModal
        isOpen={isShowsModalOpen}
        onClose={() => setIsShowsModalOpen(false)}
        watchlist={selectedWatchlist}
        tvShows={tvShows}
        onRemoveShow={handleRemoveShow}
        isRemoving={isRemovingFromWatchlist}
      />

      {/* Create Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Nova Lista"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          <Input
            label="Nome da lista"
            value={watchlistTitle}
            onChange={(e) => setWatchlistTitle(e.target.value)}
            placeholder="Ex: Minhas Favoritas"
            autoFocus
          />
          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsCreateModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={!watchlistTitle.trim()}>
              Criar
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Editar Lista"
      >
        <form onSubmit={handleEditSubmit} className="space-y-4">
          <Input
            label="Nome da lista"
            value={watchlistTitle}
            onChange={(e) => setWatchlistTitle(e.target.value)}
            placeholder="Ex: Minhas Favoritas"
            autoFocus
          />
          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsEditModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={!watchlistTitle.trim()}>
              Salvar
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Dialog */}
      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={handleDeleteConfirm}
        title="Excluir Lista"
        message={`Tem certeza que deseja excluir a lista "${selectedWatchlist?.title}"? Esta ação não pode ser desfeita.`}
        confirmText="Excluir"
        variant="danger"
      />
    </div>
  );
}
