'use client';

import { useAIChat } from '@/hooks/useAIChat';
import {
  useAISources,
  useDeleteSource,
  useUpdateSource,
  useUploadSource,
} from '@/hooks/useAISources';
import { AIKnowledgeManager, type ChatInterfaceMessage } from '@hr-portal/ui';
import type { AccessLevel, FileStatus } from '@hr-portal/ui';
import { useToast } from '@hr-portal/ui';
import * as React from 'react';

interface UploadingFile {
  id: string;
  fileName: string;
  stage: FileStatus;
}

export default function AdminAIKnowledgePage(): React.ReactNode {
  const { data: sourcesResponse, isLoading: isSourcesLoading } = useAISources();
  const uploadSource = useUploadSource();
  const updateSource = useUpdateSource();
  const deleteSource = useDeleteSource();
  const { messages, sendMessage, isLoading: isChatLoading, error: chatError, abort } = useAIChat();

  const [uploadingFiles, setUploadingFiles] = React.useState<UploadingFile[]>([]);
  const { addToast } = useToast();

  const sources = sourcesResponse?.data ?? [];

  const handleUploadFiles = React.useCallback(
    async (files: File[]): Promise<void> => {
      await Promise.allSettled(
        files.map(async (file) => {
          const id = `upload-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
          setUploadingFiles((prev) => [...prev, { id, fileName: file.name, stage: 'scanning' }]);
          try {
            await uploadSource.mutateAsync({
              file,
              onProgress: (stage) => {
                setUploadingFiles((prev) => prev.map((u) => (u.id === id ? { ...u, stage } : u)));
              },
            });
            addToast({ title: `"${file.name}" uploaded successfully`, variant: 'success' });
          } catch {
            addToast({ title: `Failed to upload "${file.name}"`, variant: 'error' });
          } finally {
            setUploadingFiles((prev) => prev.filter((u) => u.id !== id));
          }
        })
      );
    },
    [uploadSource]
  );

  const handleAccessChange = React.useCallback(
    (sourceId: string, accessLevel: AccessLevel): void => {
      updateSource.mutate({ id: sourceId, accessLevel }, {
        onSuccess: () => addToast({ title: 'Access level updated', variant: 'success' }),
        onError: () => addToast({ title: 'Failed to update access level', variant: 'error' }),
      });
    },
    [updateSource]
  );

  const handleDeleteSource = React.useCallback(
    (sourceId: string): void => {
      deleteSource.mutate(sourceId, {
        onSuccess: () => addToast({ title: 'Source deleted', variant: 'success' }),
        onError: () => addToast({ title: 'Failed to delete source', variant: 'error' }),
      });
    },
    [deleteSource]
  );

  // Bridge SourceCitation (useAIChat) → SourceAttribution (ChatInterfaceMessage)
  const chatMessages = React.useMemo(
    (): ChatInterfaceMessage[] =>
      messages.map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        timestamp: m.timestamp,
        ...(m.isStreaming !== undefined && { isStreaming: m.isStreaming }),
        ...(m.citations !== undefined && {
          sources: m.citations.map((c) => ({
            sourceId: c.sourceId,
            fileName: c.sourceName,
            chunkPreview: c.exactQuote,
          })),
        }),
      })),
    [messages]
  );

  return (
    <div className="h-full flex flex-col p-6">
      <div className="mb-4 flex-shrink-0">
        <h1 className="text-2xl font-bold text-foreground">AI Knowledge Base</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage policy documents and test the HR AI assistant
        </p>
      </div>
      <AIKnowledgeManager
        className="flex-1 min-h-0"
        sources={sources}
        isSourcesLoading={isSourcesLoading}
        onUploadFiles={handleUploadFiles}
        onAccessChange={handleAccessChange}
        onDeleteSource={handleDeleteSource}
        uploadingFiles={uploadingFiles}
        chatMessages={chatMessages}
        onSendChatMessage={sendMessage}
        isChatLoading={isChatLoading}
        chatError={chatError?.message ?? null}
        onAbortChat={abort}
      />
    </div>
  );
}
