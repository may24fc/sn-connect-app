import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Data access for saved insight conversations. Every call uses the RLS-scoped
 * client: policies restrict rows to their owner while they remain a
 * performance admin, so a missing row means "not yours" as well as "not found".
 */

const CONVERSATIONS_TABLE = 'performance_insight_conversations';
const MESSAGES_TABLE = 'performance_insight_messages';

const CONVERSATION_COLUMNS =
  'id, title, evaluation_kind, period_key, months_back, last_message_at, created_at';
const MESSAGE_COLUMNS = 'id, role, content, status, context_snapshot_hash, created_at';

export type InsightEvaluationKind = 'five_percent';
export type InsightMessageRole = 'user' | 'assistant';
export type InsightMessageStatus = 'complete' | 'error' | 'aborted';

export type InsightConversation = {
  id: string;
  title: string;
  evaluationKind: InsightEvaluationKind;
  periodKey: string;
  monthsBack: number;
  lastMessageAt: string;
  createdAt: string;
};

export type InsightMessage = {
  id: string;
  role: InsightMessageRole;
  content: string;
  status: InsightMessageStatus;
  contextSnapshotHash: string | null;
  createdAt: string;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : null;
}

function str(row: Record<string, unknown>, key: string): string | null {
  const value = row[key];
  return typeof value === 'string' ? value : null;
}

export function mapConversationRow(value: unknown): InsightConversation | null {
  const row = asRecord(value);
  if (!row) return null;

  const id = str(row, 'id');
  const periodKey = str(row, 'period_key');
  const kind = str(row, 'evaluation_kind');
  if (!(id && periodKey) || kind !== 'five_percent') return null;

  return {
    id,
    title: str(row, 'title') ?? 'New conversation',
    evaluationKind: kind,
    periodKey,
    monthsBack: typeof row.months_back === 'number' ? row.months_back : 0,
    lastMessageAt: str(row, 'last_message_at') ?? str(row, 'created_at') ?? '',
    createdAt: str(row, 'created_at') ?? '',
  };
}

export function mapMessageRow(value: unknown): InsightMessage | null {
  const row = asRecord(value);
  if (!row) return null;

  const id = str(row, 'id');
  const role = str(row, 'role');
  const status = str(row, 'status');
  if (!id || (role !== 'user' && role !== 'assistant')) return null;

  return {
    id,
    role,
    content: str(row, 'content') ?? '',
    status: status === 'error' || status === 'aborted' ? status : 'complete',
    contextSnapshotHash: str(row, 'context_snapshot_hash'),
    createdAt: str(row, 'created_at') ?? '',
  };
}

function mapRows<T>(data: unknown, mapper: (value: unknown) => T | null): Array<T> {
  return (Array.isArray(data) ? data : []).map(mapper).filter((row): row is T => row !== null);
}

export async function listConversations(
  supabase: SupabaseClient,
  params: { userId: string; kind: InsightEvaluationKind; limit: number; offset: number }
): Promise<{ conversations: Array<InsightConversation>; total: number }> {
  const { data, error, count } = await supabase
    .from(CONVERSATIONS_TABLE)
    .select(CONVERSATION_COLUMNS, { count: 'exact' })
    .eq('user_id', params.userId)
    .eq('evaluation_kind', params.kind)
    .is('deleted_at', null)
    .order('last_message_at', { ascending: false })
    .range(params.offset, params.offset + params.limit - 1);

  if (error) {
    throw new Error(`Failed to list insight conversations: ${error.message}`);
  }

  return { conversations: mapRows(data, mapConversationRow), total: count ?? 0 };
}

export async function getConversation(
  supabase: SupabaseClient,
  id: string
): Promise<InsightConversation | null> {
  const { data, error } = await supabase
    .from(CONVERSATIONS_TABLE)
    .select(CONVERSATION_COLUMNS)
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load insight conversation: ${error.message}`);
  }

  return mapConversationRow(data);
}

export async function createConversation(
  supabase: SupabaseClient,
  params: {
    userId: string;
    kind: InsightEvaluationKind;
    periodKey: string;
    monthsBack: number;
    title: string;
  }
): Promise<InsightConversation> {
  const { data, error } = await supabase
    .from(CONVERSATIONS_TABLE)
    .insert({
      user_id: params.userId,
      created_by: params.userId,
      evaluation_kind: params.kind,
      period_key: params.periodKey,
      months_back: params.monthsBack,
      title: params.title,
    })
    .select(CONVERSATION_COLUMNS)
    .single();

  const conversation = mapConversationRow(data);
  if (error || !conversation) {
    throw new Error(`Failed to create insight conversation: ${error?.message ?? 'no row'}`);
  }

  return conversation;
}

export async function renameConversation(
  supabase: SupabaseClient,
  id: string,
  title: string
): Promise<InsightConversation | null> {
  const { data, error } = await supabase
    .from(CONVERSATIONS_TABLE)
    .update({ title })
    .eq('id', id)
    .is('deleted_at', null)
    .select(CONVERSATION_COLUMNS)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to rename insight conversation: ${error.message}`);
  }

  return mapConversationRow(data);
}

/** Callers check ownership with `getConversation` first; RLS enforces it again here. */
export async function softDeleteConversation(supabase: SupabaseClient, id: string): Promise<void> {
  const { error } = await supabase
    .from(CONVERSATIONS_TABLE)
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
    .is('deleted_at', null);

  if (error) {
    throw new Error(`Failed to delete insight conversation: ${error.message}`);
  }
}

export async function touchConversation(supabase: SupabaseClient, id: string): Promise<void> {
  const { error } = await supabase
    .from(CONVERSATIONS_TABLE)
    .update({ last_message_at: new Date().toISOString() })
    .eq('id', id)
    .is('deleted_at', null);

  if (error) {
    throw new Error(`Failed to update insight conversation: ${error.message}`);
  }
}

export async function listMessages(
  supabase: SupabaseClient,
  conversationId: string
): Promise<Array<InsightMessage>> {
  const { data, error } = await supabase
    .from(MESSAGES_TABLE)
    .select(MESSAGE_COLUMNS)
    .eq('conversation_id', conversationId)
    .is('deleted_at', null)
    .order('created_at', { ascending: true });

  if (error) {
    throw new Error(`Failed to load insight messages: ${error.message}`);
  }

  return mapRows(data, mapMessageRow);
}

/** Most recent completed messages, oldest first, for replay to the model. */
export async function listRecentMessages(
  supabase: SupabaseClient,
  conversationId: string,
  limit: number
): Promise<Array<InsightMessage>> {
  const { data, error } = await supabase
    .from(MESSAGES_TABLE)
    .select(MESSAGE_COLUMNS)
    .eq('conversation_id', conversationId)
    .eq('status', 'complete')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to load insight history: ${error.message}`);
  }

  return mapRows(data, mapMessageRow).reverse();
}

export async function insertMessage(
  supabase: SupabaseClient,
  params: {
    conversationId: string;
    userId: string;
    role: InsightMessageRole;
    content: string;
    status?: InsightMessageStatus;
    contextSnapshotHash?: string | null;
    contextMeta?: Record<string, unknown> | null;
    model?: string | null;
    inputTokens?: number | null;
    outputTokens?: number | null;
  }
): Promise<string> {
  const { data, error } = await supabase
    .from(MESSAGES_TABLE)
    .insert({
      conversation_id: params.conversationId,
      user_id: params.userId,
      created_by: params.userId,
      role: params.role,
      content: params.content,
      status: params.status ?? 'complete',
      context_snapshot_hash: params.contextSnapshotHash ?? null,
      context_meta: params.contextMeta ?? null,
      model: params.model ?? null,
      input_tokens: params.inputTokens ?? null,
      output_tokens: params.outputTokens ?? null,
    })
    .select('id')
    .single();

  const id = asRecord(data) ? str(asRecord(data) as Record<string, unknown>, 'id') : null;
  if (error || !id) {
    throw new Error(`Failed to save insight message: ${error?.message ?? 'no row'}`);
  }

  return id;
}

/**
 * Counts the caller's questions across all conversations, including deleted
 * ones, so deleting a conversation cannot reset the rate limit. Pass the admin
 * client only after the performance-admin role check; the query is scoped to
 * `userId` and returns a count, never content.
 */
export async function countRecentQuestions(
  supabase: SupabaseClient,
  userId: string,
  since: Date
): Promise<number> {
  const { count, error } = await supabase
    .from(MESSAGES_TABLE)
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('role', 'user')
    .gte('created_at', since.toISOString());

  if (error) {
    throw new Error(`Failed to check insight rate limit: ${error.message}`);
  }

  return count ?? 0;
}
