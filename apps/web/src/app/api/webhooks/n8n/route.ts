import { createHmac, timingSafeEqual } from 'node:crypto';
import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const webhookPayloadSchema = z.object({
  event: z.string().min(1),
  workflow: z.string().optional(),
  timestamp: z.string().datetime().optional(),
  data: z.unknown().optional(),
});

const ALLOWED_EVENTS = new Set([
  'resources.published',
  'resources.archived',
  'notifications.birthday',
  'notifications.anniversary',
  'notifications.payroll',
  'notifications.probation-ending',
]);

const EVENT_TO_WEBHOOK_PATH: Record<string, string> = {
  'resources.published': '/webhook/resources/published',
  'resources.archived': '/webhook/resources/archived',
  'notifications.birthday': '/webhook/notifications/birthday-reminder',
  'notifications.anniversary': '/webhook/notifications/anniversary-reminder',
  'notifications.payroll': '/webhook/notifications/payroll-reminder',
  'notifications.probation-ending': '/webhook/notifications/probation-ending',
};

const getSecret = (): string => process.env.N8N_WEBHOOK_SECRET ?? '';

const getN8nBaseUrl = (): string => process.env.N8N_WEBHOOK_URL || process.env.N8N_BASE_URL || '';

const buildWebhookUrl = (baseUrl: string, path: string): string => {
  if (!baseUrl) return '';

  const normalizedBase = baseUrl.replace(/\/+$/, '');

  if (normalizedBase.endsWith('/webhook') && path.startsWith('/webhook/')) {
    return `${normalizedBase}${path.replace('/webhook', '')}`;
  }

  return `${normalizedBase}${path.startsWith('/') ? path : `/${path}`}`;
};

const safeCompare = (value: string, expected: string): boolean => {
  if (!(value && expected)) return false;
  const left = Buffer.from(value);
  const right = Buffer.from(expected);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
};

const isAuthenticated = (request: NextRequest, rawBody: string): boolean => {
  const secret = getSecret();
  if (!secret) return false;

  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice('Bearer '.length).trim();
    if (safeCompare(token, secret)) return true;
  }

  const webhookSecret = request.headers.get('x-n8n-webhook-secret');
  if (webhookSecret && safeCompare(webhookSecret, secret)) {
    return true;
  }

  const signature = request.headers.get('x-n8n-signature');
  if (signature) {
    const digest = createHmac('sha256', secret).update(rawBody).digest('hex');
    if (safeCompare(signature, digest)) {
      return true;
    }
  }

  return false;
};

export async function GET() {
  const configuredBaseUrl = getN8nBaseUrl();

  return NextResponse.json({
    name: 'n8n-webhook-validator',
    path: '/api/webhooks/n8n',
    requiredHeaders: ['Authorization: Bearer <N8N_WEBHOOK_SECRET>'],
    allowedEvents: Array.from(ALLOWED_EVENTS),
    dispatch: {
      enabled: Boolean(configuredBaseUrl),
      n8nBaseUrl: configuredBaseUrl || null,
      eventToWebhookPath: EVENT_TO_WEBHOOK_PATH,
    },
    workflowWebhookRoutes: {
      resourcesPublished: '/webhook/resources/published',
      notificationBirthday: '/webhook/notifications/birthday-reminder',
      notificationAnniversary: '/webhook/notifications/anniversary-reminder',
      notificationPayroll: '/webhook/notifications/payroll-reminder',
      notificationProbationEnding: '/webhook/notifications/probation-ending',
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();

    if (!isAuthenticated(request, rawBody)) {
      return NextResponse.json({ error: 'Unauthorized webhook request' }, { status: 401 });
    }

    const parsedJson = rawBody ? JSON.parse(rawBody) : {};
    const parsed = webhookPayloadSchema.safeParse(parsedJson);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid webhook payload', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    if (!ALLOWED_EVENTS.has(parsed.data.event)) {
      return NextResponse.json(
        { error: `Unsupported event: ${parsed.data.event}` },
        { status: 400 }
      );
    }

    const webhookPath = EVENT_TO_WEBHOOK_PATH[parsed.data.event];
    if (!webhookPath) {
      return NextResponse.json(
        { error: `No webhook route configured for event: ${parsed.data.event}` },
        { status: 400 }
      );
    }

    const n8nBaseUrl = getN8nBaseUrl();
    if (!n8nBaseUrl) {
      return NextResponse.json(
        {
          error: 'N8N webhook base URL is not configured',
          requiredEnv: ['N8N_WEBHOOK_URL (preferred) or N8N_BASE_URL'],
        },
        { status: 500 }
      );
    }

    const destinationUrl = buildWebhookUrl(n8nBaseUrl, webhookPath);
    const secret = getSecret();

    const forwardHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-N8N-Webhook-Secret': secret,
    };

    if (secret) {
      forwardHeaders.Authorization = `Bearer ${secret}`;
    }

    const response = await fetch(destinationUrl, {
      method: 'POST',
      headers: forwardHeaders,
      body: JSON.stringify(parsed.data),
      cache: 'no-store',
    });

    const responseText = await response.text();

    if (!response.ok) {
      return NextResponse.json(
        {
          error: 'Failed to dispatch event to n8n webhook',
          event: parsed.data.event,
          destinationUrl,
          n8nStatus: response.status,
          n8nBody: responseText,
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      ok: true,
      event: parsed.data.event,
      workflow: parsed.data.workflow ?? null,
      destinationUrl,
      n8nStatus: response.status,
      n8nBody: responseText || null,
      processedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Unexpected error in POST /api/webhooks/n8n:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
