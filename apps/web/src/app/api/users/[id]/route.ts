import { logActivity } from '@/lib/audit';
import { createSupabaseAdminClient, createSupabaseServerClient } from '@/lib/supabase/server';
import { type NextRequest, NextResponse } from 'next/server';

/**
 * DELETE /api/users/[id]
 * Soft-delete a user record (for users without an employee record)
 * Permissions: Admin and Super Admin only
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createSupabaseServerClient();

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

    if (userData.role !== 'super_admin' && userData.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Prevent self-deletion
    if (id === user.id) {
      return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 });
    }

    // Use the admin client to bypass RLS for the deletion
    const adminClient = createSupabaseAdminClient();

    // Soft-delete both the employee record (if any) and the user record
    await adminClient
      .from('employees')
      .update({ deleted_at: new Date().toISOString() })
      .eq('user_id', id)
      .is('deleted_at', null);

    const { error: deleteError } = await adminClient
      .from('users')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .is('deleted_at', null);

    if (deleteError) {
      console.error('Error soft-deleting user:', deleteError);
      return NextResponse.json({ error: 'Failed to remove user' }, { status: 500 });
    }

    logActivity(supabase, {
      userId: user.id,
      action: 'delete_user',
      tableName: 'users',
      recordId: id,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Unexpected error in DELETE /api/users/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
