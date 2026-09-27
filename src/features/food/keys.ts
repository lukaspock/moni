/** TanStack Query key factory for the food feature. */
export const foodKeys = {
  all: ['food'] as const,
  logsForDate: (userId: string | null, date: string) =>
    ['food', 'logs', userId, date] as const,
  recent: (userId: string | null) => ['food', 'recent', userId] as const,
  favorites: (userId: string | null) => ['food', 'favorites', userId] as const,
};
