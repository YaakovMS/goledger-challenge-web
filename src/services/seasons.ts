import { api } from './api';
import type { Season, SeasonFormData, PaginatedResult, PaginationParams } from '@/types';

const ASSET_TYPE = 'seasons';
const DEFAULT_PAGE_SIZE = 12;

export const seasonsService = {
  // Get all Seasons (legacy - fetches all at once)
  getAll: async (): Promise<Season[]> => {
    const response = await api.query.search<Season>({ '@assetType': ASSET_TYPE }, 500);
    return response.result || [];
  },

  // Get Seasons with cursor-based pagination
  getPaginated: async (params: PaginationParams = {}): Promise<PaginatedResult<Season>> => {
    return api.query.searchPaginated<Season>(
      { '@assetType': ASSET_TYPE },
      { limit: DEFAULT_PAGE_SIZE, ...params }
    );
  },

  // Get a single Season by key
  getByKey: async (key: string): Promise<Season> => {
    return await api.query.readAsset<Season>({
      '@assetType': ASSET_TYPE,
      '@key': key,
    });
  },

  // Get Seasons by TV Show
  getByTvShow: async (tvShowKey: string): Promise<Season[]> => {
    const response = await api.query.search<Season>({
      '@assetType': ASSET_TYPE,
      'tvShow.@key': tvShowKey,
    }, 500);
    return response.result || [];
  },

  // Alias para facilitar uso na página de detalhes
  searchByTvShowKey: async (tvShowKey: string): Promise<Season[]> => {
    return await seasonsService.getByTvShow(tvShowKey);
  },

  // Create a new Season
  create: async (data: SeasonFormData): Promise<Season[]> => {
    const asset = {
      '@assetType': ASSET_TYPE,
      number: data.number,
      tvShow: {
        '@assetType': 'tvShows',
        '@key': data.tvShowKey,
      },
      year: data.year,
    };
    return await api.invoke.createAsset<Season>(asset);
  },

  // Update a Season
  update: async (key: string, data: Partial<Omit<SeasonFormData, 'tvShowKey'>>): Promise<Season> => {
    const update: Record<string, unknown> = {
      '@assetType': ASSET_TYPE,
      '@key': key,
    };
    if (data.number !== undefined) update.number = data.number;
    if (data.year !== undefined) update.year = data.year;
    return await api.invoke.updateAsset<Season>(update);
  },

  // Delete a Season
  delete: async (key: string): Promise<void> => {
    await api.invoke.deleteAsset({
      '@assetType': ASSET_TYPE,
      '@key': key,
    });
  },
};
