# AI Knowledge Components Reference

> Audience: Developers

AI knowledge base management UI — source management, chat interface, upload, and debug tools.

**Location:** `packages/ui/src/components/ai-knowledge/`  
**Import:** `import { AIKnowledgeManager, ChatInterface, UploadZone, ... } from '@hr-portal/ui';`  
**Types:** `packages/ui/src/types/ai-knowledge.types.ts`

---

## Type Definitions

Key types from `ai-knowledge.types.ts`:

```typescript
type FileStatus = 'uploading' | 'processing' | 'ready' | 'error';
type AccessLevel = 'public' | 'admin_only';

interface KnowledgeSource {
  id: string;
  title: string;
  content: string;
  sourceType: 'policy' | 'handbook' | 'faq' | 'procedure' | 'guideline' | 'other';
  isActive: boolean;
  filePath?: string;
  sourceUrl?: string;
  chunkCount?: number;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  sources?: SourceAttribution[];
}

interface SourceAttribution {
  title: string;
  sourceType: string;
  relevance: number;
}
```

---

## AIKnowledgeManager

Main management interface with tabbed layout: Knowledge Base, Playground, Settings.

```typescript
interface AIKnowledgeManagerProps {
  sources: KnowledgeSource[];
  onSourceCreate: (data: SourceFormData) => void;
  onSourceUpdate: (id: string, data: Partial<SourceFormData>) => void;
  onSourceDelete: (id: string) => void;
  onFileUpload: (file: File) => Promise<void>;
}
```

---

## KnowledgeBasePanel

Knowledge source list and management panel with search, filters, and CRUD actions.

```typescript
interface KnowledgeBasePanelProps {
  sources: KnowledgeSource[];
  isLoading?: boolean;
  onEdit: (source: KnowledgeSource) => void;
  onDelete: (id: string) => void;
  onToggleActive: (id: string, isActive: boolean) => void;
}
```

---

## PlaygroundPanel

Interactive chat playground for testing AI responses against the knowledge base.

```typescript
interface PlaygroundPanelProps {
  onSendMessage: (message: string) => Promise<string>;
  messages?: ChatMessage[];
}
```

---

## ChatInterface

Conversational chat UI with message list, input field, and streaming response support.

```typescript
interface ChatInterfaceProps {
  messages: ChatInterfaceMessage[];
  onSend: (message: string) => void;
  isLoading?: boolean;
  placeholder?: string;
}
```

---

## ChatMessage

Individual message bubble. User messages right-aligned, assistant messages left-aligned with source attributions.

```typescript
interface ChatMessageProps {
  message: ChatMessage;
  isStreaming?: boolean;
}
```

---

## SourcesInventory

Full-featured table for managing knowledge sources. Columns: title, type, status, chunks, actions.

```typescript
interface SourcesInventoryProps {
  sources: KnowledgeSource[];
  onEdit: (source: KnowledgeSource) => void;
  onDelete: (id: string) => void;
}
```

---

## SourceRow

Single row in the sources table showing title, type badge, active toggle, chunk count, and action menu.

---

## SourceFilters

Filter controls for sources: search, type dropdown, active/inactive toggle.

```typescript
interface SourceFiltersProps {
  value: FilterOption;
  onChange: (value: FilterOption) => void;
}
```

---

## UploadZone

Drag-and-drop file upload area. Accepts PDF, DOC, DOCX, TXT, MD (10MB max).

```typescript
interface UploadZoneProps {
  onFileSelect: (file: File) => void;
  accept?: string;
  maxSize?: number;
  isUploading?: boolean;
}
```

---

## UploadProgress

File upload progress indicator with filename, percentage, and cancel button.

```typescript
interface UploadProgressProps {
  fileName: string;
  progress: number;
  status: FileStatus;
  onCancel?: () => void;
}
```

---

## AccessToggle

Toggle switch for enabling/disabling a knowledge source.

```typescript
interface AccessToggleProps {
  isActive: boolean;
  onChange: (isActive: boolean) => void;
  disabled?: boolean;
}
```

---

## DebugPanel

Developer-only panel showing RAG context: matched chunks, similarity scores, and embedding metadata.

```typescript
interface DebugPanelProps {
  context?: {
    chunks: { content: string; similarity: number; source: string }[];
    queryEmbedding?: number[];
  };
}
```

---

*Last updated: 2026-02-27*
