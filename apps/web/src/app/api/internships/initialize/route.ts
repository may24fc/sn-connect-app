import { initializeInternshipSchema } from '@/lib/schemas/internship.schema';
import { type NextRequest, NextResponse } from 'next/server';
import { getAuthedInternshipContext } from '../_lib';

/**
 * POST /api/internships/initialize
 *
 * Creates an internship record for the authenticated intern user.
 * - Validates the user has role `intern`
 * - Prevents duplicate records (only one active internship per employee)
 * - Links the internship to the user's employee record
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const { supabase, user, role, error } = await getAuthedInternshipContext();
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Keep validation for backwards compatibility with older clients, but
    // self-initialization is no longer an allowed product flow.
    if (role !== 'intern') {
      return NextResponse.json(
        { error: 'Only users with the intern role can initialize an internship' },
        { status: 403 }
      );
    }

    // Parse and validate request body
    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const parsed = initializeInternshipSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    try {
      await supabase.from('audit_logs').insert({
        action: 'intern_self_initialize_blocked',
        table_name: 'internships',
        record_id: user.id,
        user_id: user.id,
        new_values: {
          reason: 'Intern self-initialization disabled',
        },
      });
    } catch (auditError) {
      console.warn('Failed to write audit log for intern initialization:', auditError);
    }

    return NextResponse.json(
      {
        error:
          'Internship setup is managed by an administrator. Please wait for your assignment or contact HR if your internship details are missing.',
      },
      { status: 403 }
    );
  } catch (err) {
    console.error('Unexpected error in POST /api/internships/initialize:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
