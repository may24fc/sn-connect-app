import { QueryClient } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  type ToastController,
  createOptimisticMutation,
  createToastMutationHandler,
  toastMutation,
} from '@/lib/mutation-helpers';

// ──────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────

function createMockToast(): ToastController & {
  calls: { method: string; args: unknown[] }[];
} {
  const calls: { method: string; args: unknown[] }[] = [];
  let toastCounter = 0;

  return {
    calls,
    addToast: vi.fn((toast) => {
      toastCounter += 1;
      const id = `toast-${toastCounter}`;
      calls.push({ method: 'addToast', args: [toast] });
      return id;
    }),
    updateToast: vi.fn((id, toast) => {
      calls.push({ method: 'updateToast', args: [id, toast] });
    }),
    removeToast: vi.fn((id) => {
      calls.push({ method: 'removeToast', args: [id] });
    }),
  };
}

// ──────────────────────────────────────────────────────────────
// Tests: createOptimisticMutation
// ──────────────────────────────────────────────────────────────

describe('createOptimisticMutation', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
  });

  it('applies optimistic update immediately on mutate', async () => {
    const queryKey = ['items'];
    queryClient.setQueryData(queryKey, [{ id: '1', name: 'Old' }]);

    const config = createOptimisticMutation(queryClient, {
      mutationFn: async (vars: { id: string; name: string }) => vars,
      queryKey,
      optimisticUpdate: (current, vars) => {
        const items = current as { id: string; name: string }[];
        return items.map((item) => (item.id === vars.id ? { ...item, name: vars.name } : item));
      },
    });

    // Simulate onMutate
    const context = await config.onMutate({ id: '1', name: 'New' });

    // Cache should be optimistically updated
    const cached = queryClient.getQueryData(queryKey) as { id: string; name: string }[];
    expect(cached).toEqual([{ id: '1', name: 'New' }]);

    // Previous data should be stored for rollback
    expect(context.previousData).toBeDefined();
    const prev = context.previousData.get(JSON.stringify(queryKey));
    expect(prev).toEqual([{ id: '1', name: 'Old' }]);
  });

  it('rolls back on error', async () => {
    const queryKey = ['items'];
    const original = [{ id: '1', name: 'Original' }];
    queryClient.setQueryData(queryKey, original);

    const config = createOptimisticMutation(queryClient, {
      mutationFn: async () => {
        throw new Error('Server error');
      },
      queryKey,
      optimisticUpdate: (current, _vars) => {
        return [{ id: '1', name: 'Optimistic' }];
      },
    });

    // Apply optimistic update
    const context = await config.onMutate({ id: '1' });

    expect(queryClient.getQueryData(queryKey)).toEqual([{ id: '1', name: 'Optimistic' }]);

    // Simulate error → rollback
    config.onError(new Error('Server error'), { id: '1' }, context);

    expect(queryClient.getQueryData(queryKey)).toEqual(original);
  });

  it('invalidates queries on settle', async () => {
    const queryKey = ['items'];
    queryClient.setQueryData(queryKey, []);

    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const config = createOptimisticMutation(queryClient, {
      mutationFn: async () => ({}),
      queryKey,
    });

    config.onSettled();

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey });
  });

  it('calls onSuccessCallback when mutation succeeds', async () => {
    const queryKey = ['items'];
    const successCb = vi.fn();

    const config = createOptimisticMutation(queryClient, {
      mutationFn: async (vars: string) => ({ result: vars }),
      queryKey,
      onSuccessCallback: successCb,
    });

    config.onSuccess({ result: 'test' }, 'test');

    expect(successCb).toHaveBeenCalledWith({ result: 'test' }, 'test');
  });

  it('calls onErrorCallback when mutation fails', async () => {
    const queryKey = ['items'];
    const errorCb = vi.fn();

    const config = createOptimisticMutation(queryClient, {
      mutationFn: async () => {
        throw new Error('fail');
      },
      queryKey,
      onErrorCallback: errorCb,
    });

    const error = new Error('fail');
    config.onError(error, 'vars', undefined);

    expect(errorCb).toHaveBeenCalledWith(error, 'vars');
  });

  it('supports multiple query keys', async () => {
    const key1 = ['items', 'list'];
    const key2 = ['items', 'detail', '1'];
    queryClient.setQueryData(key1, []);
    queryClient.setQueryData(key2, {});

    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const config = createOptimisticMutation(queryClient, {
      mutationFn: async () => ({}),
      queryKey: [key1, key2],
    });

    config.onSettled();

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: key1 });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: key2 });
  });
});

// ──────────────────────────────────────────────────────────────
// Tests: toastMutation
// ──────────────────────────────────────────────────────────────

describe('toastMutation', () => {
  it('shows loading → success toast transition', async () => {
    const toast = createMockToast();
    const result = await toastMutation(toast, async () => ({ saved: true }), {
      loading: 'Saving report...',
      success: 'Report saved',
      successDescription: 'Your report has been saved.',
    });

    expect(result).toEqual({ saved: true });

    // First call: loading toast (persistent)
    expect(toast.addToast).toHaveBeenCalledWith({
      title: 'Saving report...',
      variant: 'default',
      duration: 0,
    });

    // Second call: update to success
    expect(toast.updateToast).toHaveBeenCalledWith('toast-1', {
      title: 'Report saved',
      description: 'Your report has been saved.',
      variant: 'success',
      duration: 3000,
    });
  });

  it('shows loading → error toast transition on failure', async () => {
    const toast = createMockToast();
    const result = await toastMutation(
      toast,
      async () => {
        throw new Error('Network timeout');
      },
      {
        loading: 'Saving...',
        error: 'Save failed',
      }
    );

    expect(result).toBeUndefined();

    // Loading toast shown
    expect(toast.addToast).toHaveBeenCalledWith({
      title: 'Saving...',
      variant: 'default',
      duration: 0,
    });

    // Updated to error with server message as description
    expect(toast.updateToast).toHaveBeenCalledWith('toast-1', {
      title: 'Save failed',
      description: 'Network timeout',
      variant: 'error',
      duration: 5000,
    });
  });

  it('hides error detail when showErrorDetail is false', async () => {
    const toast = createMockToast();
    await toastMutation(
      toast,
      async () => {
        throw new Error('Sensitive error details');
      },
      {
        error: 'Something went wrong',
        showErrorDetail: false,
      }
    );

    expect(toast.updateToast).toHaveBeenCalledWith('toast-1', {
      title: 'Something went wrong',
      variant: 'error',
      duration: 5000,
    });
  });

  it('uses default messages when none provided', async () => {
    const toast = createMockToast();
    await toastMutation(toast, async () => 'ok');

    expect(toast.addToast).toHaveBeenCalledWith({
      title: 'Saving...',
      variant: 'default',
      duration: 0,
    });

    expect(toast.updateToast).toHaveBeenCalledWith('toast-1', {
      title: 'Saved',
      variant: 'success',
      duration: 3000,
    });
  });
});

// ──────────────────────────────────────────────────────────────
// Tests: createToastMutationHandler
// ──────────────────────────────────────────────────────────────

describe('createToastMutationHandler', () => {
  it('creates a reusable handler function', async () => {
    const toast = createMockToast();
    const mutationFn = vi.fn(async (data: { name: string }) => ({
      id: '1',
      name: data.name,
    }));

    const handler = createToastMutationHandler(toast, mutationFn, {
      loading: 'Creating...',
      success: 'Created',
    });

    const result = await handler({ name: 'Test' });

    expect(mutationFn).toHaveBeenCalledWith({ name: 'Test' });
    expect(result).toEqual({ id: '1', name: 'Test' });
    expect(toast.updateToast).toHaveBeenCalledWith(
      'toast-1',
      expect.objectContaining({ title: 'Created', variant: 'success' })
    );
  });

  it('handles errors gracefully', async () => {
    const toast = createMockToast();
    const mutationFn = vi.fn(async () => {
      throw new Error('DB constraint violation');
    });

    const handler = createToastMutationHandler(toast, mutationFn, {
      error: 'Creation failed',
    });

    const result = await handler({});

    expect(result).toBeUndefined();
    expect(toast.updateToast).toHaveBeenCalledWith(
      'toast-1',
      expect.objectContaining({ title: 'Creation failed', variant: 'error' })
    );
  });
});
