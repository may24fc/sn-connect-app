import OpenAI from 'openai';
import { NextResponse } from 'next/server';
import {
  getAdminClient,
  getAllowedKnowledgeAccessLevels,
  getAuthedSupabase,
  type KnowledgeAccessLevel,
} from '../_lib';

const FAST_MODEL = 'gpt-4o-mini';
const MAX_SOURCE_COUNT = 8;
const MAX_SUGGESTION_COUNT = 6;

interface KnowledgeSourceRow {
  id: string;
  title: string;
  description: string | null;
  tags: string[] | null;
  source_type: string;
  updated_at: string;
  metadata: Record<string, unknown> | null;
  access_level: KnowledgeAccessLevel;
}

interface KnowledgeChunkRow {
  source_id: string;
  chunk_text: string;
  chunk_index: number;
}

interface CandidateSource {
  id: string;
  title: string;
  description: string;
  tags: string[];
  sourceType: string;
  updatedAt: string;
  snippet: string;
  isGoogleDoc: boolean;
}

interface LiveSyncSource {
  id: string;
  title: string;
  updatedAt: string;
}

interface SuggestedQuestion {
  label: string;
  prompt: string;
}

function hasGoogleDriveSync(metadata: Record<string, unknown> | null): boolean {
  return typeof metadata?.google_drive_file_id === 'string' && metadata.google_drive_file_id.length > 0;
}

function buildLiveSyncPayload(sources: LiveSyncSource[]) {
  const driveSources = sources.filter((source) => source.id.length > 0);

  if (driveSources.length === 0) {
    return null;
  }

  const latestSource = [...driveSources].sort(
    (left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime()
  )[0];

  return {
    hasSyncedGoogleDocs: true,
    syncedDocumentCount: driveSources.length,
    lastSyncedAt: latestSource?.updatedAt ?? null,
    lastSyncedTitle: latestSource?.title ?? null,
  };
}

function scoreCandidate(source: CandidateSource): number {
  const updatedAt = new Date(source.updatedAt).getTime();
  const ageHours = Number.isFinite(updatedAt)
    ? Math.max(0, (Date.now() - updatedAt) / (1000 * 60 * 60))
    : 72;
  const freshnessScore = Math.max(0, 12 - ageHours / 12);

  return freshnessScore + (source.isGoogleDoc ? 6 : 0) + (source.tags.length > 0 ? 1 : 0) + (source.description ? 1 : 0);
}

function trimSentence(value: string, maxLength: number): string {
  const normalized = value.replace(/\s+/g, ' ').trim();
  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, Math.max(0, maxLength - 1)).trimEnd()}?`;
}

function sanitizeQuestion(value: string): string {
  const normalized = value.replace(/\s+/g, ' ').trim();
  const stripped = normalized.replace(/^[-*\d.\s]+/, '').replace(/^"|"$/g, '');
  const punctuated = /[?!.]$/.test(stripped) ? stripped : `${stripped}?`;
  return trimSentence(punctuated, 84);
}

function toSuggestion(prompt: string, _index: number): SuggestedQuestion {
  const sanitized = sanitizeQuestion(prompt);
  return {
    label: trimSentence(sanitized, 56),
    prompt: sanitized,
  };
}

function buildGenericPrompt(source: CandidateSource): string {
  const readableTitle = source.title.replace(/\.(pdf|docx|txt)$/i, '').trim();
  return `Can you summarize ${readableTitle}?`;
}

function buildFallbackSuggestions(sources: CandidateSource[]): SuggestedQuestion[] {
  const prompts: string[] = [];

  for (const source of sources) {
    const haystack = [source.title, source.description, source.tags.join(' '), source.snippet]
      .join(' ')
      .toLowerCase();

    if (/leave|pto|vacation|time off|holiday/.test(haystack)) {
      prompts.push('What does the leave policy cover?');
    }
    if (/benefit|hmo|insurance|health|coverage/.test(haystack)) {
      prompts.push('What benefits are available to employees?');
    }
    if (/payroll|salary|compensation|payslip|pay day/.test(haystack)) {
      prompts.push('How does payroll processing work?');
    }
    if (/onboarding|orientation|new hire|welcome/.test(haystack)) {
      prompts.push('What should I complete during onboarding?');
    }
    if (/remote|hybrid|work from home|wfh/.test(haystack)) {
      prompts.push('What are the remote work guidelines?');
    }
    if (/performance|review|okr|kpi|evaluation/.test(haystack)) {
      prompts.push('How are performance reviews handled?');
    }
    if (/resource|handbook|policy|guide|manual/.test(haystack)) {
      prompts.push(buildGenericPrompt(source));
    }

    if (source.isGoogleDoc) {
      prompts.push(`What should I know from ${source.title.replace(/\.(pdf|docx|txt)$/i, '').trim()}?`);
    }
  }

  if (prompts.length === 0) {
    return sources.slice(0, MAX_SUGGESTION_COUNT).map((source, index) => toSuggestion(buildGenericPrompt(source), index));
  }

  return [...new Set(prompts)]
    .slice(0, MAX_SUGGESTION_COUNT)
    .map((prompt, index) => toSuggestion(prompt, index));
}

async function generateSuggestionsWithAI(sources: CandidateSource[]): Promise<SuggestedQuestion[] | null> {
  const apiKey = process.env.OPENAI_API_KEY ?? '';

  if (!apiKey) {
    return null;
  }

  try {
    const openai = new OpenAI({ apiKey });
    const payload = sources.slice(0, 5).map((source) => ({
      title: source.title,
      description: source.description,
      tags: source.tags,
      snippet: source.snippet,
      sourceType: source.sourceType,
      isGoogleDoc: source.isGoogleDoc,
      updatedAt: source.updatedAt,
    }));

    const completion = await openai.chat.completions.create({
      model: FAST_MODEL,
      temperature: 0.3,
      max_tokens: 350,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content:
            'You create concise first-click suggestion buttons for an internal HR assistant. Return JSON only with the shape {"suggestions":[{"label":"...","prompt":"..."}]}. Generate 4 to 6 short, specific, employee-friendly questions that are answerable from the provided sources. Prefer plain English, avoid duplicates, keep labels under 56 characters, and include at least one suggestion influenced by recent Google Docs when the input marks a source as a Google Doc.',
        },
        {
          role: 'user',
          content: JSON.stringify({ sources: payload }),
        },
      ],
    });

    const rawContent = completion.choices[0]?.message?.content ?? '{}';
    const parsed = JSON.parse(rawContent) as {
      suggestions?: Array<{ label?: string; prompt?: string }>;
    };

    const sanitized = (parsed.suggestions ?? [])
      .map((item, index) => toSuggestion(item.prompt ?? item.label ?? '', index))
      .filter((item) => item.prompt.length > 1);

    if (sanitized.length === 0) {
      return null;
    }

    return sanitized.slice(0, MAX_SUGGESTION_COUNT);
  } catch {
    return null;
  }
}

function dedupeSuggestions(primary: SuggestedQuestion[], fallback: SuggestedQuestion[]) {
  const seen = new Set<string>();

  return [...primary, ...fallback]
    .filter((item) => {
      const key = item.prompt.toLowerCase();
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    })
    .slice(0, MAX_SUGGESTION_COUNT)
    .map((item, index) => ({
      id: `suggestion-${index + 1}`,
      label: item.label,
      prompt: item.prompt,
    }));
}

async function getCandidateSources() {
  const { user, role, error } = await getAuthedSupabase();

  if (error || !user) {
    return { user: null, response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  const adminClient = getAdminClient();
  const allowedAccessLevels = getAllowedKnowledgeAccessLevels(role);

  const { data, error: queryError } = await adminClient
    .from('knowledge_sources')
    .select('id, title, description, tags, source_type, updated_at, metadata, access_level')
    .eq('is_active', true)
    .eq('processing_status', 'ready')
    .is('deleted_at', null)
    .in('access_level', allowedAccessLevels)
    .order('updated_at', { ascending: false })
    .limit(MAX_SOURCE_COUNT);

  if (queryError) {
    return { user, response: NextResponse.json({ error: 'Failed to load AI suggestions' }, { status: 500 }) };
  }

  const sourceRows = ((data ?? []) as KnowledgeSourceRow[]).map((row) => ({
    ...row,
    description: row.description ?? '',
    tags: row.tags ?? [],
  }));

  const { data: liveSyncRows } = await adminClient
    .from('knowledge_sources')
    .select('id, title, updated_at, metadata')
    .eq('is_active', true)
    .eq('processing_status', 'ready')
    .is('deleted_at', null)
    .in('access_level', allowedAccessLevels)
    .order('updated_at', { ascending: false })
    .limit(50);

  const sourceIds = sourceRows.map((row) => row.id);
  const snippetMap = new Map<string, string>();

  if (sourceIds.length > 0) {
    const { data: chunkData } = await adminClient
      .from('knowledge_embeddings')
      .select('source_id, chunk_text, chunk_index')
      .in('source_id', sourceIds)
      .order('chunk_index', { ascending: true })
      .limit(sourceIds.length * 3);

    for (const chunk of (chunkData ?? []) as KnowledgeChunkRow[]) {
      if (!snippetMap.has(chunk.source_id) && chunk.chunk_text.trim()) {
        snippetMap.set(chunk.source_id, trimSentence(chunk.chunk_text, 220));
      }
    }
  }

  const candidates = sourceRows
    .map((row) => ({
      id: row.id,
      title: row.title,
      description: row.description,
      tags: row.tags,
      sourceType: row.source_type,
      updatedAt: row.updated_at,
      snippet: snippetMap.get(row.id) ?? '',
      isGoogleDoc: hasGoogleDriveSync(row.metadata),
    }))
    .sort((left, right) => scoreCandidate(right) - scoreCandidate(left));

  const liveSyncSources = ((liveSyncRows ?? []) as Array<{
    id: string;
    title: string;
    updated_at: string;
    metadata: Record<string, unknown> | null;
  }>)
    .filter((row) => hasGoogleDriveSync(row.metadata))
    .map((row) => ({
      id: row.id,
      title: row.title,
      updatedAt: row.updated_at,
    }));

  return { user, candidates, liveSyncSources, response: null };
}

export async function GET() {
  const candidateResult = await getCandidateSources();

  if (candidateResult.response) {
    return candidateResult.response;
  }

  const candidates = candidateResult.candidates ?? [];
  const liveSync = buildLiveSyncPayload(candidateResult.liveSyncSources ?? []);

  if (candidates.length === 0) {
    return NextResponse.json({ data: [], liveSync });
  }

  const aiSuggestions = await generateSuggestionsWithAI(candidates);
  const fallbackSuggestions = buildFallbackSuggestions(candidates);
  const data = dedupeSuggestions(aiSuggestions ?? [], fallbackSuggestions);

  return NextResponse.json({ data, liveSync });
}