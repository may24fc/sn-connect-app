import type { QueryClient, QueryKey } from '@tanstack/react-query';

// ──────────────────────────────────────────────────────────────
// Optimistic Mutation Helpers
// ──────────────────────────────────────────────────────────────

/**
 * Configuration for creating an optimistic mutation options object
 * compatible with TanStack Query's `useMutation`.
 */
export interface OptimisticMutationConfig<TData, TVariables> {
  /** The async function that performs the actual mutation (API call). */
  mutationFn: (variables: TVariables) => Promise<TData>;
  /** Query key(s) to invalidate after the mutation settles. */
  queryKey: QueryKey | QueryKey[];
  /**
   * Optional function to compute optimistic data from the current cache and the
   * variables being sent. Return the new cache value, or `undefined` to skip
   * the optimistic update for that key.
   */
  optimisticUpdate?: (currentData: unknown, variables: TVariables) => unknown;
  /** Additional query keys to cancel before applying the optimistic update. */
  additionalCancelKeys?: QueryKey[];
  /** Callback invoked when the mutation succeeds. */
  onSuccessCallback?: (data: TData, variables: TVariables) => void;
  /** Callback invoked when the mutation errors. */
  onErrorCallback?: (error: Error, variables: TVariables) => void;
}

/**
 * Builds a TanStack Query `useMutation` options object that implements the
 * Optimistic UI pattern:
 *
 * 1. **onMutate** — cancels in-flight queries, snapshots the cache, applies
 *    the optimistic update.
 * 2. **onError** — rolls back the cache to the snapshot.
 * 3. **onSettled** — always invalidates the affected queries so the UI
 *    converges to server truth.
 *
 * Usage:
 * ```ts
 * const mutation = useMutation(
 *   createOptimisticMutation<MyData, MyVars>(queryClient, {
 *     mutationFn: (vars) => api.update(vars),
 *     queryKey: queryKeys.items.all,
 *     optimisticUpdate: (old, vars) => ({ ...old, ...vars }),
 *   })
 * );
 * ```
 */
export function createOptimisticMutation<TData, TVariables>(
  queryClient: QueryClient,
  config: OptimisticMutationConfig<TData, TVariables>
) {
  const {
    mutationFn,
    queryKey,
    optimisticUpdate,
    additionalCancelKeys,
    onSuccessCallback,
    onErrorCallback,
  } = config;

  // Normalise queryKey to an array of keys
  const queryKeys: QueryKey[] = Array.isArray(queryKey[0]) ? (queryKey as QueryKey[]) : [queryKey];

  return {
    mutationFn,

    onMutate: async (variables: TVariables) => {
      // 1. Cancel any in-flight queries for the affected keys
      const cancelPromises = queryKeys.map((key) =>
        queryClient.cancelQueries({ queryKey: key })
      );
      if (additionalCancelKeys) {
        for (const key of additionalCancelKeys) {
          cancelPromises.push(queryClient.cancelQueries({ queryKey: key }));
        }
      }
      await Promise.all(cancelPromises);

      // 2. Snapshot current cache values for rollback
      const previousData = new Map<string, unknown>();
      for (const key of queryKeys) {
        previousData.set(JSON.stringify(key), queryClient.getQueryData(key));
      }

      // 3. Apply optimistic update if provided
      if (optimisticUpdate) {
        for (const key of queryKeys) {
          const current = queryClient.getQueryData(key);
          const next = optimisticUpdate(current, variables);
          if (next !== undefined) {
            queryClient.setQueryData(key, next);
          }
        }
      }

      return { previousData };
    },

    onError: (
      _error: Error,
      _variables: TVariables,
      context: { previousData: Map<string, unknown> } | undefined
    ) => {
      // Rollback to snapshots
      if (context?.previousData) {
        for (const [keyStr, data] of context.previousData) {
          const key = JSON.parse(keyStr) as QueryKey;
          queryClient.setQueryData(key, data);
        }
      }
      if (onErrorCallback) {
        onErrorCallback(_error, _variables);
      }
    },

    onSuccess: (data: TData, variables: TVariables) => {
      if (onSuccessCallback) {
        onSuccessCallback(data, variables);
      }
    },

    onSettled: () => {
      // Always refetch to converge with server state
      for (const key of queryKeys) {
        queryClient.invalidateQueries({ queryKey: key });
      }
    },
  };
}

// ──────────────────────────────────────────────────────────────
// Toast-Integrated Mutation Helper
// ──────────────────────────────────────────────────────────────

/**
 * Toast control interface matching the `useToast()` hook from `@hr-portal/ui`.
 */
export interface ToastController {
  addToast: (toast: {
    title?: string;
    description?: string;
    variant?: 'default' | 'success' | 'error' | 'warning';
    duration?: number;
  }) => string;
  updateToast: (
    id: string,
    toast: {
      title?: string;
      description?: string;
      variant?: 'default' | 'success' | 'error' | 'warning';
      duration?: number;
    }
  ) => void;
  removeToast: (id: string) => void;
}

export interface ToastMutationMessages {
  /** Shown immediately when the mutation starts. Default: "Saving..." */
  loading?: string;
  /** Shown on success. Default: "Saved" */
  success?: string;
  /** Shown on error. Default: "Failed" */
  error?: string;
  /** Optional description for the success toast. */
  successDescription?: string;
  /** If true, the error message from the server is shown as the description. Default: true */
  showErrorDetail?: boolean;
}

/**
 * Wraps a `mutateAsync` call with a loading → success/error toast transition.
 *
 * This solves the "Ghost Success" bug by:
 * 1. Showing a persistent "Saving…" toast immediately
 * 2. Only transitioning to "Saved" or "Failed" when the promise fully resolves/rejects
 * 3. Never showing "Failed" for timeouts while the mutation is still pending
 *
 * Usage:
 * ```ts
 * const { addToast, updateToast, removeToast } = useToast();
 * const mutation = useMutation({ ... });
 *
 * const handleSave = async () => {
 *   await toastMutation(
 *     { addToast, updateToast, removeToast },
 *     () => mutation.mutateAsync(data),
 *     { loading: 'Saving report...', success: 'Report saved', error: 'Failed to save report' }
 *   );
 * };
 * ```
 */
export async function toastMutation<T>(
  toast: ToastController,
  mutationFn: () => Promise<T>,
  messages: ToastMutationMessages = {}
): Promise<T | undefined> {
  const {
    loading = 'Saving...',
    success = 'Saved',
    error = 'Failed',
    successDescription,
    showErrorDetail = true,
  } = messages;

  // Show a persistent loading toast (duration 0 = stays until updated)
  const toastId = toast.addToast({
    title: loading,
    variant: 'default',
    duration: 0,
  });

  try {
    const result = await mutationFn();

    // Transition to success
    toast.updateToast(toastId, {
      title: success,
      ...(successDescription != null ? { description: successDescription } : {}),
      variant: 'success',
      duration: 3000,
    });

    return result;
  } catch (err) {
    const errorMessage =
      showErrorDetail && err instanceof Error ? err.message : undefined;

    // Transition to error
    toast.updateToast(toastId, {
      title: error,
      ...(errorMessage != null ? { description: errorMessage } : {}),
      variant: 'error',
      duration: 5000,
    });

    return undefined;
  }
}

/**
 * Creates a mutation handler that integrates with the toast system.
 * Returns a function that can be used as an onClick/onSubmit handler.
 *
 * Usage:
 * ```ts
 * const handleSave = createToastMutationHandler(
 *   toast,
 *   (data: FormData) => mutation.mutateAsync(data),
 *   {
 *     loading: 'Creating employee...',
 *     success: 'Employee created',
 *     error: 'Failed to create employee',
 *   }
 * );
 * ```
 */
export function createToastMutationHandler<TVariables, TResult>(
  toast: ToastController,
  mutationFn: (variables: TVariables) => Promise<TResult>,
  messages: ToastMutationMessages = {}
): (variables: TVariables) => Promise<TResult | undefined> {
  return (variables: TVariables) =>
    toastMutation(toast, () => mutationFn(variables), messages);
}
