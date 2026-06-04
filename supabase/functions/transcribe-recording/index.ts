import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';
import { createClient } from '@supabase/supabase-js';
import { validateAdminAuthFlexible } from '../_shared/auth.ts';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface StandupRecording {
  id: string;
  title: string;
  file_path: string;
  transcript: string | null;
  summary: string | null;
}

interface WebhookPayload {
  type: 'INSERT';
  table: string;
  record: StandupRecording;
  schema: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAX_TRANSCRIPT_LENGTH = 50_000; // chars

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ---------------------------------------------------------------------------
// Supabase client (service role - bypasses RLS)
// ---------------------------------------------------------------------------

function getSupabaseAdmin() {
  const url = Deno.env.get('SUPABASE_URL');
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  }
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

// ---------------------------------------------------------------------------
// Whisper transcription via OpenAI API
// ---------------------------------------------------------------------------

async function transcribeAudio(audioBytes: Uint8Array, filename: string): Promise<string> {
  const apiKey = Deno.env.get('OPENAI_API_KEY');

  if (!apiKey) {
    console.warn('OPENAI_API_KEY not configured. Skipping transcription.');
    return '[Transcription unavailable - OPENAI_API_KEY not configured]';
  }

  try {
    const formData = new FormData();
    formData.append('file', new Blob([audioBytes], { type: 'audio/mpeg' }), filename);
    formData.append('model', 'whisper-1');
    formData.append('response_format', 'text');

    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: formData,
      signal: AbortSignal.timeout(300_000), // 5 minutes for large audio files
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Whisper API error (${response.status}): ${errorBody}`);
    }

    // Whisper returns plain text when response_format is 'text'
    return await response.text();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error(`Transcription failed: ${message}`);
    return `[Transcription failed: ${message}]`;
  }
}

// ---------------------------------------------------------------------------
// Summary generation via Anthropic Claude API
// ---------------------------------------------------------------------------

async function generateSummary(transcript: string): Promise<string> {
  const apiKey = Deno.env.get('ANTHROPIC_API_KEY');

  if (!apiKey) {
    console.warn('ANTHROPIC_API_KEY not configured. Skipping summary generation.');
    return '[Summary unavailable - ANTHROPIC_API_KEY not configured]';
  }

  try {
    const prompt = `Summarize the following stand-up meeting transcript in 3-5 bullet points. Focus on key decisions, blockers, and action items:\n\n${transcript.slice(0, 10_000)}`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens_to_sample: 1024,
        messages: [{ role: 'user', content: prompt }],
      }),
      signal: AbortSignal.timeout(60_000),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Claude API error (${response.status}): ${errorBody}`);
    }

    const result = await response.json();
    return result.content?.[0]?.text ?? '[Summary could not be extracted from response]';
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error(`Summary generation failed: ${message}`);
    return `[Summary generation failed: ${message}]`;
  }
}

// ---------------------------------------------------------------------------
// Main processing pipeline
// ---------------------------------------------------------------------------

async function processRecording(recordingId: string): Promise<{ status: string }> {
  const supabase = getSupabaseAdmin();

  // 1. Fetch the recording record
  const { data: recording, error: fetchError } = await supabase
    .from('standup_recordings')
    .select('id, title, file_path, transcript, summary')
    .eq('id', recordingId)
    .single();

  if (fetchError || !recording) {
    throw new Error(`Recording not found: ${fetchError?.message ?? recordingId}`);
  }

  // 2. Skip if already transcribed
  if (recording.transcript) {
    console.log(`Recording ${recordingId} already has a transcript. Skipping.`);
    return { status: 'already_processed' };
  }

  try {
    // 3. Download audio from standup-recordings bucket
    const { data: audioData, error: downloadError } = await supabase.storage
      .from('standup-recordings')
      .download(recording.file_path);

    if (downloadError || !audioData) {
      throw new Error(`Failed to download audio: ${downloadError?.message ?? 'unknown'}`);
    }

    const audioBytes = new Uint8Array(await audioData.arrayBuffer());
    const filename = recording.file_path.split('/').pop() ?? 'recording.mp3';

    console.log(`Processing recording ${recordingId}: ${filename} (${audioBytes.length} bytes)`);

    // 4. Transcribe audio via OpenAI Whisper
    let transcript = await transcribeAudio(audioBytes, filename);

    // Truncate if too long
    if (transcript.length > MAX_TRANSCRIPT_LENGTH) {
      console.warn(
        `Transcript truncated from ${transcript.length} to ${MAX_TRANSCRIPT_LENGTH} chars`
      );
      transcript = transcript.slice(0, MAX_TRANSCRIPT_LENGTH);
    }

    // 5. Generate summary via Claude
    const summary = await generateSummary(transcript);

    // 6. Update recording with transcript and summary
    const { error: updateError } = await supabase
      .from('standup_recordings')
      .update({
        transcript,
        summary,
        updated_at: new Date().toISOString(),
      })
      .eq('id', recordingId);

    if (updateError) {
      throw new Error(`Failed to update recording: ${updateError.message}`);
    }

    // 7. Log to audit_logs
    await supabase.from('audit_logs').insert({
      action: 'transcribe_recording',
      table_name: 'standup_recordings',
      record_id: recordingId,
      changes: {
        transcript_length: transcript.length,
        has_summary: summary.length > 0,
        filename,
      },
    });

    console.log(`Completed transcription for recording ${recordingId}`);

    return { status: 'completed' };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';

    // Log failure to audit_logs
    await supabase.from('audit_logs').insert({
      action: 'transcribe_recording_failed',
      table_name: 'standup_recordings',
      record_id: recordingId,
      changes: { error: message },
    });

    throw error;
  }
}

// ---------------------------------------------------------------------------
// HTTP handler
// ---------------------------------------------------------------------------

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Validate admin authentication (service role key or admin secret)
    const auth = await validateAdminAuthFlexible(req);
    if (!auth.ok) {
      return new Response(JSON.stringify({ error: auth.error }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();

    // Support both webhook payload (INSERT trigger) and direct invocation
    let recordingId: string;

    if (body.type === 'INSERT' && body.record?.id) {
      // Database webhook trigger
      recordingId = body.record.id as string;
    } else if (body.recording_id) {
      // Direct invocation
      recordingId = body.recording_id as string;
    } else {
      return new Response(
        JSON.stringify({
          error: 'Invalid payload. Provide webhook payload or { recording_id }',
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processing standup recording: ${recordingId}`);

    const result = await processRecording(recordingId);

    console.log(`Result for recording ${recordingId}: ${result.status}`);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error(`Edge function error: ${message}`);

    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
