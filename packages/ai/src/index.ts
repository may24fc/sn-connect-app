export {
  generateEmbedding,
  generateBatchEmbeddings,
  cosineSimilarity,
  estimateTokenCount,
  type EmbeddingConfig,
  type EmbeddingResult,
  type BatchEmbeddingResult,
} from './embeddings';

export {
  chat,
  chatStream,
  chatWithoutContext,
  type ChatRole,
  type ChatMessage,
  type RetrievedContext,
  type ChatConfig,
  type SourceCitation,
  type ChatResponse,
  type ChatStreamEvent,
} from './chat';

export {
  chunkDocument,
  chunkDocuments,
  extractText,
  type DocumentSourceType,
  type ChunkingConfig,
  type ChunkMetadata,
  type DocumentChunk,
  type DocumentInput,
  type ChunkingResult,
} from './chunking';

export {
  chunkText,
  type ChunkTextOptions,
  type TextChunk,
} from './drive-chunking';

export {
  extractProjectIntake,
  transcribeVoice,
  type IntakeExtractionResult,
  type IntakeExtractionConfig,
  type VoiceTranscriptionConfig,
} from './intake';

export {
  extractReceiptFromImage,
  extractReceiptFromText,
  type ReceiptExtractionResult,
  type ReceiptExtractionConfig,
  type ReceiptExtractionFieldConfidence,
} from './receipt';
