import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  getAuthedOnboardingContext,
  isMissingOnboardingChecklistsTableError,
  isOnboardingAdmin,
} from './_lib';

interface OnboardingChecklistRow {
  id: string;
  employee_id: string;
  status: 'not_started' | 'in_progress' | 'completed';
  created_at: string;
  updated_at: string;
}

interface OnboardingTaskRow {
  id: string;
  checklist_id: string;
  title: string;
  description: string | null;
  category: string;
  is_required: boolean;
  due_days_from_start: number;
  requires_submission: boolean;
  submission_type: 'none' | 'link' | 'document' | 'link_or_document';
  submission_label: string | null;
  submission_description: string | null;
  reference_url: string | null;
  is_completed: boolean;
  created_at: string;
  updated_at: string;
}

const onboardingTaskInputSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional().nullable(),
  category: z.string().min(1),
  isRequired: z.boolean().default(true),
  dueDaysFromStart: z.number().int().min(1).max(365).default(7),
  assignedTo: z.string().uuid().optional().nullable(),
  requiresSubmission: z.boolean().default(false),
  submissionType: z.enum(['none', 'link', 'document', 'link_or_document']).default('none'),
  submissionLabel: z.string().optional().nullable(),
  submissionDescription: z.string().optional().nullable(),
  referenceUrl: z.string().url().optional().nullable(),
});

function normalizeTaskInput(task: z.infer<typeof onboardingTaskInputSchema>) {
  if (task.requiresSubmission && task.submissionType === 'none') {
    throw new Error('Submission type is required when proof is required.');
  }

  return {
    title: task.title,
    description: task.description ?? null,
    category: task.category,
    is_required: task.isRequired,
    due_days_from_start: task.dueDaysFromStart,
    assigned_to: task.assignedTo ?? null,
    requires_submission: task.requiresSubmission,
    submission_type: task.requiresSubmission ? task.submissionType : 'none',
    submission_label: task.requiresSubmission ? task.submissionLabel ?? null : null,
    submission_description: task.requiresSubmission ? task.submissionDescription ?? null : null,
    reference_url: task.referenceUrl ?? null,
  };
}

const createChecklistSchema = z.object({
  employeeId: z.string().uuid(),
  tasks: z.array(onboardingTaskInputSchema).default([]),
});

export async function GET(request: NextRequest) {
  try {
    const { supabase, user, role, error } = await getAuthedOnboardingContext();
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const employeeIdParam = request.nextUrl.searchParams.get('employeeId');
    const employeeId = employeeIdParam
      ? z.string().uuid().safeParse(employeeIdParam).data ?? null
      : null;

    if (employeeIdParam && !employeeId) {
      return NextResponse.json({ error: 'Invalid employeeId' }, { status: 400 });
    }

    let query = supabase
      .from('onboarding_checklists')
      .select('*')
      .order('created_at', { ascending: false });

    if (employeeId) {
      if (!isOnboardingAdmin(role)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      query = query.eq('employee_id', employeeId);
    } else {
      const { data: employee } = await supabase
        .from('employees')
        .select('id')
        .eq('user_id', user.id)
        .is('deleted_at', null)
        .maybeSingle();

      if (!employee?.id) {
        return NextResponse.json({ data: [] });
      }
      query = query.eq('employee_id', employee.id);
    }

    const { data, error: queryError } = await query;
    if (queryError) {
      if (isMissingOnboardingChecklistsTableError(queryError)) {
        return NextResponse.json({ data: [] });
      }

      console.error('GET /api/onboarding checklist query error:', queryError);
      return NextResponse.json({ error: 'Failed to fetch onboarding checklists' }, { status: 500 });
    }

    const checklists = (data ?? []) as Array<OnboardingChecklistRow>;
    const checklistIds = checklists.map((checklist) => checklist.id);

    let tasksByChecklistId = new Map<string, Array<OnboardingTaskRow>>();

    if (checklistIds.length > 0) {
      const { data: tasks, error: tasksError } = await supabase
        .from('onboarding_tasks')
        .select('*')
        .in('checklist_id', checklistIds)
        .order('created_at', { ascending: true });

      if (tasksError) {
        // Return checklist records even when task hydration fails.
        console.error('GET /api/onboarding tasks query error:', tasksError);
      } else {
        tasksByChecklistId = (tasks ?? []).reduce(
          (
            accumulator: Map<string, Array<OnboardingTaskRow>>,
            task: OnboardingTaskRow
          ) => {
            const typedTask = task;
            const existingTasks = accumulator.get(typedTask.checklist_id) ?? [];
            existingTasks.push(typedTask);
            accumulator.set(typedTask.checklist_id, existingTasks);
            return accumulator;
          },
          new Map<string, Array<OnboardingTaskRow>>()
        );
      }
    }

    const hydrated = checklists.map((checklist) => ({
      ...checklist,
      onboarding_tasks: tasksByChecklistId.get(checklist.id) ?? [],
    }));

    return NextResponse.json({ data: hydrated });
  } catch (error) {
    console.error('GET /api/onboarding error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { supabase, user, role, error } = await getAuthedOnboardingContext();
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isOnboardingAdmin(role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const parsed = createChecklistSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const payload = parsed.data;

    const { data: checklist, error: checklistError } = await supabase
      .from('onboarding_checklists')
      .insert({
        employee_id: payload.employeeId,
        status: 'not_started',
      })
      .select('*')
      .single();

    if (checklistError || !checklist) {
      if (isMissingOnboardingChecklistsTableError(checklistError)) {
        return NextResponse.json(
          { error: 'Onboarding checklist feature is not available in this environment' },
          { status: 503 }
        );
      }

      return NextResponse.json({ error: 'Failed to create onboarding checklist' }, { status: 500 });
    }

    if (payload.tasks.length > 0) {
      let tasksPayload;

      try {
        tasksPayload = payload.tasks.map((task) => ({
          checklist_id: checklist.id,
          ...normalizeTaskInput(task),
        }));
      } catch (validationError) {
        return NextResponse.json(
          {
            error:
              validationError instanceof Error ? validationError.message : 'Invalid task payload',
          },
          { status: 400 }
        );
      }

      const { error: tasksError } = await supabase.from('onboarding_tasks').insert(tasksPayload);

      if (tasksError) {
        return NextResponse.json(
          { error: 'Checklist created but failed to create tasks' },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({ data: checklist }, { status: 201 });
  } catch (error) {
    console.error('POST /api/onboarding error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
