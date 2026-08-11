import { createHmac } from 'node:crypto';
import type { NormalizedInquiry } from '@/lib/schemas/inquiry.schema';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { NextRequest } from 'next/server';

const IP_SHORT_LIMIT = { scope: 'ip_short', capacity: 5, windowSeconds: 10 * 60 };
const IP_DAILY_LIMIT = { scope: 'ip_daily', capacity: 20, windowSeconds: 24 * 60 * 60 };
const EMAIL_SHORT_LIMIT = { scope: 'email_short', capacity: 2, windowSeconds: 60 * 60 };
const EMAIL_DAILY_LIMIT = {
  scope: 'email_daily',
  capacity: 5,
  windowSeconds: 24 * 60 * 60,
};

type RateLimitDefinition = {
  scope: string;
  capacity: number;
  windowSeconds: number;
};

export type RateLimitResult = {
  allowed: boolean;
  retryAfterSeconds: number;
};

function getAbuseSecret(): string {
  const secret = process.env.INQUIRY_ABUSE_SECRET?.trim();
  if (!secret) {
    throw new Error('INQUIRY_ABUSE_SECRET is not configured');
  }
  return secret;
}

export function hashInquiryIdentifier(value: string): string {
  return createHmac('sha256', getAbuseSecret()).update(value).digest('hex');
}

export function getTrustedInquiryClientIp(request: NextRequest): string {
  if (process.env.VERCEL === '1') {
    const forwarded = request.headers.get('x-vercel-forwarded-for')?.split(',')[0]?.trim();
    if (!forwarded) {
      throw new Error('Trusted Vercel client IP header is missing');
    }
    return forwarded;
  }

  if (process.env.NODE_ENV !== 'production') {
    return (
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip')?.trim() ||
      '127.0.0.1'
    );
  }

  throw new Error('A trusted client IP source is not configured for this production runtime');
}

async function consumeLimit(
  supabase: SupabaseClient,
  identifierHash: string,
  definition: RateLimitDefinition
): Promise<RateLimitResult> {
  const { data, error } = await supabase.rpc('consume_inquiry_rate_limit', {
    p_scope: definition.scope,
    p_identifier_hash: identifierHash,
    p_capacity: definition.capacity,
    p_window_seconds: definition.windowSeconds,
  });

  if (error) {
    throw new Error(`Inquiry rate-limit RPC failed: ${error.message}`);
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (!row || typeof row.allowed !== 'boolean') {
    throw new Error('Inquiry rate-limit RPC returned an invalid response');
  }

  return {
    allowed: row.allowed,
    retryAfterSeconds: typeof row.retry_after_seconds === 'number' ? row.retry_after_seconds : 0,
  };
}

async function consumeLimits(
  supabase: SupabaseClient,
  identifierHash: string,
  definitions: Array<RateLimitDefinition>
): Promise<RateLimitResult> {
  let retryAfterSeconds = 0;
  let allowed = true;

  for (const definition of definitions) {
    const result = await consumeLimit(supabase, identifierHash, definition);
    allowed = allowed && result.allowed;
    retryAfterSeconds = Math.max(retryAfterSeconds, result.retryAfterSeconds);
  }

  return { allowed, retryAfterSeconds };
}

export function consumeInquiryIpLimits(
  supabase: SupabaseClient,
  clientIp: string
): Promise<RateLimitResult> {
  return consumeLimits(supabase, hashInquiryIdentifier(`ip:${clientIp}`), [
    IP_SHORT_LIMIT,
    IP_DAILY_LIMIT,
  ]);
}

export function consumeInquiryEmailLimits(
  supabase: SupabaseClient,
  normalizedEmail: string
): Promise<RateLimitResult> {
  return consumeLimits(supabase, hashInquiryIdentifier(`email:${normalizedEmail}`), [
    EMAIL_SHORT_LIMIT,
    EMAIL_DAILY_LIMIT,
  ]);
}

export function buildInquiryFingerprint(inquiry: NormalizedInquiry): string {
  return hashInquiryIdentifier(
    JSON.stringify([inquiry.email, inquiry.subject, inquiry.message, inquiry.business_unit_id])
  );
}

export async function claimInquiryFingerprint(
  supabase: SupabaseClient,
  fingerprint: string
): Promise<boolean> {
  const { data, error } = await supabase.rpc('claim_inquiry_deduplication_key', {
    p_fingerprint: fingerprint,
    p_ttl_seconds: 30 * 60,
  });

  if (error || typeof data !== 'boolean') {
    throw new Error(`Inquiry deduplication RPC failed: ${error?.message ?? 'invalid response'}`);
  }

  return data;
}

export async function releaseInquiryFingerprint(
  supabase: SupabaseClient,
  fingerprint: string
): Promise<void> {
  const { error } = await supabase.rpc('release_inquiry_deduplication_key', {
    p_fingerprint: fingerprint,
  });

  if (error) {
    throw new Error(`Inquiry deduplication release failed: ${error.message}`);
  }
}
