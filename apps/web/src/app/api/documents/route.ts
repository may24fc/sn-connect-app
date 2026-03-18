import { logActivity } from '@/lib/audit';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { DocumentInsert } from '@hr-portal/database';
import { type NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/documents
 * List documents for employee
 * Permissions: Employees see their own, admins see all (via RLS)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();

    // Verify authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const employeeId = searchParams.get('employeeId');
    const documentType = searchParams.get('documentType');
    const isConfidential = searchParams.get('isConfidential');
    const page = Number.parseInt(searchParams.get('page') || '1', 10);
    const pageSize = Number.parseInt(searchParams.get('pageSize') || '20', 10);

    // Build query
    let query = supabase
      .from('documents')
      .select('*, employees!inner(first_name, last_name, employee_number)', {
        count: 'exact',
      })
      .is('deleted_at', null)
      .order('uploaded_at', { ascending: false });

    // Apply filters
    if (employeeId) {
      query = query.eq('employee_id', employeeId);
    }

    if (documentType) {
      query = query.eq('document_type', documentType);
    }

    if (isConfidential !== null && isConfidential !== undefined) {
      query = query.eq('is_confidential', isConfidential === 'true');
    }

    // Apply pagination
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);

    // Execute query
    const { data, error, count } = await query;

    if (error) {
      console.error('Error fetching documents:', error);
      return NextResponse.json({ error: 'Failed to fetch documents' }, { status: 500 });
    }

    return NextResponse.json({
      data,
      pagination: {
        page,
        pageSize,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / pageSize),
      },
    });
  } catch (error) {
    console.error('Unexpected error in GET /api/documents:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/documents
 * Create document metadata (call /api/documents/upload for file upload)
 * Permissions: Admins and document owners
 */
export async function POST(request: NextRequest) {
  try {
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
    const body: DocumentInsert = await request.json();

    // Insert document
    const { data, error } = await supabase
      .from('documents')
      .insert({
        ...body,
        uploaded_by: user.id,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating document:', error);
      return NextResponse.json({ error: 'Failed to create document' }, { status: 500 });
    }

    logActivity(supabase, {
      userId: user.id,
      action: 'create_document',
      tableName: 'documents',
      recordId: data.id,
      metadata: { employeeId: body.employee_id, documentType: body.document_type },
    });

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    console.error('Unexpected error in POST /api/documents:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
