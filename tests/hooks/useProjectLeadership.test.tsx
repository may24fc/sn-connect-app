import {
  useAddProjectContributor,
  useCancelProjectInvitation,
  useCreateProject,
  useDeleteProject,
  useRemoveProjectContributor,
  useRespondProjectInvitation,
  useUpdateProject,
} from '@/hooks/useProjects';
import { queryKeys } from '@/lib/query-keys';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

function createWrapper(client: QueryClient) {
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
}

describe('project leadership mutations', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('reconciles Work Tracker and admin overview after each successful change', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ data: {}, ok: true }))));
    const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
    const invalidate = vi.spyOn(client, 'invalidateQueries');
    const { result } = renderHook(
      () => ({
        create: useCreateProject(),
        update: useUpdateProject(),
        remove: useDeleteProject(),
        addContributor: useAddProjectContributor(),
        removeContributor: useRemoveProjectContributor(),
      }),
      { wrapper: createWrapper(client) }
    );
    const mutations = [
      () => result.current.create.mutateAsync({
        name: 'Project',
        leadUserId: 'lead',
        startDate: '2026-11-01',
        targetEndDate: '2026-12-01',
      }),
      () => result.current.update.mutateAsync({ projectId: 'project', leadUserId: 'lead' }),
      () => result.current.remove.mutateAsync({ projectId: 'project' }),
      () => result.current.addContributor.mutateAsync({
        projectId: 'project', userId: 'lead', role: 'lead',
      }),
      () => result.current.removeContributor.mutateAsync({ projectId: 'project', userId: 'lead' }),
    ];

    for (const mutate of mutations) {
      invalidate.mockClear();
      await act(async () => { await mutate(); });
      expect(invalidate).toHaveBeenCalledWith({ queryKey: queryKeys.workTracker.all });
      expect(invalidate).toHaveBeenCalledWith({ queryKey: queryKeys.adminProjects.overview() });
    }
  });

  it('surfaces a rejected promotion without invalidating confirmed data', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(
      JSON.stringify({ error: 'Not eligible' }),
      { status: 403 }
    )));
    const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
    const invalidate = vi.spyOn(client, 'invalidateQueries');
    const { result } = renderHook(() => useAddProjectContributor(), {
      wrapper: createWrapper(client),
    });

    await act(async () => {
      await expect(result.current.mutateAsync({
        projectId: 'project', userId: 'lead', role: 'lead',
      })).rejects.toThrow('Not eligible');
    });
    expect(invalidate).not.toHaveBeenCalled();
  });

  it('reconciles membership, invitation and notification caches after acceptance', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({
      ok: true, status: 'accepted', projectId: 'project', makePrimary: false, primaryChanged: false,
    }))));
    const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
    const invalidate = vi.spyOn(client, 'invalidateQueries');
    const { result } = renderHook(() => useRespondProjectInvitation(), { wrapper: createWrapper(client) });

    await act(async () => {
      await result.current.mutateAsync({ invitationId: 'invite', action: 'accept' });
    });
    for (const key of [
      queryKeys.projects.invitations(), queryKeys.projects.detail('project'),
      queryKeys.projects.lists(), queryKeys.workTracker.all, queryKeys.notifications.all,
    ]) {
      expect(invalidate).toHaveBeenCalledWith({ queryKey: key });
    }
  });

  it('refreshes pending invitations and candidates after cancellation', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ ok: true }))));
    const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
    const invalidate = vi.spyOn(client, 'invalidateQueries');
    const { result } = renderHook(() => useCancelProjectInvitation(), { wrapper: createWrapper(client) });

    await act(async () => {
      await result.current.mutateAsync({ projectId: 'project', invitationId: 'invite' });
    });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: queryKeys.projects.projectInvitations('project') });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: queryKeys.projects.contributorCandidatesFor('project') });
  });
});
