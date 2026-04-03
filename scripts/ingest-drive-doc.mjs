// Usage:
//   node scripts/ingest-drive-doc.mjs <FILE_ID_OR_GOOGLE_DOC_URL>
//   node scripts/ingest-drive-doc.mjs <FILE_ID> --state=change
//   node scripts/ingest-drive-doc.mjs <FILE_ID_OR_GOOGLE_DOC_URL> --direct
//
// This script force-triggers the existing /api/webhooks/drive endpoint,
// which then emits the drive/document.updated Inngest event.
//
// The --direct mode bypasses Inngest and writes source + embeddings directly.

import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { getDriveClient, loadWebEnv } from './_drive-watch-utils.mjs';

loadWebEnv();

function printUsageAndExit() {
  console.error(
    'Usage: node scripts/ingest-drive-doc.mjs <FILE_ID_OR_GOOGLE_DOC_URL> [--state=update|change] [--direct]'
  );
  process.exit(1);
}

function parseFlag(name, argv) {
  const match = argv.find((value) => value.startsWith(`--${name}=`));
  return match ? match.split('=')[1] : undefined;
}

function extractFileId(input) {
  const value = String(input || '').trim();
  if (!value) return null;

  const docUrlMatch = /docs\.google\.com\/document\/d\/([A-Za-z0-9_-]+)/.exec(value);
  if (docUrlMatch?.[1]) {
    return docUrlMatch[1];
  }

  const driveApiMatch = /\/files\/([A-Za-z0-9_-]+)/.exec(value);
  if (driveApiMatch?.[1]) {
    return driveApiMatch[1];
  }

  return /^[A-Za-z0-9_-]{10,}$/.test(value) ? value : null;
}

function chunkText(text, chunkSize = 1000, overlap = 200) {
  const normalized = String(text ?? '');
  const chunks = [];
  let start = 0;
  let index = 0;

  while (start < normalized.length) {
    const end = Math.min(start + chunkSize, normalized.length);
    const slice = normalized.slice(start, end).trim();
    if (slice.length > 0) {
      chunks.push({
        index,
        text: slice,
        startOffset: start,
        endOffset: end,
      });
      index += 1;
    }

    if (end >= normalized.length) break;
    start = Math.max(0, end - overlap);
  }

  return chunks;
}

async function generateEmbedding(apiKey, text) {
  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'text-embedding-3-small',
      input: text,
      dimensions: 1536,
    }),
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(`OpenAI embedding failed (${response.status}): ${JSON.stringify(payload)}`);
  }

  const embedding = payload?.data?.[0]?.embedding;
  if (!Array.isArray(embedding) || embedding.length === 0) {
    throw new Error('OpenAI embedding response missing vector.');
  }

  return embedding;
}

async function runDirectIngest(fileId) {
  const openAiKey = process.env.OPENAI_API_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!openAiKey) {
    throw new Error('Missing OPENAI_API_KEY for --direct mode.');
  }

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL and/or SUPABASE_SERVICE_ROLE_KEY for --direct mode.');
  }

  const drive = getDriveClient();
  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const meta = await drive.files.get({
    fileId,
    fields: 'id,name,mimeType,modifiedTime',
  });

  const mimeType = meta.data.mimeType ?? '';
  if (mimeType !== 'application/vnd.google-apps.document') {
    throw new Error(`Unsupported MIME type: ${mimeType}. Only Google Docs are supported.`);
  }

  const exported = await drive.files.export({
    fileId,
    mimeType: 'text/plain',
  });

  const text = typeof exported.data === 'string' ? exported.data : String(exported.data ?? '');
  if (text.trim().length < 20) {
    throw new Error('Exported document text is too short to index.');
  }

  const title = meta.data.name ?? `Google Doc ${fileId}`;
  const chunks = chunkText(text, 1000, 200);
  if (chunks.length === 0) {
    throw new Error('No chunks produced from document text.');
  }

  const { data: existingSource } = await supabase
    .from('knowledge_sources')
    .select('id')
    .contains('metadata', { google_drive_file_id: fileId })
    .is('deleted_at', null)
    .maybeSingle();

  let sourceId;

  if (existingSource?.id) {
    sourceId = existingSource.id;
    const { error: updateError } = await supabase
      .from('knowledge_sources')
      .update({
        title,
        content: text,
        processing_status: 'indexing',
        updated_at: new Date().toISOString(),
      })
      .eq('id', sourceId);

    if (updateError) {
      throw new Error(`Failed to update source: ${updateError.message}`);
    }
  } else {
    const { data: created, error: insertError } = await supabase
      .from('knowledge_sources')
      .insert({
        title,
        source_type: 'url',
        url: `https://docs.google.com/document/d/${fileId}`,
        content: text,
        is_active: true,
        processing_status: 'indexing',
        access_level: 'all',
        metadata: { google_drive_file_id: fileId },
      })
      .select('id')
      .single();

    if (insertError || !created?.id) {
      throw new Error(`Failed to create source: ${insertError?.message ?? 'unknown error'}`);
    }

    sourceId = created.id;
  }

  const { error: deleteError } = await supabase
    .from('knowledge_embeddings')
    .delete()
    .eq('source_id', sourceId);

  if (deleteError) {
    throw new Error(`Failed to delete old embeddings: ${deleteError.message}`);
  }

  const rows = [];

  for (const chunk of chunks) {
    const embedding = await generateEmbedding(openAiKey, chunk.text);
    rows.push({
      source_id: sourceId,
      chunk_index: chunk.index,
      chunk_text: chunk.text,
      embedding: JSON.stringify(embedding),
      metadata: {
        startOffset: chunk.startOffset,
        endOffset: chunk.endOffset,
        google_drive_file_id: fileId,
      },
    });
  }

  if (rows.length > 0) {
    const { error: embedError } = await supabase
      .from('knowledge_embeddings')
      .insert(rows);

    if (embedError) {
      throw new Error(`Failed to insert embeddings: ${embedError.message}`);
    }
  }

  const { error: readyError } = await supabase
    .from('knowledge_sources')
    .update({ processing_status: 'ready' })
    .eq('id', sourceId);

  if (readyError) {
    throw new Error(`Failed to set source as ready: ${readyError.message}`);
  }

  await supabase.from('audit_logs').insert({
    table_name: 'knowledge_sources',
    record_id: sourceId,
    operation: 'UPDATE',
    action: 'drive_document_sync',
    metadata: {
      google_drive_file_id: fileId,
      title,
      chunks_count: rows.length,
      total_tokens_estimate: Math.ceil(text.length / 4),
      ingest_mode: 'manual_direct',
    },
  });

  return {
    sourceId,
    title,
    chunksInserted: rows.length,
  };
}

const args = process.argv.slice(2);
const target = args.find((value) => !value.startsWith('--'));
if (!target) {
  printUsageAndExit();
}

const fileId = extractFileId(target);
if (!fileId) {
  console.error('Could not extract a valid Google Drive file ID from input.');
  printUsageAndExit();
}

const webhookBaseUrl = process.env.WEBHOOK_BASE_URL;
const webhookToken = process.env.GOOGLE_DRIVE_WEBHOOK_TOKEN;
const resourceState = parseFlag('state', args) ?? 'update';
const directMode = args.includes('--direct');

if (directMode) {
  const result = await runDirectIngest(fileId);
  console.log(
    JSON.stringify(
      {
        ok: true,
        mode: 'direct',
        fileId,
        sourceId: result.sourceId,
        title: result.title,
        chunksInserted: result.chunksInserted,
        note: 'Document indexed directly into knowledge_sources + knowledge_embeddings.',
      },
      null,
      2,
    ),
  );
  process.exit(0);
}

if (!webhookBaseUrl) {
  console.error('Missing WEBHOOK_BASE_URL (expected in apps/web/.env.local).');
  process.exit(1);
}

if (!webhookToken) {
  console.error('Missing GOOGLE_DRIVE_WEBHOOK_TOKEN (expected in apps/web/.env.local).');
  process.exit(1);
}

if (!['update', 'change'].includes(resourceState)) {
  console.error('Invalid --state value. Allowed values: update, change.');
  process.exit(1);
}

const channelId = `manual-ingest-${fileId}-${randomUUID().slice(0, 8)}`;
const resourceId = `manual-resource-${randomUUID()}`;
const resourceUri = `https://www.googleapis.com/drive/v3/files/${fileId}`;
const webhookUrl = `${webhookBaseUrl.replace(/\/$/, '')}/api/webhooks/drive`;

const response = await fetch(webhookUrl, {
  method: 'POST',
  headers: {
    'x-goog-channel-token': webhookToken,
    'x-goog-resource-state': resourceState,
    'x-goog-resource-id': resourceId,
    'x-goog-channel-id': channelId,
    'x-goog-resource-uri': resourceUri,
  },
});

const raw = await response.text();
let parsed;

try {
  parsed = raw ? JSON.parse(raw) : null;
} catch {
  parsed = { raw };
}

if (!response.ok) {
  console.error(
    JSON.stringify(
      {
        ok: false,
        status: response.status,
        statusText: response.statusText,
        fileId,
        webhookUrl,
        response: parsed,
      },
      null,
      2,
    ),
  );
  process.exit(1);
}

console.log(
  JSON.stringify(
    {
      ok: true,
      status: response.status,
      fileId,
      state: resourceState,
      webhookUrl,
      queued: parsed,
      note: 'If queued.status is "queued", Inngest should process the document shortly.',
    },
    null,
    2,
  ),
);
