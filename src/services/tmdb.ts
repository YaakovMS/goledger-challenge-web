import axios from 'axios';

const TMDB_API_KEY = import.meta.env.VITE_TMDB_API_KEY;
const TMDB_ACCESS_TOKEN = import.meta.env.VITE_TMDB_ACCESS_TOKEN;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p';

// Image sizes available from TMDB
export const POSTER_SIZES = {
  small: 'w154',
  medium: 'w342',
  large: 'w500',
  original: 'original',
} as const;

// Backdrop sizes available from TMDB
export const BACKDROP_SIZES = {
  small: 'w300',
  medium: 'w780',
  large: 'w1280',
  original: 'original',
} as const;

export type PosterSize = keyof typeof POSTER_SIZES;
export type BackdropSize = keyof typeof BACKDROP_SIZES;

interface TMDBSearchResult {
  id: number;
  name: string;
  poster_path: string | null;
  backdrop_path: string | null;
  first_air_date: string;
  overview: string;
  vote_average: number;
}

interface TMDBSearchResponse {
  page: number;
  results: TMDBSearchResult[];
  total_pages: number;
  total_results: number;
}

export interface PosterData {
  posterUrl: string | null;
  backdropUrl: string | null;
  backdropUrlHD: string | null;
  tmdbId: number;
  fetchedAt: number;
}

export interface SeasonImageData {
  posterUrl: string | null;
  tmdbId: number;
  seasonNumber: number;
  fetchedAt: number;
}

export interface EpisodeImageData {
  stillUrl: string | null;
  tmdbId: number;
  seasonNumber: number;
  episodeNumber: number;
  name: string;
  overview: string;
  voteAverage: number;
  fetchedAt: number;
}

interface TMDBSeasonResponse {
  id: number;
  name: string;
  poster_path: string | null;
  season_number: number;
  episodes: TMDBEpisodeResponse[];
}

interface TMDBEpisodeResponse {
  id: number;
  name: string;
  overview: string;
  still_path: string | null;
  episode_number: number;
  season_number: number;
  vote_average: number;
}

// Create axios instance for TMDB with Bearer token auth
const tmdbClient = axios.create({
  baseURL: TMDB_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    ...(TMDB_ACCESS_TOKEN && { Authorization: `Bearer ${TMDB_ACCESS_TOKEN}` }),
  },
});

/**
 * Build full image URL from TMDB path for posters
 */
export function buildImageUrl(path: string | null, size: PosterSize = 'medium'): string | null {
  if (!path) return null;
  return `${TMDB_IMAGE_BASE_URL}/${POSTER_SIZES[size]}${path}`;
}

/**
 * Build full backdrop URL from TMDB path
 */
export function buildBackdropUrl(path: string | null, size: BackdropSize = 'large'): string | null {
  if (!path) return null;
  return `${TMDB_IMAGE_BASE_URL}/${BACKDROP_SIZES[size]}${path}`;
}

/**
 * Search for a TV show on TMDB by title
 */
export async function searchTvShow(title: string): Promise<TMDBSearchResult | null> {
  if (!TMDB_API_KEY && !TMDB_ACCESS_TOKEN) {
    console.warn('TMDB API key not configured. Poster fetching disabled.');
    return null;
  }

  try {
    const response = await tmdbClient.get<TMDBSearchResponse>('/search/tv', {
      params: {
        query: title,
        language: 'pt-BR',
        page: 1,
      },
    });

    if (response.data.results.length > 0) {
      // Return the first (most relevant) result
      return response.data.results[0];
    }

    return null;
  } catch (error) {
    console.error('Error searching TMDB:', error);
    return null;
  }
}

/**
 * Fetch poster data for a TV show title
 */
export async function fetchPosterForShow(title: string): Promise<PosterData | null> {
  const result = await searchTvShow(title);
  
  if (!result) {
    return null;
  }

  return {
    posterUrl: buildImageUrl(result.poster_path, 'medium'),
    backdropUrl: buildBackdropUrl(result.backdrop_path, 'medium'),
    backdropUrlHD: buildBackdropUrl(result.backdrop_path, 'original'),
    tmdbId: result.id,
    fetchedAt: Date.now(),
  };
}

/**
 * Batch fetch posters for multiple shows
 */
export async function fetchPostersForShows(
  titles: string[]
): Promise<Map<string, PosterData | null>> {
  const results = new Map<string, PosterData | null>();
  
  // Process in parallel with a concurrency limit
  const BATCH_SIZE = 5;
  
  for (let i = 0; i < titles.length; i += BATCH_SIZE) {
    const batch = titles.slice(i, i + BATCH_SIZE);
    const promises = batch.map(async (title) => {
      const data = await fetchPosterForShow(title);
      return { title, data };
    });
    
    const batchResults = await Promise.all(promises);
    batchResults.forEach(({ title, data }) => {
      results.set(title, data);
    });
  }

  return results;
}

/**
 * Fetch season details from TMDB
 */
export async function fetchSeasonDetails(
  tmdbId: number,
  seasonNumber: number
): Promise<SeasonImageData | null> {
  if (!TMDB_API_KEY && !TMDB_ACCESS_TOKEN) {
    return null;
  }

  try {
    const response = await tmdbClient.get<TMDBSeasonResponse>(
      `/tv/${tmdbId}/season/${seasonNumber}`,
      {
        params: {
          language: 'pt-BR',
        },
      }
    );

    return {
      posterUrl: buildImageUrl(response.data.poster_path, 'medium'),
      tmdbId: response.data.id,
      seasonNumber: response.data.season_number,
      fetchedAt: Date.now(),
    };
  } catch (error) {
    console.error(`Error fetching season ${seasonNumber} for show ${tmdbId}:`, error);
    return null;
  }
}

/**
 * Fetch episode details from TMDB
 */
export async function fetchEpisodeDetails(
  tmdbId: number,
  seasonNumber: number,
  episodeNumber: number
): Promise<EpisodeImageData | null> {
  if (!TMDB_API_KEY && !TMDB_ACCESS_TOKEN) {
    return null;
  }

  try {
    const response = await tmdbClient.get<TMDBEpisodeResponse>(
      `/tv/${tmdbId}/season/${seasonNumber}/episode/${episodeNumber}`,
      {
        params: {
          language: 'pt-BR',
        },
      }
    );

    return {
      stillUrl: buildImageUrl(response.data.still_path, 'medium'),
      tmdbId: response.data.id,
      seasonNumber: response.data.season_number,
      episodeNumber: response.data.episode_number,
      name: response.data.name,
      overview: response.data.overview,
      voteAverage: response.data.vote_average,
      fetchedAt: Date.now(),
    };
  } catch (error) {
    console.error(`Error fetching episode S${seasonNumber}E${episodeNumber} for show ${tmdbId}:`, error);
    return null;
  }
}

/**
 * Fetch all episodes for a season from TMDB
 */
export async function fetchSeasonEpisodes(
  tmdbId: number,
  seasonNumber: number
): Promise<EpisodeImageData[]> {
  if (!TMDB_API_KEY && !TMDB_ACCESS_TOKEN) {
    return [];
  }

  try {
    const response = await tmdbClient.get<TMDBSeasonResponse>(
      `/tv/${tmdbId}/season/${seasonNumber}`,
      {
        params: {
          language: 'pt-BR',
        },
      }
    );

    return response.data.episodes.map((ep) => ({
      stillUrl: buildImageUrl(ep.still_path, 'medium'),
      tmdbId: ep.id,
      seasonNumber: ep.season_number,
      episodeNumber: ep.episode_number,
      name: ep.name,
      overview: ep.overview,
      voteAverage: ep.vote_average,
      fetchedAt: Date.now(),
    }));
  } catch (error) {
    console.error(`Error fetching episodes for season ${seasonNumber}:`, error);
    return [];
  }
}
