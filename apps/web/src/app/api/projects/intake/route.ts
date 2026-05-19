/**
 * Internal intake endpoint for inserting an already-extracted project brief
 * directly into the backlog. Intended for trusted callers (workflow tools,
 * scripts) that supply `x-internal-secret`. The user-facing flow comes through
 * Telegram → Inngest.
 */

import { NextResponse } from 'next/server';
import { timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import { createSupabaseAdminClient } from '@/lib/supabase/server';
import { persistProjectIntake } from '@/lib/intake/persist-intake';

export const runtime = 'nodejs';

const PriorityEnum = z.enum(['Low', 'Medium', 'High', 'Urgent']);

const IntakeSchema = z.object({
  title: z.string().min(3).max(200),
  problem_statement: z.string().min(3),
  objective: z.string().min(3),
  technical_scope: z.array(z.string()).default([]),
  target_departments: z.array(z.string()).default([]),
  priority: PriorityEnum.default('Medium'),
  assigned_name_hint: z.string().nullable().optional(),
  raw_transcript: z.string().optional(),
  source_chat_id: z.string().optional(),
  source_message_id: z.string().optional(),
  extraction_model: z.string().optional(),
});

function isAuthorized(headerSecret: string | null): boolean {
  const expected = process.env.INTAKE_WEBHOOK_SECRET?.trim();
  if (!expected) return false;
  if (!headerSecret) return false;

  const a = Buffer.from(headerSecret);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function POST(request: Request) {
  if (!isAuthorized(request.headers.get('x-internal-secret'))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = IntakeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid payload', issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const data = parsed.data;
  const admin = createSupabaseAdminClient();

  try {
    const result = await persistProjectIntake(admin, {
      extraction: {
        title: data.title,
        problem_statement: data.problem_statement,
        objective: data.objective,
        technical_scope: data.technical_scope,
        target_departments: data.target_departments,
        priority: data.priority,
        assigned_name_hint: data.assigned_name_hint ?? null,
        model: data.extraction_model ?? 'external',
      },
      source: {
        chatId: data.source_chat_id ?? null,
        messageId: data.source_message_id ?? null,
        rawTranscript: data.raw_transcript ?? '',
      },
      createdByUserId: null,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error('[intake] persist failed:', error);
    return NextResponse.json({ error: 'Failed to persist intake' }, { status: 500 });
  }
}
