/**
 * Get banking info status for all employees
 * Returns list of employee IDs that have valid Wise recipient IDs
 */

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin or super_admin
    const { data: userRecord, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (userError || !userRecord) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const allowedRoles = ['admin', 'super_admin', 'hr'];
    if (!allowedRoles.includes(userRecord.role)) {
      return NextResponse.json(
        { error: 'Forbidden: Only admins can view banking info status' },
        { status: 403 }
      );
    }

    // Fetch all employees with valid Wise recipient IDs
    const { data: bankingRecords, error: fetchError } = await supabase
      .from('employee_banking_info')
      .select('employee_id')
      .not('wise_recipient_id', 'is', null)
      .is('deleted_at', null);

    if (fetchError) {
      console.error('Failed to fetch banking info:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch banking info', details: fetchError.message },
        { status: 500 }
      );
    }

    const employeesWithRecipient = (bankingRecords || []).map((r: { employee_id: string }) => r.employee_id);

    return NextResponse.json({
      employeesWithRecipient,
      total: employeesWithRecipient.length,
    });
  } catch (error) {
    console.error('GET /api/admin/banking-info-status error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
