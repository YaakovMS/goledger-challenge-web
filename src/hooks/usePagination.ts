import { useInfiniteQuery } from '@tanstack/react-query';
import type { PaginatedResult, PaginationParams } from '@/types';

interface UsePaginationOptions<T> {
  queryKey: string[];
  queryFn: (params: PaginationParams) => Promise<PaginatedResult<T>>;
  pageSize?: number;
  enabled?: boolean;
}

export function usePagination<T>({
  queryKey,
  queryFn,
  pageSize = 12,
  enabled = true,
}: UsePaginationOptions<T>) {
  const query = useInfiniteQuery({
    queryKey,
    queryFn: async ({ pageParam }) => {
      return queryFn({ 
        limit: pageSize, 
        bookmark: pageParam || null 
      });
    },
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => {
      return lastPage.hasMore ? lastPage.bookmark : undefined;
    },
    enabled,
  });

  // Flatten all pages into a single array
  const items = query.data?.pages.flatMap((page) => page.items) ?? [];

  // Calculate total fetched across all pages
  const totalFetched = query.data?.pages.reduce(
    (acc, page) => acc + page.totalFetched, 
    0
  ) ?? 0;

  return {
    items,
    totalFetched,
    isLoading: query.isLoading,
    isFetchingNextPage: query.isFetchingNextPage,
    hasNextPage: query.hasNextPage ?? false,
    fetchNextPage: query.fetchNextPage,
    error: query.error,
    refetch: query.refetch,
    isRefetching: query.isRefetching,
  };
}
