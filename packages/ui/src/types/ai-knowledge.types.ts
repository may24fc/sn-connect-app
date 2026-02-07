export type FileStatus = 'scanning' | 'chunking' | 'indexing' | 'ready' | 'error';
export type AccessLevel = 'all' | 'admin';
export type FileType = 'pdf' | 'docx' | 'txt' | 'xlsx';

export interface KnowledgeSource {
  id: string;
  fileName: string;
  fileType: FileType;
  uploadedAt: Date;
  uploadedBy: string;
  status: FileStatus;
  accessLevel: AccessLevel;
  pageCount?: number;
  errorMessage?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  sources?: SourceAttribution[];
}

export interface SourceAttribution {
  sourceId: string;
  fileName: string;
  pageNumber?: number;
  chunkPreview?: string;
}

export interface UploadProgress {
  fileId: string;
  fileName: string;
  stage: FileStatus;
  progress: number;
}

export type FilterOption = 'all' | 'ready' | 'indexing' | 'error';
