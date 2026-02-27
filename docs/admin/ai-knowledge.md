# AI Knowledge Base Management

This guide covers managing the knowledge sources that power the AI HR Assistant.

## Overview

The AI Assistant uses **Retrieval-Augmented Generation (RAG)** to answer employee questions. When someone asks a question:

1. The question is converted to an embedding (vector representation)
2. The system searches the knowledge base for relevant content
3. Matching documents are passed to the AI as context
4. The AI generates an answer grounded in your company's actual policies

**You control what the AI knows** by managing knowledge sources on this page.

## AI Knowledge Page (`/admin/ai-knowledge`)

The page has two panels:

| Panel | Description |
|-------|-------------|
| **Knowledge Base** | Manage sources — upload, edit, enable/disable |
| **Playground** | Test the AI with questions to verify responses |

## Knowledge Sources

### Source Types

| Type | Description |
|------|-------------|
| `policy` | Company policies (leave, attendance, conduct) |
| `handbook` | Employee handbook sections |
| `faq` | Frequently asked questions and answers |
| `procedure` | Standard operating procedures |
| `guideline` | Guidelines and best practices |
| `other` | Miscellaneous reference material |

### Viewing Sources

The Knowledge Base panel shows all sources with:

- Source name and type badge
- Status indicator (enabled / disabled)
- Upload date
- File size
- Action menu

### Filtering Sources

- **Search** by name or content
- **Type filter** — Filter by source type
- **Status filter** — Enabled or Disabled

## Uploading Knowledge

1. Click the **upload area** or drag and drop files
2. Supported formats:

| Format | Extension |
|--------|-----------|
| PDF | `.pdf` |
| Word | `.doc`, `.docx` |
| Plain text | `.txt` |
| Markdown | `.md` |

3. Maximum file size: **10 MB**
4. Enter a name and select the source type
5. Click **Upload**

### What Happens After Upload

1. The file is stored in the `ai-knowledge` storage bucket
2. A Supabase Edge Function (`generate-embeddings`) processes the file:
   - Splits the content into chunks
   - Generates vector embeddings using OpenAI `text-embedding-3-small`
   - Stores embeddings in the database for fast similarity search
3. The source becomes available to the AI immediately after processing

### Upload Progress

A progress indicator shows the upload and processing status for each file.

## Enabling / Disabling Sources

Toggle the **access switch** on any source to control whether the AI can use it:

- **Enabled** — The AI will reference this source when answering questions
- **Disabled** — The source is preserved but excluded from AI responses

This is useful for temporarily removing outdated policies while you prepare updates.

## Editing Sources

Click a source to edit:

- Name
- Type
- Re-upload the file (regenerates embeddings)

## Deleting Sources

Delete a source to permanently remove:

- The source record
- The uploaded file
- All associated embeddings

## Testing with the Playground

The Playground panel lets you verify the AI's responses:

1. Switch to the **Playground** tab
2. Type a question in the chat input
3. The AI responds using your knowledge base
4. Check that the answer is accurate and references the correct sources

### Debug Panel

Enable the debug panel to see:

- Which knowledge sources were matched
- Similarity scores for each match
- The raw context sent to the AI

This helps you identify:

- Missing knowledge — questions the AI can't answer
- Low-quality matches — sources that aren't being retrieved correctly
- Overlapping content — duplicated information across sources

## Best Practices

1. **Keep sources focused** — One policy per file produces better matches than large combined documents
2. **Use descriptive names** — "Leave Policy 2026" is better than "policy.pdf"
3. **Update regularly** — When policies change, upload the new version and disable the old one
4. **Test after changes** — Use the Playground to verify the AI gives correct answers with updated sources
5. **Cover common questions** — Upload FAQ documents for the most frequent employee questions

---

Next: [Super Admin Features](super-admin.md) · Previous: [Resources](resources.md)
