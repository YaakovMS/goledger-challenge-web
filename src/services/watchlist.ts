import { api } from './api';
import type { Watchlist, WatchlistFormData } from '@/types';

const ASSET_TYPE = 'watchlist';

export const watchlistService = {
  // Get all Watchlists
  getAll: async (): Promise<Watchlist[]> => {
    const response = await api.query.search<Watchlist>({ '@assetType': ASSET_TYPE }, 500);
    return response.result || [];
  },

  // Get a single Watchlist by key
  getByKey: async (key: string): Promise<Watchlist> => {
    return await api.query.readAsset<Watchlist>({
      '@assetType': ASSET_TYPE,
      '@key': key,
    });
  },

  // Create a new Watchlist
  create: async (data: WatchlistFormData): Promise<Watchlist[]> => {
    const asset = {
      '@assetType': ASSET_TYPE,
      title: data.title,
      ...(data.description && { description: data.description }),
      ...(data.tvShowKeys && data.tvShowKeys.length > 0 && {
        tvShows: data.tvShowKeys.map((key) => ({
          '@assetType': 'tvShows',
          '@key': key,
        })),
      }),
    };
    return await api.invoke.createAsset<Watchlist>(asset);
  },

  // Update a Watchlist
  update: async (key: string, data: Partial<WatchlistFormData>): Promise<Watchlist> => {
    const update: Record<string, unknown> = {
      '@assetType': ASSET_TYPE,
      '@key': key,
    };

    if (data.title) {
      update.title = data.title;
    }

    if (data.description !== undefined) {
      update.description = data.description;
    }

    if (data.tvShowKeys) {
      update.tvShows = data.tvShowKeys.map((tvKey) => ({
        '@assetType': 'tvShows',
        '@key': tvKey,
      }));
    }

    return await api.invoke.updateAsset<Watchlist>(update);
  },

  // Delete a Watchlist
  delete: async (key: string): Promise<void> => {
    await api.invoke.deleteAsset({
      '@assetType': ASSET_TYPE,
      '@key': key,
    });
  },

  // Add TV Show to Watchlist
  addTvShow: async (watchlistKey: string, tvShowKey: string, currentTvShows: string[]): Promise<Watchlist> => {
    const updatedTvShows = [...new Set([...currentTvShows, tvShowKey])];
    return await watchlistService.update(watchlistKey, { tvShowKeys: updatedTvShows });
  },

  // Remove TV Show from Watchlist
  removeTvShow: async (watchlistKey: string, tvShowKey: string, currentTvShows: string[]): Promise<Watchlist> => {
    const updatedTvShows = currentTvShows.filter((key) => key !== tvShowKey);
    return await watchlistService.update(watchlistKey, { tvShowKeys: updatedTvShows });
  },
};
