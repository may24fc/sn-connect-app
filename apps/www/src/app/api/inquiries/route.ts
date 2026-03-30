import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { sendInquiryConfirmation, sendInquiryNotification } from '@/lib/email';
import { createSupabaseAdminClient } from '@/lib/supabase/server';

const inquiryBodySchema = z.object({
  name: z.string().min(2).max(200),
  email: z.string().email().max(320),
  phone: z.string().max(30).optional(),
  business_unit_id: z.string().uuid().optional().nullable(),
  subject: z.string().min(3).max(300),
  message: z.string().min(10).max(5000),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = inquiryBodySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const supabase = createSupabaseAdminClient();

    const { data: inquiry, error } = await supabase
      .from('public_inquiries')
      .insert({
        name: parsed.data.name,
        email: parsed.data.email,
        phone: parsed.data.phone ?? null,
        business_unit_id: parsed.data.business_unit_id ?? null,
        subject: parsed.data.subject,
        message: parsed.data.message,
      })
      .select('id')
      .single();

    if (error) {
      console.error('Supabase insert error:', error.message);
      return NextResponse.json({ error: 'Failed to submit inquiry' }, { status: 500 });
    }

    if (inquiry?.id) {
      await Promise.all([
        sendInquiryNotification({
          inquiryId: inquiry.id,
          name: parsed.data.name,
          email: parsed.data.email,
          phone: parsed.data.phone ?? null,
          subject: parsed.data.subject,
          message: parsed.data.message,
        }),
        sendInquiryConfirmation({
          to: parsed.data.email,
          name: parsed.data.name,
          subject: parsed.data.subject,
        }),
      ]);
    }

    return NextResponse.json({ success: true }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
