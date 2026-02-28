import { type DocumentFilters, queryKeys } from '@/lib/query-keys';
import type { Document } from '@hr-portal/database';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

interface DocumentListResponse {
  data: Array<Document>;
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

interface UploadDocumentParams {
  file: File;
  employeeId: string;
  documentType: string;
  isConfidential?: boolean;
  notes?: string;
}

interface DownloadDocumentResponse {
  url: string;
  fileName: string;
  mimeType: string | null;
}

/**
 * Hook to fetch list of documents with pagination and filters
 */
export function useDocuments(filters: DocumentFilters = {}) {
  return useQuery({
    queryKey: queryKeys.documents.list(filters),
    queryFn: async (): Promise<DocumentListResponse> => {
      const params = new URLSearchParams();

      if (filters.search) params.append('search', filters.search);
      if (filters.employeeId) params.append('employeeId', filters.employeeId);
      if (filters.documentType) params.append('documentType', filters.documentType);
      if (filters.isConfidential !== undefined)
        params.append('isConfidential', filters.isConfidential.toString());
      if (filters.page) params.append('page', filters.page.toString());
      if (filters.pageSize) params.append('pageSize', filters.pageSize.toString());

      const response = await fetch(`/api/documents?${params.toString()}`);

      if (!response.ok) {
        throw new Error('Failed to fetch documents');
      }

      return response.json();
    },
  });
}

/**
 * Hook to upload a document
 */
export function useUploadDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: UploadDocumentParams): Promise<{ data: Document }> => {
      const formData = new FormData();
      formData.append('file', params.file);
      formData.append('employeeId', params.employeeId);
      formData.append('documentType', params.documentType);
      formData.append(
        'isConfidential',
        params.isConfidential !== undefined ? params.isConfidential.toString() : 'false'
      );
      if (params.notes) {
        formData.append('notes', params.notes);
      }

      const response = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to upload document');
      }

      return response.json();
    },
    onSuccess: () => {
      // Invalidate all document queries to refetch data
      queryClient.invalidateQueries({ queryKey: queryKeys.documents.all });
    },
  });
}

/**
 * Hook to get document preview URL (without auto-downloading)
 */
export function usePreviewDocument() {
  return useMutation({
    mutationFn: async (documentId: string): Promise<DownloadDocumentResponse> => {
      const response = await fetch(`/api/documents/${documentId}/download`);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to generate preview URL');
      }

      return response.json();
    },
  });
}

/**
 * Hook to download a document (generates signed URL)
 */
export function useDownloadDocument() {
  return useMutation({
    mutationFn: async (documentId: string): Promise<DownloadDocumentResponse> => {
      const response = await fetch(`/api/documents/${documentId}/download`);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to generate download URL');
      }

      const data: DownloadDocumentResponse = await response.json();

      // Automatically trigger download
      const link = document.createElement('a');
      link.href = data.url;
      link.download = data.fileName;
      link.click();

      return data;
    },
  });
}
