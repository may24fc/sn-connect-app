'use client';

import { useAuth } from '@/contexts/AuthContext';
import {
  useDocuments,
  useDownloadDocument,
  usePreviewDocument,
  useUploadDocument,
} from '@/hooks/useDocuments';
import { useEmployees } from '@/hooks/useEmployees';
import type { Document } from '@hr-portal/database';
import {
  Badge,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  FileDropZone,
  FullScreenPreview,
  useToast,
} from '@hr-portal/ui';
import {
  Download,
  Eye,
  FileImage,
  FileSpreadsheet,
  FileText,
  LayoutGrid,
  List,
  Loader2,
  Presentation,
  Upload,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

const MAX_FILES = 5;

interface PreviewState {
  url: string;
  fileName: string;
  mimeType: string | null;
}

/** Pick a colour palette based on mime type */
function getDocColorScheme(mimeType: string | null) {
  if (!mimeType)
    return {
      bg: 'bg-zinc-100 dark:bg-zinc-800',
      accent: 'bg-zinc-300 dark:bg-zinc-600',
      text: 'text-zinc-500 dark:text-zinc-400',
      border: 'border-zinc-200 dark:border-zinc-700',
    };
  if (mimeType === 'application/pdf')
    return {
      bg: 'bg-red-50 dark:bg-red-950/30',
      accent: 'bg-red-200 dark:bg-red-800/40',
      text: 'text-red-500 dark:text-red-400',
      border: 'border-red-200 dark:border-red-800/50',
    };
  if (mimeType.startsWith('image/'))
    return {
      bg: 'bg-purple-50 dark:bg-purple-950/30',
      accent: 'bg-purple-200 dark:bg-purple-800/40',
      text: 'text-purple-500 dark:text-purple-400',
      border: 'border-purple-200 dark:border-purple-800/50',
    };
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel') || mimeType.includes('.sheet'))
    return {
      bg: 'bg-emerald-50 dark:bg-emerald-950/30',
      accent: 'bg-emerald-200 dark:bg-emerald-800/40',
      text: 'text-emerald-600 dark:text-emerald-400',
      border: 'border-emerald-200 dark:border-emerald-800/50',
    };
  if (mimeType.includes('presentation') || mimeType.includes('powerpoint'))
    return {
      bg: 'bg-orange-50 dark:bg-orange-950/30',
      accent: 'bg-orange-200 dark:bg-orange-800/40',
      text: 'text-orange-500 dark:text-orange-400',
      border: 'border-orange-200 dark:border-orange-800/50',
    };
  if (mimeType.includes('word') || mimeType.includes('document'))
    return {
      bg: 'bg-blue-50 dark:bg-blue-950/30',
      accent: 'bg-blue-200 dark:bg-blue-800/40',
      text: 'text-blue-500 dark:text-blue-400',
      border: 'border-blue-200 dark:border-blue-800/50',
    };
  return {
    bg: 'bg-zinc-100 dark:bg-zinc-800',
    accent: 'bg-zinc-300 dark:bg-zinc-600',
    text: 'text-zinc-500 dark:text-zinc-400',
    border: 'border-zinc-200 dark:border-zinc-700',
  };
}

function getDocIcon(mimeType: string | null) {
  if (!mimeType) return FileText;
  if (mimeType.startsWith('image/')) return FileImage;
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel') || mimeType.includes('.sheet'))
    return FileSpreadsheet;
  if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return Presentation;
  return FileText;
}

function getFileExtension(mimeType: string | null): string {
  if (!mimeType) return 'FILE';
  const map: Record<string, string> = {
    'application/pdf': 'PDF',
    'image/jpeg': 'JPG',
    'image/png': 'PNG',
    'image/gif': 'GIF',
    'application/msword': 'DOC',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'DOCX',
    'application/vnd.ms-excel': 'XLS',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'XLSX',
    'application/vnd.ms-powerpoint': 'PPT',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'PPTX',
  };
  return map[mimeType] || mimeType.split('/')[1]?.toUpperCase() || 'FILE';
}

function formatFileSize(bytes: number | null): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

function formatDate(date: string): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(date));
}

export default function FilesPage() {
  const { user } = useAuth();
  const [uploadOpen, setUploadOpen] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<Array<File>>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewData, setPreviewData] = useState<PreviewState | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'cards' | 'list'>('cards');
  const [thumbnails, setThumbnails] = useState<Record<string, string>>({});
  const { addToast } = useToast();

  // Fetch the current user's employee record by user_id
  const { data: empLookup } = useEmployees({
    userId: user?.id,
    pageSize: 1,
  });
  const employee = empLookup?.data?.[0] ?? null;

  const { data: docsData, isLoading } = useDocuments({
    employeeId: employee?.id,
  });

  const upload = useUploadDocument();
  const download = useDownloadDocument();
  const preview = usePreviewDocument();

  const documents = docsData?.data ?? [];

  const handleFilesSelected = useCallback((files: Array<File>) => {
    setSelectedFiles((prev) => {
      const combined = [...prev, ...files];
      // Limit to MAX_FILES
      return combined.slice(0, MAX_FILES);
    });
  }, []);

  const handleRemoveFile = useCallback((index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleUpload = async () => {
    if (selectedFiles.length === 0 || !employee?.id) return;

    setIsUploading(true);
    try {
      // Upload all files sequentially
      for (const file of selectedFiles) {
        await upload.mutateAsync({
          file,
          employeeId: employee.id,
          documentType: 'other',
          isConfidential: false,
        });
      }
      setUploadOpen(false);
      setSelectedFiles([]);
      addToast({ title: `${selectedFiles.length} document${selectedFiles.length > 1 ? 's' : ''} uploaded`, variant: 'success' });
    } catch {
      addToast({ title: 'Failed to upload documents', variant: 'error' });
    } finally {
      setIsUploading(false);
    }
  };

  const handleCloseDialog = () => {
    if (!isUploading) {
      setUploadOpen(false);
      setSelectedFiles([]);
    }
  };

  const handlePreview = async (documentId: string) => {
    setPreviewLoading(true);
    try {
      const data = await preview.mutateAsync(documentId);
      setPreviewData(data);
      setPreviewOpen(true);
    } catch {
      addToast({ title: 'Failed to load preview', variant: 'error' });
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleClosePreview = () => {
    setPreviewOpen(false);
    setPreviewData(null);
  };

  const canPreview = (mimeType: string | null): boolean => {
    if (!mimeType) return false;
    return mimeType === 'application/pdf' || mimeType.startsWith('image/');
  };

  const handleKeyDown = (e: React.KeyboardEvent, documentId: string, mimeType: string | null) => {
    if ((e.key === 'Enter' || e.key === ' ') && canPreview(mimeType)) {
      e.preventDefault();
      handlePreview(documentId);
    }
  };

  // Pre-fetch thumbnail URLs for previewable documents (images and PDFs)
  useEffect(() => {
    if (documents.length === 0) return;
    const previewable = documents.filter(
      (d: Document) => canPreview(d.mime_type) && !thumbnails[d.id]
    );
    if (previewable.length === 0) return;

    let cancelled = false;
    (async () => {
      for (const doc of previewable) {
        if (cancelled) break;
        try {
          const data = await preview.mutateAsync(doc.id);
          if (!cancelled) {
            setThumbnails((prev) => ({ ...prev, [doc.id]: data.url }));
          }
        } catch {
          // Silently skip failed thumbnail fetches
        }
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documents.length]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">My Documents</h1>
        <p className="text-sm text-muted-foreground">Manage and upload your employment documents</p>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">
            {documents.length} document{documents.length !== 1 ? 's' : ''}
          </span>
          {/* View Toggle */}
          <div className="inline-flex items-center rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 p-0.5">
            <button
              type="button"
              onClick={() => setViewMode('cards')}
              className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                viewMode === 'cards'
                  ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-50 shadow-sm'
                  : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300'
              }`}
            >
              <LayoutGrid className="h-3.5 w-3.5" strokeWidth={1.5} />
              Cards
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                viewMode === 'list'
                  ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-50 shadow-sm'
                  : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300'
              }`}
            >
              <List className="h-3.5 w-3.5" strokeWidth={1.5} />
              List
            </button>
          </div>
        </div>
        <Button onClick={() => setUploadOpen(true)} size="sm">
          <Upload className="mr-2 h-4 w-4" />
          Upload
        </Button>
      </div>

      {/* Documents Content */}
      {isLoading ? (
        viewMode === 'cards' ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {[1, 2, 3, 4].map((n) => (
              <div
                key={n}
                className="rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden animate-pulse"
              >
                <div className="h-40 bg-zinc-100 dark:bg-zinc-800" />
                <div className="p-3.5 space-y-2">
                  <div className="h-4 w-3/4 bg-zinc-200 dark:bg-zinc-700 rounded" />
                  <div className="h-3 w-1/2 bg-zinc-100 dark:bg-zinc-800 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-4">
              <div className="space-y-3">
                {[1, 2, 3, 4].map((n) => (
                  <div key={n} className="flex items-center gap-3 animate-pulse">
                    <div className="h-10 w-10 rounded-lg bg-zinc-100 dark:bg-zinc-800" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-4 w-1/3 bg-zinc-200 dark:bg-zinc-700 rounded" />
                      <div className="h-3 w-1/4 bg-zinc-100 dark:bg-zinc-800 rounded" />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )
      ) : documents.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <FileText className="h-12 w-12 text-muted-foreground/40 mb-3" />
            <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">No documents yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Upload your first document to get started
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={() => setUploadOpen(true)}
            >
              <Upload className="h-4 w-4 mr-2" />
              Upload Document
            </Button>
          </CardContent>
        </Card>
      ) : viewMode === 'cards' ? (
        /* ── Cards View (Google Docs-style) ─────────────────────── */
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {documents.map((d: Document) => {
            const colors = getDocColorScheme(d.mime_type);
            const Icon = getDocIcon(d.mime_type);
            const ext = getFileExtension(d.mime_type);
            const thumb = thumbnails[d.id];
            const isImage = d.mime_type?.startsWith('image/');

            return (
              <button
                key={d.id}
                type="button"
                className={`group relative rounded-xl border ${colors.border} bg-white dark:bg-zinc-900 overflow-hidden text-left transition-all hover:shadow-md hover:border-indigo-300 dark:hover:border-indigo-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500`}
                onDoubleClick={() =>
                  canPreview(d.mime_type) ? handlePreview(d.id) : download.mutateAsync(d.id)
                }
                onKeyDown={(e) => handleKeyDown(e, d.id, d.mime_type)}
              >
                {/* Thumbnail / Preview Area */}
                <div
                  className={`relative h-40 ${colors.bg} flex items-center justify-center overflow-hidden`}
                >
                  {thumb && isImage ? (
                    <img
                      src={thumb}
                      alt={d.file_name}
                      className="w-full h-full object-cover transition-transform group-hover:scale-105"
                    />
                  ) : thumb && d.mime_type === 'application/pdf' ? (
                    // PDF: show faded preview lines to mimic document
                    <div className="w-full h-full flex flex-col items-center justify-start pt-4 px-5 gap-1.5 overflow-hidden">
                      <div className={`w-full h-1.5 ${colors.accent} rounded-full opacity-60`} />
                      <div className={`w-11/12 h-1.5 ${colors.accent} rounded-full opacity-50`} />
                      <div className={`w-full h-1.5 ${colors.accent} rounded-full opacity-40`} />
                      <div className={`w-10/12 h-1.5 ${colors.accent} rounded-full opacity-35`} />
                      <div className={`w-full h-1.5 ${colors.accent} rounded-full opacity-30`} />
                      <div className={`w-9/12 h-1.5 ${colors.accent} rounded-full opacity-25`} />
                      <div className={`w-full h-1.5 ${colors.accent} rounded-full opacity-20`} />
                      <div className={`w-11/12 h-1.5 ${colors.accent} rounded-full opacity-15`} />
                      <Icon className={`h-8 w-8 ${colors.text} mt-2 opacity-40`} />
                    </div>
                  ) : (
                    // Generic document icon with lines pattern
                    <div className="w-full h-full flex flex-col items-center justify-start pt-4 px-5 gap-1.5 overflow-hidden">
                      <div className={`w-full h-1.5 ${colors.accent} rounded-full opacity-50`} />
                      <div className={`w-10/12 h-1.5 ${colors.accent} rounded-full opacity-40`} />
                      <div className={`w-full h-1.5 ${colors.accent} rounded-full opacity-30`} />
                      <div className={`w-9/12 h-1.5 ${colors.accent} rounded-full opacity-25`} />
                      <div className={`w-full h-1.5 ${colors.accent} rounded-full opacity-20`} />
                      <Icon className={`h-10 w-10 ${colors.text} mt-3 opacity-50`} />
                    </div>
                  )}

                  {/* Overlay on hover */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 dark:group-hover:bg-white/5 transition-colors" />

                  {/* Extension badge — hides on hover, replaced by download button */}
                  <span
                    className={`absolute top-2.5 right-2.5 px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide ${colors.bg} ${colors.text} border ${colors.border} transition-opacity group-hover:opacity-0`}
                  >
                    {ext}
                  </span>

                  {/* Download button — appears top-right on hover */}
                  <button
                    type="button"
                    title="Download"
                    className="absolute top-2 right-2 z-10 h-7 w-7 rounded-md bg-white/90 dark:bg-zinc-900/90 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm hover:bg-white dark:hover:bg-zinc-800"
                    onClick={(e) => {
                      e.stopPropagation();
                      download.mutateAsync(d.id);
                    }}
                  >
                    <Download className="h-3.5 w-3.5 text-zinc-600 dark:text-zinc-300" />
                  </button>

                  {/* Confidential badge */}
                  {d.is_confidential && (
                    <span className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded text-[10px] font-medium bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-700">
                      Confidential
                    </span>
                  )}
                </div>

                {/* Meta */}
                <div className="p-3.5">
                  <h3
                    className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate"
                    title={d.file_name}
                  >
                    {d.file_name}
                  </h3>
                  <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                    <span>{formatDate(d.uploaded_at)}</span>
                    {d.file_size ? (
                      <>
                        <span className="text-zinc-300 dark:text-zinc-600">·</span>
                        <span>{formatFileSize(d.file_size)}</span>
                      </>
                    ) : null}
                  </div>


                </div>
              </button>
            );
          })}
        </div>
      ) : (
        /* ── List View ──────────────────────────────────────────── */
        <Card>
          <CardContent className="p-0">
            <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {documents.map((d: Document) => {
                const colors = getDocColorScheme(d.mime_type);
                const Icon = getDocIcon(d.mime_type);
                const ext = getFileExtension(d.mime_type);

                return (
                  <button
                    key={d.id}
                    type="button"
                    className="flex w-full items-center justify-between px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-500"
                    onDoubleClick={() =>
                      canPreview(d.mime_type) ? handlePreview(d.id) : download.mutateAsync(d.id)
                    }
                    onKeyDown={(e) => handleKeyDown(e, d.id, d.mime_type)}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`flex-shrink-0 h-10 w-10 rounded-lg ${colors.bg} flex items-center justify-center`}
                      >
                        <Icon className={`h-5 w-5 ${colors.text}`} />
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
                          {d.file_name}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                          <span className={`font-medium ${colors.text}`}>{ext}</span>
                          <span className="text-zinc-300 dark:text-zinc-600">·</span>
                          <span>{formatDate(d.uploaded_at)}</span>
                          {d.file_size ? (
                            <>
                              <span className="text-zinc-300 dark:text-zinc-600">·</span>
                              <span>{formatFileSize(d.file_size)}</span>
                            </>
                          ) : null}
                        </div>
                      </div>
                    </div>
                    <div
                      className="flex items-center gap-1.5 flex-shrink-0"
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) => e.stopPropagation()}
                    >
                      {d.is_confidential && (
                        <Badge variant="outline" className="text-[10px]">
                          Confidential
                        </Badge>
                      )}
                      {canPreview(d.mime_type) && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => handlePreview(d.id)}
                          disabled={previewLoading}
                          title="Preview"
                        >
                          {previewLoading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => download.mutateAsync(d.id)}
                        title="Download"
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={uploadOpen} onOpenChange={handleCloseDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Documents</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <FileDropZone
              onFilesSelected={handleFilesSelected}
              accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,image/jpeg,image/png,image/gif"
              maxSizeMB={10}
              multiple
              maxFiles={MAX_FILES}
              selectedFiles={selectedFiles}
              onRemoveFile={handleRemoveFile}
              isUploading={isUploading}
              formatHint={`PDF, Word, Excel, PowerPoint, Images — max 10 MB each (up to ${MAX_FILES} files)`}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog} disabled={isUploading}>
              Cancel
            </Button>
            <Button
              onClick={handleUpload}
              disabled={selectedFiles.length === 0 || !employee?.id || isUploading}
            >
              {isUploading
                ? 'Uploading...'
                : `Upload ${selectedFiles.length > 0 ? `(${selectedFiles.length})` : ''}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Document Preview - Full Screen */}
      <FullScreenPreview
        open={previewOpen}
        onClose={handleClosePreview}
        url={previewData?.url ?? null}
        fileName={previewData?.fileName || 'Document'}
        mimeType={previewData?.mimeType ?? null}
        isLoading={previewLoading}
      />
    </div>
  );
}
