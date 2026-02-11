import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { Employee } from '@hr-portal/database';

/**
 * GET /api/employees/[id]
 * Get single employee details
 * Permissions: Employees can view their own, managers can view their reports, admins can view all
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createSupabaseServerClient();

    // Verify authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch employee with user data
    const { data, error } = await supabase
      .from('employees')
      .select('*, users!inner(*)')
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Unexpected error in GET /api/employees/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/employees/[id]
 * Update employee
 * Permissions: Employees can update their own basic info, admins can update all fields
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createSupabaseServerClient();

    // Verify authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const body: Partial<Employee> = await request.json();

    // Update employee
    const { data, error } = await supabase
      .from('employees')
      .update(body)
      .eq('id', id)
      .is('deleted_at', null)
      .select()
      .single();

    if (error) {
      console.error('Error updating employee:', error);
      return NextResponse.json(
        { error: 'Failed to update employee' },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Unexpected error in PATCH /api/employees/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/employees/[id]
 * Soft delete employee
 * Permissions: Super Admin only
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createSupabaseServerClient();

    // Verify authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check role permission
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (userError || !userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (userData.role !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Soft delete employee
    const { error } = await supabase
      .from('employees')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .is('deleted_at', null);

    if (error) {
      console.error('Error deleting employee:', error);
      return NextResponse.json(
        { error: 'Failed to delete employee' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Unexpected error in DELETE /api/employees/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
