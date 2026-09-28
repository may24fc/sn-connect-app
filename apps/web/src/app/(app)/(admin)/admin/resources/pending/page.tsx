'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  usePendingResources,
  useApproveResource,
  useRejectResource,
} from '@/hooks/useResources';
import {
  ResourceGrid,
  ResourceCard,
  Card,
  CardContent,
  EmptyState,
  Skeleton,
  Button,
  Dialog,
  Textarea,
  useToast,
} from '@hr-portal/ui';
import { ArrowLeft, FileText, Check, X } from 'lucide-react';

export default function AdminPendingResourcesPage() {
  const router = useRouter();
  const { addToast } = useToast();
  const { data, isLoading, error } = usePendingResources();
  const approve = useApproveResource();
  const reject = useRejectResource();

  const [rejectOpen, setRejectOpen] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalResource, setModalResource] = useState<any | null>(null);
  const [modalVideoUrl, setModalVideoUrl] = useState<string | null>(null);
  const [modalVideoLoading, setModalVideoLoading] = useState(false);
  const [modalVideoError, setModalVideoError] = useState<string | null>(null);

  const grouped = data?.data || { pending_approval: [], pending_update: [], pending_deletion: [] };

  function handleApprove(id: string) {
    approve.mutate(id, {
      onSuccess: () => {
        addToast({ title: 'Approved', description: 'Resource approved', variant: 'success' });
      },
      onError: () => {
        addToast({ title: 'Error', description: 'Failed to approve', variant: 'error' });
      },
    });
  }

  function openReject(id: string, closePreview = false) {
    setActiveId(id);
    setNotes('');
    if (closePreview) {
      setModalOpen(false);
      setModalResource(null);
    }
    setRejectOpen(true);
  }

  async function openModal(id: string) {
    setModalOpen(true);
    setModalLoading(true);
    setModalVideoUrl(null);
    setModalVideoError(null);
    try {
      const res = await fetch(`/api/resources/${id}`);
      if (!res.ok) throw new Error('Failed to load resource');
      const json = await res.json();
      const resource = json.data || null;
      setModalResource(resource);

      if (resource?.resource_type === 'video') {
        setModalVideoLoading(true);
        try {
          const streamRes = await fetch(`/api/resources/${id}/stream`);
          if (streamRes.status === 409) {
            const processingPayload = await streamRes.json().catch(() => null);
            setModalVideoError(processingPayload?.error ?? 'Video is still processing.');
            setModalVideoUrl(null);
          } else if (!streamRes.ok) {
            setModalVideoError('Unable to load video preview right now.');
            setModalVideoUrl(null);
          } else {
            const streamJson = await streamRes.json();
            setModalVideoUrl(streamJson?.data?.url ?? null);
          }
        } catch {
          setModalVideoError('Unable to load video preview right now.');
          setModalVideoUrl(null);
        } finally {
          setModalVideoLoading(false);
        }
      }
    } catch (err) {
      console.error('Failed to fetch resource details', err);
      addToast({ title: 'Error', description: 'Failed to load resource details', variant: 'error' });
      setModalOpen(false);
    } finally {
      setModalLoading(false);
    }
  }

  function submitReject() {
    if (!activeId) return;
    reject.mutate({ id: activeId, notes }, {
      onSuccess: () => {
        setRejectOpen(false);
        setActiveId(null);
        setNotes('');
        setModalOpen(false);
        setModalResource(null);
        addToast({ title: 'Rejected', description: 'Resource rejected', variant: 'success' });
      },
      onError: () => {
        addToast({ title: 'Error', description: 'Failed to reject', variant: 'error' });
      },
    });
  }

  function handleApproveAndClose(id: string) {
    approve.mutate(id, {
      onSuccess: () => {
        setModalOpen(false);
        setModalResource(null);
        setModalVideoUrl(null);
        setModalVideoError(null);
        addToast({ title: 'Approved', description: 'Resource approved', variant: 'success' });
      },
      onError: () => {
        addToast({ title: 'Error', description: 'Failed to approve', variant: 'error' });
      },
    });
  }

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      <div className="p-3">
        <Button
          variant="ghost"
          onClick={() => router.push('/admin/resources')}
          className="mb-3"
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back
        </Button>
        <div className="flex items-center justify-between gap-3 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Pending Approvals</h1>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">Queue of resources awaiting admin review</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {isLoading ? (
          <ResourceGrid columns={3} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="bg-card border border-border rounded-lg overflow-hidden">
                <Skeleton className="h-36 w-full rounded-none" />
                <CardContent className="p-4 space-y-3">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                </CardContent>
              </Card>
            ))}
          </ResourceGrid>
        ) : error ? (
          <Card className="bg-card border border-border rounded-lg p-4">
            <CardContent className="p-0 text-sm text-rose-600 dark:text-rose-400">Failed to load pending resources.</CardContent>
          </Card>
        ) : (
          <>
            {['pending_approval', 'pending_update', 'pending_deletion'].map((key) => {
              const list = grouped[key] || [];
              const title =
                key === 'pending_approval'
                  ? 'New Submissions'
                  : key === 'pending_update'
                  ? 'Update Requests'
                  : 'Deletion Requests';

              return (
                <div key={key} className="mb-6">
                  <h2 className="text-lg font-semibold mb-3 text-zinc-800 dark:text-zinc-100">{title}</h2>
                  {list.length === 0 ? (
                    <EmptyState icon={FileText} title="No items" description="No pending items in this queue" />
                  ) : (
                    <ResourceGrid columns={3} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {list.map((r: any) => (
                        <ResourceCard
                          key={r.id}
                          id={r.id}
                          title={r.title}
                          excerpt={''}
                          resourceType={'document'}
                          category={'tools'}
                          tags={[]}
                          thumbnailPath={null}
                          viewCount={0}
                          downloadCount={0}
                          bookmarkCount={0}
                          dateLabel={new Date(r.created_at).toLocaleString()}
                          approvalStatus={r.approval_status}
                          onClick={() => openModal(r.id)}
                          actions={
                            <>
                              <Button size="xs" variant="ghost" onClick={(e: any) => { e.stopPropagation(); handleApprove(r.id); }}>
                                <Check className="mr-1 h-3.5 w-3.5" /> Approve
                              </Button>
                              <Button size="xs" variant="ghost" onClick={(e: any) => { e.stopPropagation(); openReject(r.id); }}>
                                <X className="mr-1 h-3.5 w-3.5" /> Reject
                              </Button>
                              <Button size="xs" variant="ghost" onClick={(e: any) => { e.stopPropagation(); openModal(r.id); }}>
                                View
                              </Button>
                            </>
                          }
                        />
                      ))}
                    </ResourceGrid>
                  )}
                </div>
              );
            })}
          </>
        )}
      </div>

      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        {rejectOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="w-full max-w-lg">
              <div className="bg-card border border-border rounded-lg p-4">
                <h3 className="text-lg font-semibold">Reject Request</h3>
                <p className="text-sm text-zinc-600 mb-3">Provide a note for the author explaining why this was rejected.</p>
                <Textarea value={notes} onChange={(e: any) => setNotes(e.target.value)} />
                <div className="flex justify-end gap-2 mt-3">
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setRejectOpen(false);
                      setActiveId(null);
                      setNotes('');
                    }}
                  >
                    Cancel
                  </Button>
                  <Button onClick={submitReject}>Submit Rejection</Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </Dialog>
      {/* Resource details modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="w-full max-w-3xl">
              <div className="bg-card border border-border rounded-lg p-4">
                {modalLoading ? (
                  <div className="p-8">
                    <Skeleton className="h-8 w-3/4 mb-4" />
                    <Skeleton className="h-48 w-full" />
                  </div>
                ) : modalResource ? (
                  <div>
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-lg font-semibold">{modalResource.title}</h3>
                        <p className="text-sm text-muted-foreground">by {modalResource.author_id}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => handleApproveAndClose(modalResource.id)}>Approve</Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openReject(modalResource.id, true)}
                        >
                          Reject
                        </Button>
                      </div>
                    </div>

                    <div className="mt-4">
                      <h4 className="text-sm font-medium">Description</h4>
                      <p className="text-sm text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap mt-2">{modalResource.description}</p>
                    </div>

                    {modalResource.resource_type === 'video' && (
                      <div className="mt-4">
                        <h4 className="text-sm font-medium">Video Preview</h4>
                        <div className="mx-auto mt-2 w-full max-w-2xl overflow-hidden rounded-md bg-zinc-900">
                          <div className="aspect-video w-full">
                            {modalVideoLoading ? (
                              <div className="flex h-full items-center justify-center text-sm text-zinc-300">
                                Loading video...
                              </div>
                            ) : modalVideoUrl ? (
                              <video
                                src={modalVideoUrl}
                                controls
                                preload="metadata"
                                className="h-full w-full"
                              />
                            ) : (
                              <div className="flex h-full items-center justify-center px-4 text-center text-sm text-zinc-300">
                                {modalVideoError ?? 'No video preview available.'}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {modalResource.pending_changes && (
                      <div className="mt-4 border-t pt-3">
                        <h4 className="text-sm font-medium">Pending Changes</h4>
                        <pre className="text-xs mt-2 max-h-48 overflow-auto bg-zinc-50 dark:bg-zinc-900 p-2 rounded">{JSON.stringify(modalResource.pending_changes, null, 2)}</pre>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-4">No details available.</div>
                )}
              </div>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
}
