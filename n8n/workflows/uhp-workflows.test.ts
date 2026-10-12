import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

type WorkflowNode = {
  name: string;
  type: string;
  onError?: string;
  retryOnFail?: boolean;
  maxTries?: number;
  waitBetweenTries?: number;
  parameters: Record<string, unknown>;
  credentials?: { httpHeaderAuth?: { id: string; name: string } };
};

type Workflow = {
  active: boolean;
  nodes: Array<WorkflowNode>;
  connections: Record<string, { main: Array<Array<{ node: string }>> }>;
};

function workflow(name: string): Workflow {
  return JSON.parse(
    readFileSync(resolve(process.cwd(), 'n8n', 'workflows', name), 'utf8')
  ) as Workflow;
}

describe('UHP n8n workflows', () => {
  const names = [
    'uhp-herbalife-portal-reminders.json',
    'uhp-volume-points-daily-digest.json',
    'uhp-outreach-weekly-summary.json',
  ];

  it.each(names)('%s uses the Control Hub Header Auth credential', (name) => {
    const definition = workflow(name);
    const httpNodes = definition.nodes.filter((node) => node.type === 'n8n-nodes-base.httpRequest');

    expect(definition.active).toBe(false);
    expect(httpNodes.length).toBeGreaterThan(0);
    for (const node of httpNodes) {
      expect(node.parameters).toMatchObject({
        authentication: 'genericCredentialType',
        genericAuthType: 'httpHeaderAuth',
      });
      expect(node.credentials?.httpHeaderAuth?.name).toBe('Control Hub Callback');
    }
    expect(JSON.stringify(definition)).not.toContain('$env.');
  });

  it.each([
    ['uhp-herbalife-portal-reminders.json', 'Send Telegram Reminder', 'Record Reminder Failure'],
    ['uhp-volume-points-daily-digest.json', 'Send Telegram Digest', 'Record Digest Failure'],
    ['uhp-outreach-weekly-summary.json', 'Send Telegram Summary', 'Record Summary Failure'],
  ])('%s records Telegram failures', (name, sendNodeName, failureNodeName) => {
    const definition = workflow(name);
    const sendNode = definition.nodes.find((node) => node.name === sendNodeName);
    const errorOutputs = definition.connections[sendNodeName]?.main[1] ?? [];

    expect(sendNode?.onError).toBe('continueErrorOutput');
    expect(errorOutputs.some((connection) => connection.node === failureNodeName)).toBe(true);
  });

  it.each(names)('%s retries both Control Hub callbacks without retrying Telegram sends', (name) => {
    const definition = workflow(name);
    const callbacks = definition.nodes.filter((node) => node.name.startsWith('Record '));
    const telegram = definition.nodes.find((node) => node.name.startsWith('Send Telegram'));

    expect(callbacks).toHaveLength(2);
    for (const callback of callbacks) {
      expect(callback).toMatchObject({
        retryOnFail: true,
        maxTries: 3,
        waitBetweenTries: 5000,
      });
      expect(callback.parameters.jsonBody).toContain(callback.name.endsWith('Failure') ? "status: 'failed'" : "status: 'sent'");
    }
    expect(telegram?.retryOnFail).not.toBe(true);
  });

  it('keeps an explicit no-change daily digest message', () => {
    const definition = workflow('uhp-volume-points-daily-digest.json');
    const code = definition.nodes.find((node) => node.name === 'Build Daily Digest')?.parameters
      .jsCode;
    expect(code).toContain('No changes since the previous digest.');
  });

  it('formats the volume digest as a scannable Telegram message, including no-change days', () => {
    const definition = workflow('uhp-volume-points-daily-digest.json');
    const code = definition.nodes.find((node) => node.name === 'Build Daily Digest')?.parameters.jsCode as string;
    const format = new Function('$json', '$', code) as (input: unknown, lookup: unknown) => Array<{ json: { telegramText: string; intervalStartedAt: string } }>;
    const lookup = () => ({ first: () => ({ json: { destinationsJson: '[{"key":"test","chatId":"123"}]', controlHubUrl: 'https://example.com' } }) });
    const digest = { reportingMonth: '2026-10-01', categories: [{ label: 'Repeat Customers', actualVp: 99.8, targetVp: 0 }], totalActualVp: 99.8, changeCount: 0, intervalStartedAt: '2026-10-11T00:00:00Z', intervalEndedAt: '2026-10-12T00:00:00Z' };

    expect(format({ data: digest }, lookup)[0].json.telegramText).toBe([
      '📊 UHP volume points', 'October 2026', '', 'TOTAL  99.8 VP', '', 'BREAKDOWN',
      '• Repeat Customers: 99.8 VP / target 0 VP', '', 'No changes since the previous digest.',
    ].join('\n'));
    expect(format({ data: { ...digest, changeCount: 1 } }, lookup)[0].json.telegramText).toContain('1 updated entry since the previous digest.');
    expect(format({ data: { ...digest, intervalStartedAt: '2026-10-12T02:41:00.41+00:00' } }, lookup)[0].json.intervalStartedAt).toBe('2026-10-12T02:41:00.410Z');
  });

  it('groups outreach figures without dropping metrics', () => {
    const definition = workflow('uhp-outreach-weekly-summary.json');
    const code = definition.nodes.find((node) => node.name === 'Build Weekly Summary')?.parameters.jsCode as string;
    const format = new Function('$json', '$', code) as (input: unknown, lookup: unknown) => Array<{ json: { telegramText: string } }>;
    const lookup = () => ({ first: () => ({ json: { destinationsJson: '[{"key":"test","chatId":"123"}]', controlHubUrl: 'https://example.com' } }) });
    const summary = { clientsReachedOut: 36, outreachAttempts: 38, clientsReplied: 11, responseRate: 25, noResponse: 27, interested: 1, declined: 2, newClients: 38, wellnessEvaluationsScheduled: 0, callsScheduled: 0 };
    const message = format({ data: { intervalStartedAt: '2026-10-05T00:00:00Z', intervalEndedAt: '2026-10-12T00:00:00Z', summary } }, lookup)[0].json.telegramText;

    expect(message).toContain('Weekly summary · Oct 5 – Oct 12');
    expect(message).toContain('\n\nREACH & RESPONSE\n');
    expect(message).toContain('\n\nPROSPECTS\n');
    expect(message).toContain('\n\nBOOKINGS\n');
    for (const value of ['36 (38 messages)', '11 · Response rate: 25%', '27', '1 · Declined: 2', '38', 'Wellness evaluations: 0 · Calls: 0']) {
      expect(message).toContain(value);
    }
  });

  it.each(names)('%s sends UTC timestamps to the Control Hub callback', (name) => {
    const definition = workflow(name);
    const sentCallback = definition.nodes.find((node) => node.name.startsWith('Record ') && node.name.endsWith(' Run'));
    expect(sentCallback?.parameters.jsonBody).toContain('sentAt: $now.toUTC().toISO()');
  });

  it('builds reminder scheduledFor in UTC for the API schema', () => {
    const definition = workflow('uhp-herbalife-portal-reminders.json');
    const code = definition.nodes.find((node) => node.name === "Build Today's Reminders")?.parameters.jsCode;
    expect(code).toContain('scheduledFor: now.toUTC().toISO()');
  });
});
