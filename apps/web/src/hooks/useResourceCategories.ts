import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

export interface ResourceCategoryRecord {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  parentId: string | null;
  displayOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  resourceCount: number;
}

export interface ResourceCategoryTreeNode extends ResourceCategoryRecord {
  children: ResourceCategoryTreeNode[];
}

const CATEGORIES_QUERY_KEY = ['resource-categories'] as const;

/**
 * Fetch all resource categories.
 */
export function useResourceCategories(options?: { includeInactive?: boolean }) {
  return useQuery({
    queryKey: [...CATEGORIES_QUERY_KEY, 'list', options?.includeInactive ?? false] as const,
    queryFn: async (): Promise<ResourceCategoryRecord[]> => {
      const params = new URLSearchParams();
      if (options?.includeInactive) params.append('includeInactive', 'true');

      const response = await fetch(`/api/resources/categories?${params.toString()}`);

      if (!response.ok) {
        throw new Error('Failed to fetch resource categories');
      }

      const json = await response.json();
      return json.data;
    },
    staleTime: 5 * 60 * 1000, // 5 min for stable data
  });
}

/**
 * Build a tree from flat category list.
 */
export function buildCategoryTree(
  categories: ResourceCategoryRecord[]
): ResourceCategoryTreeNode[] {
  const map = new Map<string, ResourceCategoryTreeNode>();
  const roots: ResourceCategoryTreeNode[] = [];

  // Create nodes
  for (const cat of categories) {
    map.set(cat.id, { ...cat, children: [] });
  }

  // Build tree
  for (const cat of categories) {
    const node = map.get(cat.id);
    if (!node) continue;

    if (cat.parentId && map.has(cat.parentId)) {
      map.get(cat.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}

interface CreateCategoryInput {
  name: string;
  slug: string;
  description?: string | null;
  icon?: string | null;
  parentId?: string | null;
  displayOrder?: number;
  isActive?: boolean;
}

/**
 * Create a new resource category.
 */
export function useCreateResourceCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateCategoryInput) => {
      const response = await fetch('/api/resources/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: 'Failed to create category' }));
        throw new Error(err.error || 'Failed to create category');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CATEGORIES_QUERY_KEY });
    },
  });
}

/**
 * Update a resource category.
 */
export function useUpdateResourceCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...input }: { id: string } & Partial<CreateCategoryInput>) => {
      const response = await fetch(`/api/resources/categories?id=${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: 'Failed to update category' }));
        throw new Error(err.error || 'Failed to update category');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CATEGORIES_QUERY_KEY });
    },
  });
}

/**
 * Delete a resource category.
 */
export function useDeleteResourceCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/resources/categories?id=${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: 'Failed to delete category' }));
        throw new Error(err.error || 'Failed to delete category');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CATEGORIES_QUERY_KEY });
    },
  });
}
