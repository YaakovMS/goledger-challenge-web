import { api } from './api';
import type { Episode, EpisodeFormData, PaginatedResult, PaginationParams } from '@/types';

const ASSET_TYPE = 'episodes';
const DEFAULT_PAGE_SIZE = 12;

export const episodesService = {
  // Get all Episodes (legacy - fetches all at once)
  getAll: async (): Promise<Episode[]> => {
    const response = await api.query.search<Episode>({ '@assetType': ASSET_TYPE }, 500);
    return response.result || [];
  },

  // Get Episodes with cursor-based pagination
  getPaginated: async (params: PaginationParams = {}): Promise<PaginatedResult<Episode>> => {
    return api.query.searchPaginated<Episode>(
      { '@assetType': ASSET_TYPE },
      { limit: DEFAULT_PAGE_SIZE, ...params }
    );
  },

  // Get a single Episode by key
  getByKey: async (key: string): Promise<Episode> => {
    return await api.query.readAsset<Episode>({
      '@assetType': ASSET_TYPE,
      '@key': key,
    });
  },

  // Get Episodes by Season
  getBySeason: async (seasonKey: string): Promise<Episode[]> => {
    const response = await api.query.search<Episode>({
      '@assetType': ASSET_TYPE,
      'season.@key': seasonKey,
    }, 500);
    return response.result || [];
  },

  // Alias para facilitar uso na página de detalhes
  searchBySeasonKey: async (seasonKey: string): Promise<Episode[]> => {
    return await episodesService.getBySeason(seasonKey);
  },

  // Create a new Episode
  create: async (data: EpisodeFormData): Promise<Episode[]> => {
    // Converte data para formato RFC3339 (ex: 2024-03-15T00:00:00Z)
    const formatDate = (dateStr: string): string => {
      if (!dateStr) return new Date().toISOString();
      // Se já está no formato ISO, retorna
      if (dateStr.includes('T')) return dateStr;
      // Converte YYYY-MM-DD para ISO
      return new Date(dateStr + 'T00:00:00Z').toISOString();
    };

    const asset = {
      '@assetType': ASSET_TYPE,
      episodeNumber: data.episodeNumber,
      title: data.title,
      season: {
        '@assetType': 'seasons',
        '@key': data.seasonKey,
      },
      releaseDate: formatDate(data.releaseDate),
      description: data.description || '',
      ...(data.rating !== undefined && data.rating > 0 && { rating: data.rating }),
    };
    return await api.invoke.createAsset<Episode>(asset);
  },

  // Update an Episode
  update: async (key: string, data: Partial<Omit<EpisodeFormData, 'seasonKey'>>): Promise<Episode> => {
    // Converte data para formato RFC3339
    const formatDate = (dateStr: string): string => {
      if (!dateStr) return new Date().toISOString();
      if (dateStr.includes('T')) return dateStr;
      return new Date(dateStr + 'T00:00:00Z').toISOString();
    };

    const update: Record<string, unknown> = {
      '@assetType': ASSET_TYPE,
      '@key': key,
    };
    if (data.episodeNumber !== undefined) update.episodeNumber = data.episodeNumber;
    if (data.title !== undefined) update.title = data.title;
    if (data.releaseDate !== undefined) update.releaseDate = formatDate(data.releaseDate);
    if (data.description !== undefined) update.description = data.description;
    if (data.rating !== undefined) update.rating = data.rating;
    return await api.invoke.updateAsset<Episode>(update);
  },

  // Delete an Episode
  delete: async (key: string): Promise<void> => {
    await api.invoke.deleteAsset({
      '@assetType': ASSET_TYPE,
      '@key': key,
    });
  },
};
