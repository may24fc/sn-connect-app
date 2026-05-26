# @hr-portal/ai

AI utilities for the Control Hub HR Portal — embeddings, RAG chat, and document chunking.

## Installation

Available via pnpm workspaces:

```typescript
import { chat, chatStream, generateEmbedding, chunkDocument } from '@hr-portal/ai';
```

## Modules

### Embeddings (`embeddings.ts`)

Generate vector embeddings using OpenAI `text-embedding-3-small` (1536 dimensions).

```typescript
import { generateEmbedding, generateBatchEmbeddings, cosineSimilarity } from '@hr-portal/ai';

const result = await generateEmbedding('Leave policy for probationary employees');
// result.embedding: number[] (1536 dims)

const similarity = cosineSimilarity(embeddingA, embeddingB);
// 0.0 to 1.0

const tokenEstimate = estimateTokenCount('Some text...');
```

### Chat (`chat.ts`)

RAG-powered chat with Anthropic Claude (`claude-sonnet-4-5-20250929`).

```typescript
import { chat, chatStream, chatWithoutContext } from '@hr-portal/ai';

// Single response
const response = await chat({
  message: 'What is the leave policy?',
  context: retrievedChunks,
  conversationHistory: [],
});

// Streaming via SSE
const stream = chatStream({
  message: 'Explain the onboarding process',
  context: retrievedChunks,
});
```

**Types:**

| Type | Description |
|------|-------------|
| `ChatMessage` | `{ role: ChatRole; content: string }` |
| `RetrievedContext` | Matched knowledge chunks with similarity scores |
| `ChatResponse` | Full response with content and source citations |
| `ChatStreamEvent` | SSE event: `text_delta` or `message_stop` |

### Chunking (`chunking.ts`)

Document chunking for the RAG pipeline.

```typescript
import { chunkDocument, chunkDocuments, extractText } from '@hr-portal/ai';

const chunks = chunkDocument({
  content: 'Long document text...',
  sourceType: 'policy',
  metadata: { title: 'Leave Policy' },
});

// Each chunk has: content, metadata, tokenCount
```

**Source types:** `policy`, `handbook`, `faq`, `procedure`, `guideline`, `other`

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `ANTHROPIC_API_KEY` | Yes | Claude API key (`sk-ant-*`) |
| `OPENAI_API_KEY` | Yes | OpenAI API key (embeddings only) |
