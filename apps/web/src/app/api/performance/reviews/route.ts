import { logActivity } from '@/lib/audit';
import { sendPortalNotificationEmail } from '@/lib/email';
import {
  createNotification,
  getUserDisplayName,
  type NotificationType,
} from '@/lib/notifications/create-notification';
import {
  getEmployeeContactByEmployeeId,
  getEmployeeDisplayNameByEmployeeId,
  getPerformancePathForRole,
  getUserContactByUserId,
} from '@/lib/notifications/recipients';
import { getGmailNotificationEnabledUserIds } from '@/lib/settings/notification-preferences.server';
import {
  createPerformanceReviewSchema,
  updatePerformanceReviewSchema,
} from '@/lib/schemas/performance.schema';
import { type NextRequest, NextResponse } from 'next/server';
import { canManagePerformance, getAuthedPerformanceContext, resolveEmployeeIdForUser } from '../_lib';

export async function GET(request: NextRequest) {
  try {
    const { supabaseAdmin, user, role, error } = await getAuthedPerformanceContext();
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const cycleId = searchParams.get('cycleId') || undefined;
    const status = searchParams.get('status') || undefined;
    const explicitEmployeeId = searchParams.get('employeeId') || undefined;

    let employeeId: string | null | undefined = explicitEmployeeId;
    if (!employeeId && !canManagePerformance(role)) {
      // Non-management roles (employees/interns) are scoped to their own record only
      employeeId = await resolveEmployeeIdForUser(supabaseAdmin, user.id);
      if (!employeeId) {
        return NextResponse.json({ data: [] });
      }
    }

    let query = supabaseAdmin
      .from('performance_reviews')
      .select(
        '*, review_cycles(id, name, start_date, end_date, status), employees(id, first_name, last_name, department, immediate_head)'
      )
      .order('created_at', { ascending: false });

    if (employeeId) {
      query = query.eq('employee_id', employeeId);
    }
    if (cycleId) {
      query = query.eq('cycle_id', cycleId);
    }
    if (status) {
      query = query.eq('status', status);
    }

    const { data, error: queryError } = await query;

    if (queryError) {
      return NextResponse.json({ error: 'Failed to fetch reviews' }, { status: 500 });
    }

    return NextResponse.json({ data: data || [] });
  } catch (error) {
    console.error('GET /api/performance/reviews error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { supabase, supabaseAdmin, user, role, error } = await getAuthedPerformanceContext();
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = createPerformanceReviewSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    let employeeId = parsed.data.employeeId;
    if (!canManagePerformance(role)) {
      // Non-management users (employees/interns) can only create/update their own review
      const ownEmployeeId = await resolveEmployeeIdForUser(supabaseAdmin, user.id);
      if (!ownEmployeeId) {
        return NextResponse.json({ error: 'No employee profile found' }, { status: 400 });
      }
      employeeId = ownEmployeeId;
    }

    const shouldMarkCompleted =
      parsed.data.status === 'completed' || parsed.data.managerRating !== undefined;
    const completionTimestamp = shouldMarkCompleted ? new Date().toISOString() : null;

    const { data, error: upsertError } = await supabaseAdmin
      .from('performance_reviews')
      .upsert(
        {
          cycle_id: parsed.data.cycleId,
          employee_id: employeeId,
          reviewer_id: parsed.data.reviewerId || null,
          status: shouldMarkCompleted ? 'completed' : parsed.data.status,
          self_rating: parsed.data.selfRating || null,
          self_comments: parsed.data.selfComments || null,
          manager_rating: parsed.data.managerRating || null,
          manager_comments: parsed.data.managerComments || null,
          final_rating: parsed.data.finalRating || null,
          goals_for_next_period: parsed.data.goalsForNextPeriod || null,
          submitted_at: completionTimestamp,
          completed_at: completionTimestamp,
        },
        { onConflict: 'cycle_id,employee_id' }
      )
      .select('*')
      .single();

    if (upsertError || !data) {
      const message = upsertError?.message || 'Failed to create review';
      const code = upsertError?.code;

      if (code === '23503') {
        return NextResponse.json(
          { error: 'Invalid reference for cycle, employee, or reviewer' },
          { status: 400 }
        );
      }

      return NextResponse.json({ error: message }, { status: 500 });
    }

    logActivity(supabaseAdmin, {
      userId: user.id,
      action: 'upsert_performance_review',
      tableName: 'performance_reviews',
      recordId: data.id,
      metadata: { employeeId: data.employee_id, cycleId: data.cycle_id },
    });

    const [employeeContact, reviewerContact, employeeName, actorName] = await Promise.all([
      getEmployeeContactByEmployeeId(data.employee_id),
      data.reviewer_id ? getUserContactByUserId(data.reviewer_id) : Promise.resolve(null),
      getEmployeeDisplayNameByEmployeeId(data.employee_id),
      getUserDisplayName(user.id),
    ]);
    const reviewSubjectName = employeeName ?? employeeContact?.name ?? 'Team member';

    if (employeeContact?.userId && employeeContact.userId !== user.id) {
      createNotification({
        userId: employeeContact.userId,
        type: 'system' as NotificationType,
        title: 'Review assigned',
        message: `${actorName} created an OKRs & KPIs review for you.`,
        link: getPerformancePathForRole(employeeContact.role),
        metadata: { reviewId: data.id, cycleId: data.cycle_id, status: data.status },
        sendEmail: false,
      });
    }

    if (
      reviewerContact?.userId &&
      reviewerContact.userId !== user.id &&
      reviewerContact.userId !== employeeContact?.userId
    ) {
      createNotification({
        userId: reviewerContact.userId,
        type: 'system' as NotificationType,
        title: 'Review assigned',
        message: `${actorName} assigned you to review ${reviewSubjectName}.`,
        link: getPerformancePathForRole(reviewerContact.role),
        metadata: { reviewId: data.id, employeeId: data.employee_id, cycleId: data.cycle_id, status: data.status },
        sendEmail: false,
      });
    }

    const appBaseUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.APP_URL || '';
    const gmailEnabledUserIds = await getGmailNotificationEnabledUserIds(
      [employeeContact?.userId, reviewerContact?.userId].filter((value): value is string => Boolean(value))
    );
    await Promise.allSettled([
      ...(employeeContact?.email && employeeContact.userId !== user.id && gmailEnabledUserIds.has(employeeContact.userId)
        ? [
            sendPortalNotificationEmail({
              to: employeeContact.email,
              subject: 'An OKRs & KPIs review has been assigned to you',
              heading: 'Review assigned',
              paragraphs: [
                `${actorName} created an OKRs & KPIs review for you.`,
                'Open the OKRs & KPIs page to review the current status and complete the next required step.',
              ],
              actionLabel: 'Open OKRs & KPIs',
              actionUrl: appBaseUrl ? `${appBaseUrl}${getPerformancePathForRole(employeeContact.role)}` : undefined,
            }),
          ]
        : []),
      ...(reviewerContact?.email &&
      reviewerContact.userId !== user.id &&
      reviewerContact.userId !== employeeContact?.userId &&
      gmailEnabledUserIds.has(reviewerContact.userId)
        ? [
            sendPortalNotificationEmail({
              to: reviewerContact.email,
              subject: 'You have been assigned a review',
              heading: 'Review assigned',
              paragraphs: [
                `${actorName} assigned you to review ${reviewSubjectName}.`,
                'Open the OKRs & KPIs workspace to review and complete your part of the evaluation.',
              ],
              actionLabel: 'Open OKRs & KPIs',
              actionUrl: appBaseUrl ? `${appBaseUrl}${getPerformancePathForRole(reviewerContact.role)}` : undefined,
            }),
          ]
        : []),
    ]);

    return NextResponse.json({ data }, { status: 200 });
  } catch (error) {
    console.error('POST /api/performance/reviews error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { supabase, supabaseAdmin, user, error } = await getAuthedPerformanceContext();
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = updatePerformanceReviewSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    // Use supabaseAdmin to bypass RLS — app-level auth above already scoped access
    const { data: existingReview, error: existingError } = await supabaseAdmin
      .from('performance_reviews')
      .select('id, employee_id, reviewer_id, status, cycle_id')
      .eq('id', parsed.data.id)
      .single();

    if (existingError || !existingReview) {
      return NextResponse.json({ error: 'Review not found' }, { status: 404 });
    }

    const payload: Record<string, unknown> = {};
    const shouldMarkCompleted =
      parsed.data.status === 'completed' || parsed.data.managerRating !== undefined;

    if (parsed.data.status !== undefined || shouldMarkCompleted) {
      payload.status = shouldMarkCompleted ? 'completed' : parsed.data.status;
    }
    if (parsed.data.reviewerId !== undefined) payload.reviewer_id = parsed.data.reviewerId;
    if (parsed.data.selfRating !== undefined) payload.self_rating = parsed.data.selfRating;
    if (parsed.data.selfComments !== undefined) payload.self_comments = parsed.data.selfComments;
    if (parsed.data.managerRating !== undefined) payload.manager_rating = parsed.data.managerRating;
    if (parsed.data.managerComments !== undefined)
      payload.manager_comments = parsed.data.managerComments;
    if (parsed.data.finalRating !== undefined) payload.final_rating = parsed.data.finalRating;
    if (parsed.data.goalsForNextPeriod !== undefined)
      payload.goals_for_next_period = parsed.data.goalsForNextPeriod;
    if (parsed.data.submittedAt !== undefined) payload.submitted_at = parsed.data.submittedAt;
    if (parsed.data.completedAt !== undefined) payload.completed_at = parsed.data.completedAt;

    if (shouldMarkCompleted) {
      const completedAt = new Date().toISOString();
      payload.completed_at = payload.completed_at ?? completedAt;
      payload.submitted_at = payload.submitted_at ?? completedAt;
    }

    const { data, error: updateError } = await supabaseAdmin
      .from('performance_reviews')
      .update(payload)
      .eq('id', parsed.data.id)
      .select('*')
      .single();

    if (updateError || !data) {
      return NextResponse.json({ error: 'Failed to update review' }, { status: 500 });
    }

    logActivity(supabaseAdmin, {
      userId: user.id,
      action: 'update_performance_review',
      tableName: 'performance_reviews',
      recordId: parsed.data.id,
      metadata: { status: data.status },
    });

    const [employeeContact, reviewerContact, employeeName, actorName] = await Promise.all([
      getEmployeeContactByEmployeeId(data.employee_id),
      data.reviewer_id ? getUserContactByUserId(data.reviewer_id) : Promise.resolve(null),
      getEmployeeDisplayNameByEmployeeId(data.employee_id),
      getUserDisplayName(user.id),
    ]);
    const reviewSubjectName = employeeName ?? employeeContact?.name ?? 'Team member';

    const statusChanged = parsed.data.status !== undefined && parsed.data.status !== existingReview.status;
    const reviewerChanged = parsed.data.reviewerId !== undefined && parsed.data.reviewerId !== existingReview.reviewer_id;
    const appBaseUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.APP_URL || '';
    const pendingEmails: Array<Promise<{ sent: boolean; error?: string }>> = [];
    const gmailEnabledUserIds = await getGmailNotificationEnabledUserIds(
      [employeeContact?.userId, reviewerContact?.userId].filter((value): value is string => Boolean(value))
    );

    if (
      reviewerChanged &&
      reviewerContact?.userId &&
      reviewerContact.userId !== user.id &&
      reviewerContact.userId !== employeeContact?.userId
    ) {
      createNotification({
        userId: reviewerContact.userId,
        type: 'system' as NotificationType,
        title: 'Review assigned',
        message: `${actorName} assigned you to review ${reviewSubjectName}.`,
        link: getPerformancePathForRole(reviewerContact.role),
        metadata: { reviewId: data.id, employeeId: data.employee_id, cycleId: data.cycle_id, status: data.status },
        sendEmail: false,
      });

      if (reviewerContact.email && gmailEnabledUserIds.has(reviewerContact.userId)) {
        pendingEmails.push(
          sendPortalNotificationEmail({
            to: reviewerContact.email,
            subject: 'You have been assigned a review',
            heading: 'Review assigned',
            paragraphs: [
              `${actorName} assigned you to review ${reviewSubjectName}.`,
              'Open the OKRs & KPIs workspace to review and complete your part of the evaluation.',
            ],
            actionLabel: 'Open OKRs & KPIs',
            actionUrl: appBaseUrl ? `${appBaseUrl}${getPerformancePathForRole(reviewerContact.role)}` : undefined,
          })
        );
      }
    }

    if (statusChanged) {
      if (data.status === 'self_review' && employeeContact?.userId && employeeContact.userId !== user.id) {
        createNotification({
          userId: employeeContact.userId,
          type: 'system' as NotificationType,
          title: 'Self-review ready',
          message: `${actorName} moved your review to self-review.`,
          link: getPerformancePathForRole(employeeContact.role),
          metadata: { reviewId: data.id, employeeId: data.employee_id, cycleId: data.cycle_id, status: data.status },
          sendEmail: false,
        });

        if (employeeContact.email && gmailEnabledUserIds.has(employeeContact.userId)) {
          pendingEmails.push(
            sendPortalNotificationEmail({
              to: employeeContact.email,
              subject: 'Your self-review is ready',
              heading: 'Self-review ready',
              paragraphs: [
                `${actorName} moved your review to self-review.`,
                'Open the OKRs & KPIs page to complete your self-assessment.',
              ],
              actionLabel: 'Open OKRs & KPIs',
              actionUrl: appBaseUrl ? `${appBaseUrl}${getPerformancePathForRole(employeeContact.role)}` : undefined,
            })
          );
        }
      }

      if (
        data.status === 'manager_review' &&
        reviewerContact?.userId &&
        reviewerContact.userId !== user.id &&
        reviewerContact.userId !== employeeContact?.userId
      ) {
        createNotification({
          userId: reviewerContact.userId,
          type: 'system' as NotificationType,
          title: 'Manager review ready',
          message: `${reviewSubjectName} submitted a self-review and is ready for your review.`,
          link: getPerformancePathForRole(reviewerContact.role),
          metadata: { reviewId: data.id, employeeId: data.employee_id, cycleId: data.cycle_id, status: data.status },
          sendEmail: false,
        });

        if (reviewerContact.email && gmailEnabledUserIds.has(reviewerContact.userId)) {
          pendingEmails.push(
            sendPortalNotificationEmail({
              to: reviewerContact.email,
              subject: 'A review is ready for your review',
              heading: 'Manager review required',
              paragraphs: [
                `${reviewSubjectName} submitted a self-review and is ready for your review.`,
                'Open the OKRs & KPIs workspace to complete your manager review.',
              ],
              actionLabel: 'Open OKRs & KPIs',
              actionUrl: appBaseUrl ? `${appBaseUrl}${getPerformancePathForRole(reviewerContact.role)}` : undefined,
            })
          );
        }
      }

      if (data.status === 'completed') {
        if (employeeContact?.userId && employeeContact.userId !== user.id) {
          createNotification({
            userId: employeeContact.userId,
            type: 'system' as NotificationType,
            title: 'Review completed',
            message: `${actorName} completed your review.`,
            link: getPerformancePathForRole(employeeContact.role),
            metadata: { reviewId: data.id, employeeId: data.employee_id, cycleId: data.cycle_id, status: data.status },
            sendEmail: false,
          });

          if (employeeContact.email && gmailEnabledUserIds.has(employeeContact.userId)) {
            pendingEmails.push(
              sendPortalNotificationEmail({
                to: employeeContact.email,
                subject: 'Your review has been completed',
                heading: 'Review completed',
                paragraphs: [
                  `${actorName} completed your review.`,
                  'Open the OKRs & KPIs page to review the current outcome and next steps.',
                ],
                actionLabel: 'Open OKRs & KPIs',
                actionUrl: appBaseUrl ? `${appBaseUrl}${getPerformancePathForRole(employeeContact.role)}` : undefined,
              })
            );
          }
        }
      }
    }

    if (pendingEmails.length > 0) {
      await Promise.allSettled(pendingEmails);
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('PATCH /api/performance/reviews error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
