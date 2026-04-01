import { api } from './api';
import type { TvShow, TvShowFormData, PaginatedResult, PaginationParams } from '@/types';

const ASSET_TYPE = 'tvShows';
const DEFAULT_PAGE_SIZE = 12;

export const tvShowsService = {
  // Get all TV Shows (legacy - fetches all at once)
  getAll: async (): Promise<TvShow[]> => {
    const response = await api.query.search<TvShow>({ '@assetType': ASSET_TYPE }, 500);
    return response.result || [];
  },

  // Get TV Shows with cursor-based pagination
  getPaginated: async (params: PaginationParams = {}): Promise<PaginatedResult<TvShow>> => {
    return api.query.searchPaginated<TvShow>(
      { '@assetType': ASSET_TYPE },
      { limit: DEFAULT_PAGE_SIZE, ...params }
    );
  },

  // Get a single TV Show by key
  getByKey: async (key: string): Promise<TvShow> => {
    return await api.query.readAsset<TvShow>({
      '@assetType': ASSET_TYPE,
      '@key': key,
    });
  },

  // Create a new TV Show
  create: async (data: TvShowFormData): Promise<TvShow[]> => {
    const asset = {
      '@assetType': ASSET_TYPE,
      title: data.title,
      description: data.description,
      recommendedAge: data.recommendedAge,
    };
    return await api.invoke.createAsset<TvShow>(asset);
  },

  // Update a TV Show
  update: async (key: string, data: Partial<TvShowFormData>): Promise<TvShow> => {
    const update = {
      '@assetType': ASSET_TYPE,
      '@key': key,
      ...data,
    };
    return await api.invoke.updateAsset<TvShow>(update);
  },

  // Delete a TV Show
  delete: async (key: string): Promise<void> => {
    await api.invoke.deleteAsset({
      '@assetType': ASSET_TYPE,
      '@key': key,
    });
  },

  // Search TV Shows by title
  searchByTitle: async (title: string): Promise<TvShow[]> => {
    const response = await api.query.search<TvShow>({
      '@assetType': ASSET_TYPE,
      title: { '$regex': `(?i)${title}` },
    });
    return response.result || [];
  },
};
