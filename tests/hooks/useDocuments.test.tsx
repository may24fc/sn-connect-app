import { useDocuments, useDownloadDocument, useUploadDocument } from '@/hooks/useDocuments';
import type { Document } from '@hr-portal/database';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock fetch globally
global.fetch = vi.fn();

// Helper to create a wrapper with QueryClient
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });

  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

// Mock document data
const mockDocument: Document = {
  id: 'doc-123',
  employee_id: 'emp-123',
  document_type: 'resume',
  file_name: 'resume.pdf',
  file_path: 'emp-123/documents/resume.pdf',
  file_size: 1024000,
  mime_type: 'application/pdf',
  is_confidential: false,
  notes: 'Updated resume',
  uploaded_by: 'user-123',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  deleted_at: null,
};

const mockDocumentListResponse = {
  data: [mockDocument],
  pagination: {
    page: 1,
    pageSize: 10,
    total: 1,
    totalPages: 1,
  },
};

describe('useDocuments', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch documents list successfully', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => mockDocumentListResponse,
    });

    const { result } = renderHook(() => useDocuments(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(mockDocumentListResponse);
    expect(global.fetch).toHaveBeenCalledWith('/api/documents?');
  });

  it('should apply search filter', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => mockDocumentListResponse,
    });

    const { result } = renderHook(() => useDocuments({ search: 'resume' }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(global.fetch).toHaveBeenCalledWith('/api/documents?search=resume');
  });

  it('should apply employeeId filter', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => mockDocumentListResponse,
    });

    const { result } = renderHook(() => useDocuments({ employeeId: 'emp-123' }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(global.fetch).toHaveBeenCalledWith('/api/documents?employeeId=emp-123');
  });

  it('should apply documentType filter', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => mockDocumentListResponse,
    });

    const { result } = renderHook(() => useDocuments({ documentType: 'resume' }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(global.fetch).toHaveBeenCalledWith('/api/documents?documentType=resume');
  });

  it('should apply isConfidential filter', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => mockDocumentListResponse,
    });

    const { result } = renderHook(() => useDocuments({ isConfidential: true }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(global.fetch).toHaveBeenCalledWith('/api/documents?isConfidential=true');
  });

  it('should apply pagination parameters', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => mockDocumentListResponse,
    });

    const { result } = renderHook(() => useDocuments({ page: 2, pageSize: 20 }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(global.fetch).toHaveBeenCalledWith('/api/documents?page=2&pageSize=20');
  });

  it('should apply multiple filters', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => mockDocumentListResponse,
    });

    const { result } = renderHook(
      () =>
        useDocuments({
          search: 'resume',
          employeeId: 'emp-123',
          documentType: 'resume',
          isConfidential: false,
          page: 1,
          pageSize: 10,
        }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(global.fetch).toHaveBeenCalledWith(
      '/api/documents?search=resume&employeeId=emp-123&documentType=resume&isConfidential=false&page=1&pageSize=10'
    );
  });

  it('should handle fetch error', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    const { result } = renderHook(() => useDocuments(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toEqual(new Error('Failed to fetch documents'));
  });
});

describe('useUploadDocument', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should upload document successfully', async () => {
    const mockFile = new File(['content'], 'test.pdf', { type: 'application/pdf' });
    const mockResponse = { data: mockDocument };

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const { result } = renderHook(() => useUploadDocument(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({
      file: mockFile,
      employeeId: 'emp-123',
      documentType: 'resume',
      isConfidential: false,
      notes: 'Test upload',
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(mockResponse);
    expect(global.fetch).toHaveBeenCalledWith('/api/documents/upload', {
      method: 'POST',
      body: expect.any(FormData),
    });
  });

  it('should handle upload with minimal params', async () => {
    const mockFile = new File(['content'], 'test.pdf', { type: 'application/pdf' });
    const mockResponse = { data: mockDocument };

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const { result } = renderHook(() => useUploadDocument(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({
      file: mockFile,
      employeeId: 'emp-123',
      documentType: 'resume',
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(mockResponse);
  });

  it('should handle upload error with custom message', async () => {
    const mockFile = new File(['content'], 'test.pdf', { type: 'application/pdf' });

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'File too large' }),
    });

    const { result } = renderHook(() => useUploadDocument(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({
      file: mockFile,
      employeeId: 'emp-123',
      documentType: 'resume',
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toEqual(new Error('File too large'));
  });

  it('should handle upload error without custom message', async () => {
    const mockFile = new File(['content'], 'test.pdf', { type: 'application/pdf' });

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      json: async () => ({}),
    });

    const { result } = renderHook(() => useUploadDocument(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({
      file: mockFile,
      employeeId: 'emp-123',
      documentType: 'resume',
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toEqual(new Error('Failed to upload document'));
  });

  it('should handle file size validation error', async () => {
    const largeContent = new Array(11 * 1024 * 1024).fill('a').join(''); // 11MB
    const mockFile = new File([largeContent], 'large.pdf', { type: 'application/pdf' });

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'File size exceeds 10MB limit' }),
    });

    const { result } = renderHook(() => useUploadDocument(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({
      file: mockFile,
      employeeId: 'emp-123',
      documentType: 'resume',
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toEqual(new Error('File size exceeds 10MB limit'));
  });

  it('should handle invalid file type error', async () => {
    const mockFile = new File(['content'], 'test.exe', { type: 'application/x-msdownload' });

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Invalid file type' }),
    });

    const { result } = renderHook(() => useUploadDocument(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({
      file: mockFile,
      employeeId: 'emp-123',
      documentType: 'resume',
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toEqual(new Error('Invalid file type'));
  });
});

describe('useDownloadDocument', () => {
  let mockAnchor: { href: string; download: string; click: ReturnType<typeof vi.fn> };
  let originalCreateElement: typeof document.createElement;

  beforeEach(() => {
    vi.clearAllMocks();

    // Save original createElement
    originalCreateElement = document.createElement;

    // Mock anchor element for download
    mockAnchor = {
      href: '',
      download: '',
      click: vi.fn(),
    };

    // Mock createElement only for 'a' tags
    document.createElement = vi.fn((tagName: string) => {
      if (tagName === 'a') {
        return mockAnchor as unknown as HTMLAnchorElement;
      }
      return originalCreateElement.call(document, tagName);
    }) as typeof document.createElement;
  });

  afterEach(() => {
    // Restore original createElement
    document.createElement = originalCreateElement;
  });

  it('should generate download URL successfully', async () => {
    const mockDownloadResponse = {
      url: 'https://storage.example.com/document.pdf?signed=true',
      fileName: 'resume.pdf',
      mimeType: 'application/pdf',
    };

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => mockDownloadResponse,
    });

    const { result } = renderHook(() => useDownloadDocument(), {
      wrapper: createWrapper(),
    });

    result.current.mutate('doc-123');

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(mockDownloadResponse);
    expect(global.fetch).toHaveBeenCalledWith('/api/documents/doc-123/download');
    expect(document.createElement).toHaveBeenCalledWith('a');
  });

  it('should trigger automatic download', async () => {
    const mockDownloadResponse = {
      url: 'https://storage.example.com/document.pdf?signed=true',
      fileName: 'resume.pdf',
      mimeType: 'application/pdf',
    };

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => mockDownloadResponse,
    });

    const { result } = renderHook(() => useDownloadDocument(), {
      wrapper: createWrapper(),
    });

    result.current.mutate('doc-123');

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockAnchor.href).toBe(mockDownloadResponse.url);
    expect(mockAnchor.download).toBe(mockDownloadResponse.fileName);
    expect(mockAnchor.click).toHaveBeenCalled();
  });

  it('should handle download error with custom message', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Document not found' }),
    });

    const { result } = renderHook(() => useDownloadDocument(), {
      wrapper: createWrapper(),
    });

    result.current.mutate('doc-404');

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toEqual(new Error('Document not found'));
  });

  it('should handle download error without custom message', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      json: async () => ({}),
    });

    const { result } = renderHook(() => useDownloadDocument(), {
      wrapper: createWrapper(),
    });

    result.current.mutate('doc-404');

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toEqual(new Error('Failed to generate download URL'));
  });

  it('should handle access denied error', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Access denied' }),
    });

    const { result } = renderHook(() => useDownloadDocument(), {
      wrapper: createWrapper(),
    });

    result.current.mutate('doc-forbidden');

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toEqual(new Error('Access denied'));
  });
});
