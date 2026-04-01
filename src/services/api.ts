import axios, { type AxiosInstance, type AxiosRequestConfig } from 'axios';
import type { SearchResponse, PaginatedResult, PaginationParams } from '@/types';

// API Base URL
const API_BASE_URL = 'http://ec2-50-19-36-138.compute-1.amazonaws.com';

// Credentials - In production, these should be in environment variables
// For now, we'll use a placeholder that the user will need to update
const API_USERNAME = import.meta.env.VITE_API_USERNAME || 'your-username';
const API_PASSWORD = import.meta.env.VITE_API_PASSWORD || 'your-password';

// Create base64 encoded credentials for Basic Auth
const getAuthHeader = (): string => {
  const credentials = `${API_USERNAME}:${API_PASSWORD}`;
  const encoded = btoa(credentials);
  return `Basic ${encoded}`;
};

// Create axios instance with default config
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    Accept: '*/*',
  },
});

// Add auth header to all requests
apiClient.interceptors.request.use(
  (config) => {
    config.headers.Authorization = getAuthHeader();
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      // Server responded with error status
      console.error('API Error:', error.response.status, error.response.data);
      
      if (error.response.status === 401) {
        console.error('Authentication failed. Check your credentials.');
      }
    } else if (error.request) {
      // Request was made but no response
      console.error('Network Error:', error.message);
    } else {
      console.error('Error:', error.message);
    }
    return Promise.reject(error);
  }
);

// API methods
export const api = {
  // Query endpoints
  query: {
    getSchema: async (assetType?: string) => {
      const payload = assetType ? { assetType } : {};
      const response = await apiClient.post('/api/query/getSchema', payload);
      return response.data;
    },

    search: async <T>(
      selector: Record<string, unknown>, 
      limit?: number, 
      bookmark?: string | null
    ): Promise<SearchResponse<T>> => {
      const query: Record<string, unknown> = { selector };
      if (limit) query.limit = limit;
      if (bookmark) query.bookmark = bookmark;
      
      const response = await apiClient.post('/api/query/search', { query });
      return response.data as SearchResponse<T>;
    },

    // Paginated search with cursor-based pagination
    searchPaginated: async <T>(
      selector: Record<string, unknown>,
      params: PaginationParams = {}
    ): Promise<PaginatedResult<T>> => {
      const { limit = 10, bookmark = null } = params;
      const query: Record<string, unknown> = { selector, limit };
      if (bookmark) query.bookmark = bookmark;
      
      const response = await apiClient.post('/api/query/search', { query });
      const data = response.data as SearchResponse<T>;
      
      const items = data.result || [];
      const newBookmark = data.metadata?.bookmark || null;
      const fetchedCount = data.metadata?.fetchedRecordsCount || items.length;
      
      return {
        items,
        bookmark: newBookmark,
        hasMore: fetchedCount >= limit && !!newBookmark,
        totalFetched: fetchedCount,
      };
    },

    readAsset: async <T>(key: Record<string, unknown>) => {
      const response = await apiClient.post('/api/query/readAsset', { key });
      return response.data as T;
    },
  },

  // Invoke endpoints (mutations)
  invoke: {
    createAsset: async <T>(asset: Record<string, unknown>) => {
      const response = await apiClient.post('/api/invoke/createAsset', { asset: [asset] });
      return response.data as T[];
    },

    updateAsset: async <T>(update: Record<string, unknown>) => {
      const response = await apiClient.post('/api/invoke/updateAsset', { update });
      return response.data as T;
    },

    deleteAsset: async (key: Record<string, unknown>) => {
      const response = await apiClient.post('/api/invoke/deleteAsset', { key });
      return response.data;
    },
  },
};

// Custom request method for any other endpoints
export const customRequest = async <T>(
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  endpoint: string,
  data?: unknown,
  config?: AxiosRequestConfig
): Promise<T> => {
  const response = await apiClient.request<T>({
    method,
    url: endpoint,
    data,
    ...config,
  });
  return response.data;
};

export default apiClient;
