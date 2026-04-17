import '@/lib/pdf-parse-polyfill';
import { createRequire } from 'node:module';
import { chunkDocument, generateBatchEmbeddings } from '@hr-portal/ai';
import { type NextRequest, NextResponse } from 'next/server';
import { getAdminClient, getAuthedSupabase, isAiAdmin } from '../../_lib';

const require = createRequire(import.meta.url);

// Ensure Node.js runtime (required for pdfjs-dist)
export const runtime = 'nodejs';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'text/markdown',
];

const ALLOWED_EXTENSIONS = ['.pdf', '.doc', '.docx', '.txt', '.md'];

const AI_KNOWLEDGE_BUCKET = 'ai-knowledge';

function getFileExtension(filename: string): string {
  const lastDot = filename.lastIndexOf('.');
  return lastDot >= 0 ? filename.slice(lastDot).toLowerCase() : '';
}

/** Map file extension to the knowledge_source_type DB enum */
function getKnowledgeSourceType(filename: string): 'pdf' | 'docx' | 'txt' {
  const ext = getFileExtension(filename);
  switch (ext) {
    case '.pdf':
      return 'pdf';
    case '.doc':
    case '.docx':
      return 'docx';
    case '.txt':
    case '.md':
      return 'txt';
    default:
      return 'pdf';
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user, role, error: authError } = await getAuthedSupabase();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isAiAdmin(role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const title = formData.get('title') as string | null;
    const description = formData.get('description') as string | null;
    const tagsRaw = formData.get('tags') as string | null;
    const accessLevelRaw = formData.get('access_level') as string | null;

    // Validate file presence
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File size exceeds 10MB limit' }, { status: 400 });
    }

    // Validate file type by MIME and extension
    const extension = getFileExtension(file.name);
    if (!ALLOWED_MIME_TYPES.includes(file.type) && !ALLOWED_EXTENSIONS.includes(extension)) {
      return NextResponse.json(
        {
          error: 'File type not allowed. Accepted types: PDF, DOC, DOCX, TXT, MD',
        },
        { status: 400 }
      );
    }

    // Validate required fields
    if (!title || title.trim().length === 0) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    const sourceType = getKnowledgeSourceType(file.name);
    const accessLevel = accessLevelRaw === 'admin' ? 'admin' : 'all';

    const tags: string[] = tagsRaw
      ? tagsRaw
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean)
      : [];

    const adminClient = getAdminClient();

    // Ensure the storage bucket exists (creates if missing)
    const { error: bucketCheckError } = await adminClient.storage.getBucket(AI_KNOWLEDGE_BUCKET);
    if (bucketCheckError) {
      await adminClient.storage.createBucket(AI_KNOWLEDGE_BUCKET, {
        public: false,
        fileSizeLimit: MAX_FILE_SIZE,
        allowedMimeTypes: ALLOWED_MIME_TYPES,
      });
    }

    // Generate unique file path
    const timestamp = Date.now();
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filePath = `knowledge-sources/${sourceType}/${timestamp}_${sanitizedFileName}`;

    // Upload file to Supabase Storage
    const fileBuffer = await file.arrayBuffer();
    const { data: uploadData, error: uploadError } = await adminClient.storage
      .from(AI_KNOWLEDGE_BUCKET)
      .upload(filePath, fileBuffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error('Error uploading knowledge file to storage:', uploadError);
      return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 });
    }

    // Create knowledge_sources record
    const { data: sourceData, error: sourceError } = await adminClient
      .from('knowledge_sources')
      .insert({
        title: title.trim(),
        source_type: sourceType,
        file_path: uploadData.path,
        is_active: true,
        created_by: user.id,
        description: description?.trim() || null,
        file_name: file.name,
        file_size: file.size,
        mime_type: file.type,
        tags,
        processing_status: 'pending',
        access_level: accessLevel,
      })
      .select('*')
      .single();

    if (sourceError || !sourceData) {
      // Rollback: delete uploaded file
      await adminClient.storage.from(AI_KNOWLEDGE_BUCKET).remove([filePath]);
      console.error('Error creating knowledge source record:', sourceError);
      return NextResponse.json(
        { error: 'Failed to create knowledge source record' },
        { status: 500 }
      );
    }

    // ── Extract text & generate embeddings inline ──
    // Fire-and-forget: runs after response is sent on serverful, inline on serverless
    const embedTask = (async () => {
      try {
        const buf = Buffer.from(fileBuffer);
        let rawText = '';

        if (sourceType === 'pdf') {
          const { PDFParse } = require('pdf-parse') as typeof import('pdf-parse');
          const parser = new PDFParse({ data: new Uint8Array(fileBuffer) });
          const textResult = await parser.getText();
          rawText = textResult.text;
          await parser.destroy();
        } else if (sourceType === 'docx') {
          // Strip XML tags for basic DOCX support
          rawText = buf.toString('utf-8')
            .replace(/<[^>]+>/g, ' ')
            .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"').replace(/&nbsp;/g, ' ')
            .replace(/\s+/g, ' ').trim();
        } else {
          // txt / md
          rawText = buf.toString('utf-8');
        }

        if (!rawText || rawText.trim().length < 20) {
          console.warn('Extracted text too short or empty for source:', sourceData.id);
          return;
        }

        const { chunks } = chunkDocument({
          id: sourceData.id,
          content: rawText,
          sourceType: sourceType === 'txt' ? 'manual' : sourceType as 'pdf' | 'docx',
          title: title.trim(),
        });

        if (chunks.length === 0) return;

        const batchResult = await generateBatchEmbeddings(chunks.map((c) => c.content));

        const rows = chunks
          .map((chunk, i) => {
            const result = batchResult.results[i];
            if (!result || result.embedding.length === 0) return null;
            return {
              source_id: sourceData.id,
              chunk_index: chunk.metadata.chunkIndex,
              chunk_text: chunk.content,
              embedding: JSON.stringify(result.embedding),
              metadata: { ...chunk.metadata },
            };
          })
          .filter(Boolean);

        if (rows.length > 0) {
          const { error: embedInsertError } = await adminClient
            .from('knowledge_embeddings')
            .insert(rows);

          if (embedInsertError) {
            console.error('Failed to insert embeddings:', embedInsertError);
            return;
          }
        }

        // Update status to ready
        await adminClient
          .from('knowledge_sources')
          .update({ processing_status: 'ready' })
          .eq('id', sourceData.id);
      } catch (embedError) {
        console.error('Embedding generation failed for source', sourceData.id, embedError);
        await adminClient
          .from('knowledge_sources')
          .update({ processing_status: 'error' })
          .eq('id', sourceData.id);
      }
    })();

    // On serverless (Vercel), we await to prevent early termination
    await embedTask;

    // Log to audit_logs
    await adminClient.from('audit_logs').insert({
      table_name: 'knowledge_sources',
      record_id: sourceData.id,
      operation: 'INSERT',
      performed_by: user.id,
      action: 'upload_knowledge_source',
      metadata: {
        title: title.trim(),
        source_type: sourceType,
        file_name: file.name,
        file_size: file.size,
      },
    });

    // Re-fetch to get the final processing_status (updated by embed task above)
    const { data: finalData } = await adminClient
      .from('knowledge_sources')
      .select('*')
      .eq('id', sourceData.id)
      .single();

    const src = finalData ?? sourceData;

    // Transform to KnowledgeSource shape for frontend
    const fileTypeMap: Record<string, string> = { pdf: 'pdf', docx: 'docx', txt: 'txt' };
    const response = {
      id: src.id,
      fileName: src.file_name ?? src.title,
      fileType: fileTypeMap[src.source_type] ?? 'pdf',
      uploadedAt: src.created_at,
      uploadedBy: src.created_by ?? 'system',
      status: src.processing_status ?? 'ready',
      accessLevel: src.access_level ?? 'all',
      title: src.title,
      description: src.description,
      sourceType: src.source_type,
      filePath: src.file_path,
      tags: src.tags ?? [],
      isActive: src.is_active,
    };

    return NextResponse.json({ data: response }, { status: 201 });
  } catch (error) {
    console.error('Unexpected error in POST /api/ai/sources/upload:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
