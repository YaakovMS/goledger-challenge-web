// Base asset type
export interface BaseAsset {
  '@assetType': string;
  '@key': string;
  '@lastTouchBy'?: string;
  '@lastTx'?: string;
  '@lastUpdated'?: string;
}

// TV Show
export interface TvShow extends BaseAsset {
  '@assetType': 'tvShows';
  title: string;
  description: string;
  recommendedAge: number;
}

// Season
export interface Season extends BaseAsset {
  '@assetType': 'seasons';
  number: number;
  tvShow: {
    '@assetType': 'tvShows';
    '@key': string;
    title?: string;
  };
  year: number;
}

// Episode
export interface Episode extends BaseAsset {
  '@assetType': 'episodes';
  episodeNumber: number;
  title: string;
  season: {
    '@assetType': 'seasons';
    '@key': string;
    number?: number;
  };
  releaseDate: string;
  description: string;
  rating?: number;
}

// Watchlist
export interface Watchlist extends BaseAsset {
  '@assetType': 'watchlist';
  title: string;
  description?: string;
  tvShows?: Array<{
    '@assetType': 'tvShows';
    '@key': string;
    title?: string;
  }>;
}

// API Response types
export interface SearchResponse<T> {
  result: T[];
  metadata?: PaginationMetadata;
}

// Pagination types
export interface PaginationMetadata {
  bookmark: string;
  fetchedRecordsCount: number;
  responseTime: string;
}

export interface PaginatedResult<T> {
  items: T[];
  bookmark: string | null;
  hasMore: boolean;
  totalFetched: number;
}

export interface PaginationParams {
  limit?: number;
  bookmark?: string | null;
}

export interface SchemaResponse {
  assetTypes?: AssetTypeSchema[];
  [key: string]: unknown;
}

export interface AssetTypeSchema {
  tag: string;
  label: string;
  description: string;
  props: PropertySchema[];
}

export interface PropertySchema {
  tag: string;
  label: string;
  description: string;
  isKey: boolean;
  required: boolean;
  readOnly: boolean;
  dataType: string;
  writers?: string[];
}

// Form types
export interface TvShowFormData {
  title: string;
  description: string;
  recommendedAge: number;
}

export interface SeasonFormData {
  number: number;
  tvShowKey: string;
  year: number;
}

export interface EpisodeFormData {
  episodeNumber: number;
  title: string;
  seasonKey: string;
  releaseDate: string;
  description: string;
  rating?: number;
}

export interface WatchlistFormData {
  title: string;
  description?: string;
  tvShowKeys?: string[];
}

// API Query types
export interface SearchQuery {
  selector: {
    '@assetType': string;
    [key: string]: unknown;
  };
  limit?: number;
  bookmark?: string;
}
