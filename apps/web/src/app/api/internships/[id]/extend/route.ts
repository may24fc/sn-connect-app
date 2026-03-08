import { createSupabaseServerClient } from '@/lib/supabase/server';
import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const ADMIN_ROLES = ['admin', 'super_admin'];

const extendInternshipSchema = z.object({
  newEndDate: z.string().refine((val) => {
    const date = new Date(val);
    return !Number.isNaN(date.getTime()) && date > new Date();
  }, 'New end date must be a valid future date'),
  reason: z.string().min(5, 'Reason must be at least 5 characters').max(500),
});

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check role
    let role: string | null = null;
    if (typeof user.app_metadata?.db_role === 'string') {
      role = user.app_metadata.db_role;
    }
    if (!role) {
      const { data: roleData } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .is('deleted_at', null)
        .maybeSingle();
      role = roleData?.role ?? null;
    }

    if (!role || !ADMIN_ROLES.includes(role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;

    // Validate request body
    const body = await request.json();
    const validation = extendInternshipSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { newEndDate, reason } = validation.data;

    // Fetch current internship
    const { data: internship, error: fetchError } = await supabase
      .from('internships')
      .select('id, employee_id, end_date, status')
      .eq('id', id)
      .is('deleted_at', null)
      .maybeSingle();

    if (fetchError || !internship) {
      return NextResponse.json({ error: 'Internship not found' }, { status: 404 });
    }

    if (internship.status !== 'active') {
      return NextResponse.json({ error: 'Can only extend active internships' }, { status: 400 });
    }

    const previousEndDate = internship.end_date;

    // Update end date
    const { data: updated, error: updateError } = await supabase
      .from('internships')
      .update({
        end_date: newEndDate,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json(
        { error: 'Failed to extend internship', details: updateError.message },
        { status: 500 }
      );
    }

    // Create audit log entry
    await supabase.from('audit_logs').insert({
      user_id: user.id,
      action: 'internship_extended',
      entity_type: 'internship',
      entity_id: id,
      details: {
        previous_end_date: previousEndDate,
        new_end_date: newEndDate,
        reason,
        employee_id: internship.employee_id,
      },
    });

    return NextResponse.json({
      data: updated,
      message: 'Internship extended successfully',
    });
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
