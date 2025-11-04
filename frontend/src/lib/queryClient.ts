import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 10, // 10 minutes (formerly cacheTime)
      retry: (failureCount, error: any) => {
        // Don't retry on 4xx errors
        if (error?.status >= 400 && error?.status < 500) {
          return false;
        }
        return failureCount < 3;
      },
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 1,
    },
  },
});

// Query keys for consistent cache management
export const queryKeys = {
  repositories: {
    all: ['repositories'] as const,
    list: (filters?: any) => ['repositories', 'list', filters] as const,
    detail: (id: string) => ['repositories', 'detail', id] as const,
  },
  jobs: {
    all: ['jobs'] as const,
    list: (filters?: any) => ['jobs', 'list', filters] as const,
    detail: (id: string) => ['jobs', 'detail', id] as const,
    stats: (id: string) => ['jobs', 'stats', id] as const,
    reviews: (id: string, filters?: any) => ['jobs', 'reviews', id, filters] as const,
  },
  queue: {
    stats: ['queue', 'stats'] as const,
  },
  health: {
    check: ['health'] as const,
  },
} as const;