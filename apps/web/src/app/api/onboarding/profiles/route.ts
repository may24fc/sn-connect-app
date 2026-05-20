import { onboardingProfileFiltersSchema } from '@/lib/schemas/onboarding-view.schema';
import type { OnboardingReviewState } from '@/lib/onboarding-review-state';
import { type NextRequest, NextResponse } from 'next/server';
import { getAuthedOnboardingContext, isOnboardingAdmin, maskPaymentAccount } from '../_lib';

function deriveReviewState(row: {
  is_completed: boolean;
  review_state: string | null;
  users?: { status?: string | null } | Array<{ status?: string | null }> | null;
}): OnboardingReviewState {
  const userInfo = Array.isArray(row.users) ? row.users[0] : row.users;

  if (!row.is_completed) {
    return 'in_progress';
  }

  if (userInfo?.status === 'active') {
    return 'approved';
  }

  // Terminated users are no longer active employees; their onboarding
  // record should never surface as a pending approval.
  if (userInfo?.status === 'terminated') {
    return 'approved';
  }

  if (row.review_state === 'rejected') {
    return 'rejected';
  }

  return 'awaiting_review';
}

export async function GET(request: NextRequest) {
  try {
    const { supabase, user, role, error } = await getAuthedOnboardingContext();
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isOnboardingAdmin(role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const parsed = onboardingProfileFiltersSchema.safeParse({
      search: searchParams.get('search') || undefined,
      status: searchParams.get('status') || undefined,
      role: searchParams.get('role') || undefined,
      departmentId: searchParams.get('departmentId') || undefined,
      startDate: searchParams.get('startDate') || undefined,
      endDate: searchParams.get('endDate') || undefined,
      page: searchParams.get('page') || undefined,
      pageSize: searchParams.get('pageSize') || undefined,
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const filters = parsed.data;

    let query = supabase
      .from('onboarding_profiles')
      .select('*, users!inner(id, role, status, avatar_url), departments(id, name)', { count: 'exact' })
      .is('deleted_at', null)
      .neq('users.status', 'terminated')
      .order('created_at', { ascending: false });

    if (filters.search) {
      query = query.or(
        `first_name.ilike.%${filters.search}%,last_name.ilike.%${filters.search}%,email_address.ilike.%${filters.search}%`
      );
    }

    if (filters.status) {
      query = query.eq('is_completed', filters.status === 'completed');
    }

    if (filters.role) {
      query = query.eq('users.role', filters.role);
    }

    if (filters.departmentId) {
      query = query.eq('department_id', filters.departmentId);
    }

    if (filters.startDate) {
      query = query.gte('created_at', filters.startDate);
    }

    if (filters.endDate) {
      query = query.lte('created_at', filters.endDate);
    }

    const from = (filters.page - 1) * filters.pageSize;
    const to = from + filters.pageSize - 1;

    const { data, error: queryError, count } = await query.range(from, to);

    if (queryError) {
      return NextResponse.json({ error: 'Failed to fetch onboarding profiles' }, { status: 500 });
    }

    const userIds = (data ?? [])
      .map((row: { user_id?: string | null }) => row.user_id)
      .filter((userId: string | null | undefined): userId is string =>
        typeof userId === 'string' && userId.length > 0
      );

    const employeeIdsByUserId = new Map<string, string>();

    if (userIds.length > 0) {
      const { data: employees, error: employeesError } = await supabase
        .from('employees')
        .select('id, user_id')
        .in('user_id', userIds)
        .is('deleted_at', null);

      if (employeesError) {
        return NextResponse.json(
          { error: 'Failed to resolve onboarding employee records' },
          { status: 500 }
        );
      }

      for (const employee of employees ?? []) {
        if (employee.user_id) {
          employeeIdsByUserId.set(employee.user_id, employee.id);
        }
      }
    }

    const normalized = (data ?? []).map((row: any) => {
      const userInfo = Array.isArray(row.users) ? row.users[0] : row.users;

      return {
        ...row,
        employee_id: employeeIdsByUserId.get(row.user_id) ?? null,
        avatar_url: userInfo?.avatar_url ?? null,
        status: row.is_completed ? 'completed' : 'in_progress',
        review_state: deriveReviewState(row),
        full_name: [row.first_name, row.middle_name, row.last_name].filter(Boolean).join(' '),
        payment_account_masked: maskPaymentAccount(row.payment_account_number),
      };
    });

    const completed = normalized.filter(
      (item: { status: string }) => item.status === 'completed'
    ).length;
    const inProgress = normalized.filter(
      (item: { status: string }) => item.status === 'in_progress'
    ).length;
    const awaitingReview = normalized.filter(
      (item: { review_state?: OnboardingReviewState }) => item.review_state === 'awaiting_review'
    ).length;
    const rejected = normalized.filter(
      (item: { review_state?: OnboardingReviewState }) => item.review_state === 'rejected'
    ).length;
    const approved = normalized.filter(
      (item: { review_state?: OnboardingReviewState }) => item.review_state === 'approved'
    ).length;

    return NextResponse.json({
      data: normalized,
      summary: {
        total: count || 0,
        completed,
        inProgress,
        awaitingReview,
        rejected,
        approved,
      },
      pagination: {
        page: filters.page,
        pageSize: filters.pageSize,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / filters.pageSize),
      },
    });
  } catch (error) {
    console.error('GET /api/onboarding/profiles error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
