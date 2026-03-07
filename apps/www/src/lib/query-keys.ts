export const queryKeys = {
  businesses: {
    all: ['businesses'] as const,
    list: () => [...queryKeys.businesses.all, 'list'] as const,
    detail: (slug: string) => [...queryKeys.businesses.all, 'detail', slug] as const,
  },
  jobs: {
    all: ['jobs'] as const,
    list: (filters?: Record<string, unknown>) => [...queryKeys.jobs.all, 'list', filters] as const,
  },
  team: {
    all: ['team'] as const,
  },
  content: {
    all: ['content'] as const,
    section: (section: string) => [...queryKeys.content.all, section] as const,
  },
};
