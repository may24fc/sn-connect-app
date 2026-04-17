import { generateBatchEmbeddings } from '@hr-portal/ai';
import { chunkText } from '@hr-portal/ai/drive-chunking';
import { createSupabaseAdminClient } from '@/lib/supabase/server';
import { inngest } from '../client';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function buildDriveMetadata({
  existingMetadata,
  fileId,
  modifiedTime,
  syncedAt,
}: {
  existingMetadata: unknown;
  fileId: string;
  modifiedTime: string;
  syncedAt: string;
}): Record<string, unknown> {
  return {
    ...(isRecord(existingMetadata) ? existingMetadata : {}),
    google_drive_file_id: fileId,
    google_drive_modified_time: modifiedTime,
    google_drive_synced_at: syncedAt,
  };
}

export const processDriveDoc = inngest.createFunction(
  {
    id: 'process-drive-doc',
    retries: 3,
    throttle: { limit: 5, period: '1m' },
  },
  { event: 'drive/document.updated' },
  async ({ event, step }) => {
    const { fileId } = event.data;

    const docText = await step.run('fetch-google-doc', async () => {
      const { google } = await import('googleapis');
      const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
      const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(
        /\\n/g,
        '\n',
      );

      if (!clientEmail || !privateKey) {
        throw new Error('Missing GOOGLE_SERVICE_ACCOUNT_EMAIL or GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY');
      }

      const auth = new google.auth.GoogleAuth({
        credentials: {
          client_email: clientEmail,
          private_key: privateKey,
        },
        scopes: ['https://www.googleapis.com/auth/drive.readonly'],
      });

      const drive = google.drive({ version: 'v3', auth });

      const meta = await drive.files.get({
        fileId,
        fields: 'id,name,mimeType,modifiedTime',
      });

      const mimeType = meta.data.mimeType ?? '';

      if (mimeType !== 'application/vnd.google-apps.document') {
        throw new Error(
          `Unsupported MIME type: ${mimeType}. Only Google Docs are supported.`,
        );
      }

      const exported = await drive.files.export({
        fileId,
        mimeType: 'text/plain',
      });

      const text =
        typeof exported.data === 'string'
          ? exported.data
          : String(exported.data ?? '');

      return {
        text,
        title: meta.data.name ?? `Google Doc ${fileId}`,
        modifiedTime: meta.data.modifiedTime ?? new Date().toISOString(),
      };
    });

    if (!docText.text || docText.text.trim().length < 20) {
      return { status: 'skipped', reason: 'Document text too short' };
    }

    const chunks = await step.run('chunk-text', () => {
      return chunkText(docText.text, { chunkSize: 1000, overlap: 200 });
    });

    if (chunks.length === 0) {
      return { status: 'skipped', reason: 'No chunks produced' };
    }

    const batchResult = await step.run('generate-embeddings', async () => {
      return generateBatchEmbeddings(chunks.map((c) => c.text));
    });

    const result = await step.run('upsert-vectors', async () => {
      const supabase = createSupabaseAdminClient();
      const syncedAt = new Date().toISOString();

      const { data: existingSource } = await supabase
        .from('knowledge_sources')
        .select('id, metadata')
        .eq('metadata->>google_drive_file_id', fileId)
        .is('deleted_at', null)
        .maybeSingle();

      let sourceId: string;

      if (existingSource) {
        sourceId = existingSource.id;
        const { error: updateError } = await supabase
          .from('knowledge_sources')
          .update({
            title: docText.title,
            content: docText.text,
            processing_status: 'indexing',
            metadata: buildDriveMetadata({
              existingMetadata: existingSource.metadata,
              fileId,
              modifiedTime: docText.modifiedTime,
              syncedAt,
            }),
            updated_at: new Date().toISOString(),
          })
          .eq('id', sourceId);

        if (updateError)
          throw new Error(`Failed to update source: ${updateError.message}`);
      } else {
        const { data: newSource, error: insertError } = await supabase
          .from('knowledge_sources')
          .insert({
            title: docText.title,
            source_type: 'url',
            url: `https://docs.google.com/document/d/${fileId}`,
            content: docText.text,
            is_active: true,
            processing_status: 'indexing',
            access_level: 'all',
            metadata: buildDriveMetadata({
              existingMetadata: null,
              fileId,
              modifiedTime: docText.modifiedTime,
              syncedAt,
            }),
          })
          .select('id')
          .single();

        if (insertError || !newSource) {
          throw new Error(
            `Failed to create source: ${insertError?.message}`,
          );
        }
        sourceId = newSource.id;
      }

      const { error: deleteError } = await supabase
        .from('knowledge_embeddings')
        .delete()
        .eq('source_id', sourceId);

      if (deleteError)
        throw new Error(
          `Failed to delete old embeddings: ${deleteError.message}`,
        );

      const rows = chunks
        .map((chunk, i) => {
          const embeddingResult = batchResult.results[i];
          if (!embeddingResult || embeddingResult.embedding.length === 0)
            return null;
          return {
            source_id: sourceId,
            chunk_index: chunk.index,
            chunk_text: chunk.text,
            embedding: JSON.stringify(embeddingResult.embedding),
            metadata: {
              startOffset: chunk.startOffset,
              endOffset: chunk.endOffset,
              google_drive_file_id: fileId,
            },
          };
        })
        .filter((row): row is NonNullable<typeof row> => row !== null);

      if (rows.length > 0) {
        const { error: embedError } = await supabase
          .from('knowledge_embeddings')
          .insert(rows);

        if (embedError)
          throw new Error(
            `Failed to insert embeddings: ${embedError.message}`,
          );
      }

      await supabase
        .from('knowledge_sources')
        .update({ processing_status: 'ready' })
        .eq('id', sourceId);

      await supabase.from('audit_logs').insert({
        table_name: 'knowledge_sources',
        record_id: sourceId,
        operation: 'UPDATE',
        action: 'drive_document_sync',
        metadata: {
          google_drive_file_id: fileId,
          title: docText.title,
          chunks_count: rows.length,
          total_tokens: batchResult.totalTokens,
        },
      });

      return { sourceId, chunksInserted: rows.length };
    });

    return {
      status: 'processed',
      fileId,
      title: docText.title,
      sourceId: result.sourceId,
      chunksInserted: result.chunksInserted,
    };
  },
);
