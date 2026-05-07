import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Data is considered fresh for 5 minutes — no refetch within that window
      staleTime: 1000 * 60 * 5,
      // Keep unused data in cache for 30 minutes
      gcTime: 1000 * 60 * 30,
      retry: 2,
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 1,
    },
  },
});

// Query key factories — centralized to prevent key mismatches
export const queryKeys = {
  // Players
  player:         (id: string)                        => ['player', id]                  as const,
  players:        (sport: string, filters?: object)   => ['players', sport, filters]     as const,
  trending:       (sport: string)                     => ['trending', sport]              as const,
  search:         (query: string)                     => ['search', query]                as const,

  // Draft
  draftBoard:     (id: string)                        => ['draftBoard', id]               as const,
  draftBoards:    (userId: string)                    => ['draftBoards', userId]          as const,
  mockDraft:      (id: string)                        => ['mockDraft', id]                as const,

  // Trade
  trade:          (id: string)                        => ['trade', id]                    as const,

  // Articles
  articles:       (sport?: string, category?: string) => ['articles', sport, category]   as const,
  article:        (id: string)                        => ['article', id]                  as const,
  bookmarks:      (userId: string)                    => ['bookmarks', userId]            as const,

  // Injuries
  injuries:       (sport?: string)                    => ['injuries', sport]              as const,
  injury:         (playerId: string)                  => ['injury', playerId]             as const,

  // Add/Drop
  addDrop:        (userId: string)                    => ['addDrop', userId]              as const,

  // GM Report
  gmReport:       (userId: string, week: number)      => ['gmReport', userId, week]       as const,

  // Watch list
  watchList:      (userId: string)                    => ['watchList', userId]            as const,

  // Subscription
  subscription:   ()                                  => ['subscription']                 as const,
} as const;
