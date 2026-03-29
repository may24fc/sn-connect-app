import { createSupabaseServerClient } from '@/lib/supabase/server';
import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const adminRoles = ['admin', 'super_admin'] as const;

const flowTypeSchema = z.enum(['onboarding', 'offboarding']);
const scopeSchema = z.enum(['employee', 'intern', 'default']);

const onboardingTemplateTaskSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1),
  description: z.string().optional().nullable(),
  category: z.string().min(1),
  isRequired: z.boolean(),
  dueDaysFromStart: z.number().int().min(1).max(365),
  requiresSubmission: z.boolean().default(false),
  submissionType: z.enum(['none', 'link', 'document', 'link_or_document']).default('none'),
  submissionLabel: z.string().optional().nullable(),
  submissionDescription: z.string().optional().nullable(),
  referenceUrl: z.string().url().optional().nullable(),
});

const offboardingTemplateTaskSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1),
  description: z.string().optional().nullable(),
  category: z.string().min(1),
  dueDate: z.string().date().optional().nullable(),
  ownerType: z.enum(['employee', 'internal']).default('employee'),
});

const updateTemplateSchema = z.object({
  tasks: z.array(z.unknown()),
});

function isMissingChecklistTemplatesTableError(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const code = 'code' in error ? error.code : null;
  const message = 'message' in error ? error.message : null;

  return (
    code === 'PGRST205' &&
    typeof message === 'string' &&
    message.includes('public.checklist_templates')
  );
}

function isValidScope(flowType: z.infer<typeof flowTypeSchema>, scope: z.infer<typeof scopeSchema>): boolean {
  if (flowType === 'onboarding') {
    return scope === 'employee' || scope === 'intern';
  }

  return scope === 'default';
}

function parseTasks(flowType: z.infer<typeof flowTypeSchema>, tasks: Array<unknown>) {
  return flowType === 'onboarding'
    ? z.array(onboardingTemplateTaskSchema).safeParse(tasks)
    : z.array(offboardingTemplateTaskSchema).safeParse(tasks);
}

async function getAuthedChecklistTemplateContext() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return { supabase, user: null, role: null, error: 'Unauthorized' as const };
  }

  let role: string | null = null;
  if (typeof user.app_metadata?.db_role === 'string') {
    role = user.app_metadata.db_role;
  }

  if (!role) {
    const { data: roleData, error: roleError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .is('deleted_at', null)
      .maybeSingle();

    if (roleError) {
      return {
        supabase,
        user,
        role: null,
        error: 'Failed to resolve user role' as const,
      };
    }

    role = roleData?.role ?? null;
  }

  return { supabase, user, role, error: null };
}

function getRequestTarget(request: NextRequest) {
  const flowTypeParam = request.nextUrl.searchParams.get('flowType');
  const scopeParam = request.nextUrl.searchParams.get('scope');

  const flowType = flowTypeSchema.safeParse(flowTypeParam);
  const scope = scopeSchema.safeParse(scopeParam);

  if (!flowType.success || !scope.success) {
    return {
      error: NextResponse.json({ error: 'Invalid flowType or scope' }, { status: 400 }),
      flowType: null,
      scope: null,
    };
  }

  if (!isValidScope(flowType.data, scope.data)) {
    return {
      error: NextResponse.json(
        { error: 'Invalid scope for the requested flow type' },
        { status: 400 }
      ),
      flowType: null,
      scope: null,
    };
  }

  return { error: null, flowType: flowType.data, scope: scope.data };
}

export async function GET(request: NextRequest) {
  try {
    const { supabase, user, role, error } = await getAuthedChecklistTemplateContext();
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!role || !adminRoles.includes(role as (typeof adminRoles)[number])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const target = getRequestTarget(request);
    if (target.error || !target.flowType || !target.scope) {
      return target.error;
    }

    const { data, error: queryError } = await supabase
      .from('checklist_templates')
      .select('id, flow_type, scope, tasks, created_at, updated_at')
      .eq('flow_type', target.flowType)
      .eq('scope', target.scope)
      .maybeSingle();

    if (queryError) {
      if (isMissingChecklistTemplatesTableError(queryError)) {
        return NextResponse.json({
          data: {
            flowType: target.flowType,
            scope: target.scope,
            tasks: [],
            isPersisted: false,
          },
        });
      }

      console.error('GET /api/checklist-templates error:', queryError);
      return NextResponse.json({ error: 'Failed to fetch checklist template' }, { status: 500 });
    }

    return NextResponse.json({
      data: {
        flowType: target.flowType,
        scope: target.scope,
        tasks: Array.isArray(data?.tasks) ? data.tasks : [],
        isPersisted: Boolean(data?.id),
        id: data?.id ?? null,
        createdAt: data?.created_at ?? null,
        updatedAt: data?.updated_at ?? null,
      },
    });
  } catch (error) {
    console.error('GET /api/checklist-templates unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { supabase, user, role, error } = await getAuthedChecklistTemplateContext();
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!role || !adminRoles.includes(role as (typeof adminRoles)[number])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const target = getRequestTarget(request);
    if (target.error || !target.flowType || !target.scope) {
      return target.error;
    }

    const body = await request.json();
    const parsedBody = updateTemplateSchema.safeParse(body);

    if (!parsedBody.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: parsedBody.error.flatten() },
        { status: 400 }
      );
    }

    const parsedTasks = parseTasks(target.flowType, parsedBody.data.tasks);
    if (!parsedTasks.success) {
      return NextResponse.json(
        { error: 'Invalid template tasks', details: parsedTasks.error.flatten() },
        { status: 400 }
      );
    }

    const { data, error: upsertError } = await supabase
      .from('checklist_templates')
      .upsert(
        {
          flow_type: target.flowType,
          scope: target.scope,
          tasks: parsedTasks.data,
          created_by: user.id,
        },
        { onConflict: 'flow_type,scope' }
      )
      .select('id, flow_type, scope, tasks, created_at, updated_at')
      .single();

    if (upsertError) {
      if (isMissingChecklistTemplatesTableError(upsertError)) {
        return NextResponse.json(
          { error: 'Checklist template feature is not available in this environment' },
          { status: 503 }
        );
      }

      console.error('PUT /api/checklist-templates error:', upsertError);
      return NextResponse.json({ error: 'Failed to save checklist template' }, { status: 500 });
    }

    return NextResponse.json({
      data: {
        id: data.id,
        flowType: data.flow_type,
        scope: data.scope,
        tasks: Array.isArray(data.tasks) ? data.tasks : [],
        isPersisted: true,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      },
    });
  } catch (error) {
    console.error('PUT /api/checklist-templates unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}