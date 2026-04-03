import { logActivity } from '@/lib/audit';
import { sendPortalNotificationEmail } from '@/lib/email';
import {
  createNotification,
  getUserDisplayName,
  type NotificationType,
} from '@/lib/notifications/create-notification';
import {
  getEmployeeContactByEmployeeId,
  getPerformancePathForRole,
  getUserContactByUserId,
} from '@/lib/notifications/recipients';
import {
  createPerformanceReviewSchema,
  updatePerformanceReviewSchema,
} from '@/lib/schemas/performance.schema';
import { type NextRequest, NextResponse } from 'next/server';
import { getAuthedPerformanceContext, isPerformanceAdmin, resolveEmployeeIdForUser } from '../_lib';

export async function GET(request: NextRequest) {
  try {
    const { supabase, user, role, error } = await getAuthedPerformanceContext();
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const cycleId = searchParams.get('cycleId') || undefined;
    const status = searchParams.get('status') || undefined;
    const explicitEmployeeId = searchParams.get('employeeId') || undefined;

    let employeeId: string | null | undefined = explicitEmployeeId;
    if (!employeeId && !isPerformanceAdmin(role)) {
      employeeId = await resolveEmployeeIdForUser(supabase, user.id);
      if (!employeeId) {
        return NextResponse.json({ data: [] });
      }
    }

    let query = supabase
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
      return NextResponse.json({ error: 'Failed to fetch performance reviews' }, { status: 500 });
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
    if (!isPerformanceAdmin(role)) {
      const ownEmployeeId = await resolveEmployeeIdForUser(supabase, user.id);
      if (!ownEmployeeId) {
        return NextResponse.json({ error: 'No employee profile found' }, { status: 400 });
      }
      employeeId = ownEmployeeId;
    }

    const { data, error: insertError } = await supabaseAdmin
      .from('performance_reviews')
      .insert({
        cycle_id: parsed.data.cycleId,
        employee_id: employeeId,
        reviewer_id: parsed.data.reviewerId || null,
        status: parsed.data.status,
        self_rating: parsed.data.selfRating || null,
        self_comments: parsed.data.selfComments || null,
        manager_rating: parsed.data.managerRating || null,
        manager_comments: parsed.data.managerComments || null,
        final_rating: parsed.data.finalRating || null,
        goals_for_next_period: parsed.data.goalsForNextPeriod || null,
      })
      .select('*')
      .single();

    if (insertError || !data) {
      return NextResponse.json({ error: 'Failed to create performance review' }, { status: 500 });
    }

    logActivity(supabaseAdmin, {
      userId: user.id,
      action: 'create_performance_review',
      tableName: 'performance_reviews',
      recordId: data.id,
      metadata: { employeeId: data.employee_id, cycleId: data.cycle_id },
    });

    const [employeeContact, reviewerContact, actorName] = await Promise.all([
      getEmployeeContactByEmployeeId(data.employee_id),
      data.reviewer_id ? getUserContactByUserId(data.reviewer_id) : Promise.resolve(null),
      getUserDisplayName(user.id),
    ]);

    if (employeeContact?.userId && employeeContact.userId !== user.id) {
      createNotification({
        userId: employeeContact.userId,
        type: 'system' as NotificationType,
        title: 'Performance review assigned',
        message: `${actorName} created a performance review for you.`,
        link: getPerformancePathForRole(employeeContact.role),
        metadata: { reviewId: data.id, cycleId: data.cycle_id, status: data.status },
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
        title: 'Performance review assigned',
        message: `${actorName} assigned you to review ${employeeContact?.name || 'an employee'}.`,
        link: getPerformancePathForRole(reviewerContact.role),
        metadata: { reviewId: data.id, employeeId: data.employee_id, cycleId: data.cycle_id, status: data.status },
      });
    }

    const appBaseUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.APP_URL || '';
    await Promise.allSettled([
      ...(employeeContact?.email && employeeContact.userId !== user.id
        ? [
            sendPortalNotificationEmail({
              to: employeeContact.email,
              subject: 'A performance review has been assigned to you',
              heading: 'Performance review assigned',
              paragraphs: [
                `${actorName} created a performance review for you.`,
                'Open the performance page to review the current status and complete the next required step.',
              ],
              actionLabel: 'Open performance',
              actionUrl: appBaseUrl ? `${appBaseUrl}${getPerformancePathForRole(employeeContact.role)}` : undefined,
            }),
          ]
        : []),
      ...(reviewerContact?.email &&
      reviewerContact.userId !== user.id &&
      reviewerContact.userId !== employeeContact?.userId
        ? [
            sendPortalNotificationEmail({
              to: reviewerContact.email,
              subject: 'You have been assigned a performance review',
              heading: 'Performance review assigned',
              paragraphs: [
                `${actorName} assigned you to review ${employeeContact?.name || 'an employee'}.`,
                'Open the performance workspace to review and complete your part of the evaluation.',
              ],
              actionLabel: 'Open performance reviews',
              actionUrl: appBaseUrl ? `${appBaseUrl}${getPerformancePathForRole(reviewerContact.role)}` : undefined,
            }),
          ]
        : []),
    ]);

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    console.error('POST /api/performance/reviews error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { supabase, user, error } = await getAuthedPerformanceContext();
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

    const { data: existingReview, error: existingError } = await supabase
      .from('performance_reviews')
      .select('id, employee_id, reviewer_id, status, cycle_id')
      .eq('id', parsed.data.id)
      .single();

    if (existingError || !existingReview) {
      return NextResponse.json({ error: 'Performance review not found' }, { status: 404 });
    }

    const payload: Record<string, unknown> = {};
    if (parsed.data.status !== undefined) payload.status = parsed.data.status;
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

    const { data, error: updateError } = await supabase
      .from('performance_reviews')
      .update(payload)
      .eq('id', parsed.data.id)
      .select('*')
      .single();

    if (updateError || !data) {
      return NextResponse.json({ error: 'Failed to update performance review' }, { status: 500 });
    }

    logActivity(supabase, {
      userId: user.id,
      action: 'update_performance_review',
      tableName: 'performance_reviews',
      recordId: parsed.data.id,
      metadata: { status: data.status },
    });

    const [employeeContact, reviewerContact, actorName] = await Promise.all([
      getEmployeeContactByEmployeeId(data.employee_id),
      data.reviewer_id ? getUserContactByUserId(data.reviewer_id) : Promise.resolve(null),
      getUserDisplayName(user.id),
    ]);

    const statusChanged = parsed.data.status !== undefined && parsed.data.status !== existingReview.status;
    const reviewerChanged = parsed.data.reviewerId !== undefined && parsed.data.reviewerId !== existingReview.reviewer_id;
    const appBaseUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.APP_URL || '';
    const pendingEmails: Array<Promise<{ sent: boolean; error?: string }>> = [];

    if (
      reviewerChanged &&
      reviewerContact?.userId &&
      reviewerContact.userId !== user.id &&
      reviewerContact.userId !== employeeContact?.userId
    ) {
      createNotification({
        userId: reviewerContact.userId,
        type: 'system' as NotificationType,
        title: 'Performance review assigned',
        message: `${actorName} assigned you to review ${employeeContact?.name || 'an employee'}.`,
        link: getPerformancePathForRole(reviewerContact.role),
        metadata: { reviewId: data.id, employeeId: data.employee_id, cycleId: data.cycle_id, status: data.status },
      });

      if (reviewerContact.email) {
        pendingEmails.push(
          sendPortalNotificationEmail({
            to: reviewerContact.email,
            subject: 'You have been assigned a performance review',
            heading: 'Performance review assigned',
            paragraphs: [
              `${actorName} assigned you to review ${employeeContact?.name || 'an employee'}.`,
              'Open the performance workspace to review and complete your part of the evaluation.',
            ],
            actionLabel: 'Open performance reviews',
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
          title: 'Performance self-review ready',
          message: `${actorName} moved your performance review to self-review.`,
          link: getPerformancePathForRole(employeeContact.role),
          metadata: { reviewId: data.id, employeeId: data.employee_id, cycleId: data.cycle_id, status: data.status },
        });

        if (employeeContact.email) {
          pendingEmails.push(
            sendPortalNotificationEmail({
              to: employeeContact.email,
              subject: 'Your performance self-review is ready',
              heading: 'Performance self-review ready',
              paragraphs: [
                `${actorName} moved your performance review to self-review.`,
                'Open the performance page to complete your self-assessment.',
              ],
              actionLabel: 'Open performance',
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
          title: 'Performance review ready for manager review',
          message: `${employeeContact?.name || 'An employee'} submitted a self-review and is ready for your review.`,
          link: getPerformancePathForRole(reviewerContact.role),
          metadata: { reviewId: data.id, employeeId: data.employee_id, cycleId: data.cycle_id, status: data.status },
        });

        if (reviewerContact.email) {
          pendingEmails.push(
            sendPortalNotificationEmail({
              to: reviewerContact.email,
              subject: 'A performance review is ready for your review',
              heading: 'Manager review required',
              paragraphs: [
                `${employeeContact?.name || 'An employee'} submitted a self-review and is ready for your review.`,
                'Open the performance workspace to complete your manager review.',
              ],
              actionLabel: 'Open performance reviews',
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
            title: 'Performance review completed',
            message: `${actorName} completed your performance review.`,
            link: getPerformancePathForRole(employeeContact.role),
            metadata: { reviewId: data.id, employeeId: data.employee_id, cycleId: data.cycle_id, status: data.status },
          });

          if (employeeContact.email) {
            pendingEmails.push(
              sendPortalNotificationEmail({
                to: employeeContact.email,
                subject: 'Your performance review has been completed',
                heading: 'Performance review completed',
                paragraphs: [
                  `${actorName} completed your performance review.`,
                  'Open the performance page to review the current outcome and next steps.',
                ],
                actionLabel: 'Open performance',
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
