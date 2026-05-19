import OpenAI from 'openai';

/**
 * Structured payload returned by the LLM extraction step. Mirrors the
 * `project_backlog` insert shape (minus DB-managed columns).
 */
export interface IntakeExtractionResult {
  title: string;
  problem_statement: string;
  objective: string;
  technical_scope: string[];
  target_departments: string[];
  priority: 'Low' | 'Medium' | 'High' | 'Urgent';
  /** Optional name hint the CEO used (e.g. "Cef", "Franz"). */
  assigned_name_hint: string | null;
  /** Model identifier that produced the structured response. */
  model: string;
}

export interface IntakeExtractionConfig {
  apiKey?: string;
  /** Defaults to gpt-4o-mini. */
  model?: string;
}

export interface VoiceTranscriptionConfig {
  apiKey?: string;
  /** Defaults to whisper-1. */
  model?: string;
}

const DEFAULT_EXTRACTION_MODEL = 'gpt-4o-mini';
const DEFAULT_TRANSCRIPTION_MODEL = 'whisper-1';

const SYSTEM_PROMPT = `You are a project intake assistant for an HR portal.
The CEO speaks/writes informally; convert their message into a structured project brief.

Rules:
- title: <= 80 chars, action-oriented (e.g. "Build resume parser dashboard").
- problem_statement: WHAT problem this solves, 1–2 sentences.
- objective: WHAT success looks like, 1–2 sentences.
- technical_scope: array of short tech/domain tags (e.g. ["Next.js", "Supabase", "RAG"]). Empty array if none mentioned.
- target_departments: array of departments hinted at (e.g. ["Engineering", "Marketing"]). Empty array if unspecified.
- priority: one of "Low" | "Medium" | "High" | "Urgent". Default "Medium" unless urgency is implied.
- assigned_name_hint: the informal first name / nickname of the person the CEO assigns it to, if any (e.g. "Cef", "Franz", "Kazz"). Use null if no one is named.

Never invent details that are not implied by the message. Prefer concise wording.`;

const RESPONSE_JSON_SCHEMA = {
  name: 'project_intake',
  strict: true,
  schema: {
    type: 'object',
    additionalProperties: false,
    properties: {
      title: { type: 'string' },
      problem_statement: { type: 'string' },
      objective: { type: 'string' },
      technical_scope: { type: 'array', items: { type: 'string' } },
      target_departments: { type: 'array', items: { type: 'string' } },
      priority: { type: 'string', enum: ['Low', 'Medium', 'High', 'Urgent'] },
      assigned_name_hint: { type: ['string', 'null'] },
    },
    required: [
      'title',
      'problem_statement',
      'objective',
      'technical_scope',
      'target_departments',
      'priority',
      'assigned_name_hint',
    ],
  },
} as const;

function getClient(apiKey?: string): OpenAI {
  const key = apiKey || process.env['OPENAI_API_KEY'];
  if (!key) {
    throw new Error('OPENAI_API_KEY is not configured');
  }
  return new OpenAI({ apiKey: key });
}

/**
 * Extracts a structured project brief from a free-text CEO message using a
 * JSON-schema-constrained LLM call.
 */
export async function extractProjectIntake(
  message: string,
  config: IntakeExtractionConfig = {}
): Promise<IntakeExtractionResult> {
  const client = getClient(config.apiKey);
  const model = config.model ?? DEFAULT_EXTRACTION_MODEL;

  const response = await client.chat.completions.create({
    model,
    temperature: 0.2,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: message },
    ],
    response_format: {
      type: 'json_schema',
      json_schema: RESPONSE_JSON_SCHEMA,
    },
  });

  const raw = response.choices[0]?.message?.content;
  if (!raw) {
    throw new Error('LLM returned empty intake response');
  }

  let parsed: Omit<IntakeExtractionResult, 'model'>;
  try {
    parsed = JSON.parse(raw) as Omit<IntakeExtractionResult, 'model'>;
  } catch (error) {
    throw new Error(`Failed to parse intake JSON: ${(error as Error).message}`);
  }

  return { ...parsed, model };
}

/**
 * Transcribes a voice message (typically downloaded from Telegram) into text
 * using Whisper. Accepts a File or Blob compatible with the OpenAI SDK.
 */
export async function transcribeVoice(
  file: File | Blob,
  filename: string,
  config: VoiceTranscriptionConfig = {}
): Promise<string> {
  const client = getClient(config.apiKey);
  const model = config.model ?? DEFAULT_TRANSCRIPTION_MODEL;

  // OpenAI SDK accepts File. Normalise Blob -> File for compatibility.
  const upload =
    file instanceof File ? file : new File([file], filename, { type: file.type || 'audio/ogg' });

  const result = await client.audio.transcriptions.create({
    model,
    file: upload,
  });

  return result.text.trim();
}
