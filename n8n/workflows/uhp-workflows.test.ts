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
  settings: { timezone?: string };
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

  it.each(names)(
    '%s retries both Control Hub callbacks without retrying Telegram sends',
    (name) => {
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
        expect(callback.parameters.jsonBody).toContain(
          callback.name.endsWith('Failure') ? "status: 'failed'" : "status: 'sent'"
        );
      }
      expect(telegram?.retryOnFail).not.toBe(true);
    }
  );

  it('keeps an explicit no-change daily digest message', () => {
    const definition = workflow('uhp-volume-points-daily-digest.json');
    const code = definition.nodes.find((node) => node.name === 'Build Daily Digest')?.parameters
      .jsCode;
    expect(code).toContain('No changes since the previous digest.');
  });

  it('accepts authenticated manual Volume Points sends with unique delivery keys', () => {
    const definition = workflow('uhp-volume-points-daily-digest.json');
    const webhook = definition.nodes.find((node) => node.name === 'Manual Send Webhook');
    const configure = definition.nodes.find(
      (node) => node.name === 'Configure Telegram Destinations'
    );
    const callbacks = definition.nodes.filter((node) => node.name.startsWith('Record Digest'));

    expect(webhook).toMatchObject({
      type: 'n8n-nodes-base.webhook',
      parameters: {
        httpMethod: 'POST',
        path: 'uhp-volume-points-manual-send',
        authentication: 'headerAuth',
      },
      credentials: { httpHeaderAuth: { name: 'Control Hub Callback' } },
    });
    expect(definition.connections['Manual Send Webhook']?.main[0]).toContainEqual({
      node: 'Configure Telegram Destinations',
      type: 'main',
      index: 0,
    });
    expect(JSON.stringify(configure?.parameters)).toContain("'manual'");
    for (const callback of callbacks) {
      expect(callback.parameters.jsonBody).toContain('vp-digest:manual:${$execution.id}');
    }
  });

  it('formats the volume digest as a scannable Telegram message, including no-change days', () => {
    const definition = workflow('uhp-volume-points-daily-digest.json');
    const code = definition.nodes.find((node) => node.name === 'Build Daily Digest')?.parameters
      .jsCode as string;
    const format = new Function('$json', '$', code) as (
      input: unknown,
      lookup: unknown
    ) => Array<{ json: { telegramText: string; intervalStartedAt: string } }>;
    const lookup = () => ({
      first: () => ({
        json: {
          destinationsJson: '[{"key":"test","chatId":"123"}]',
          controlHubUrl: 'https://example.com',
        },
      }),
    });
    const digest = {
      reportingMonth: '2026-10-01',
      categories: [{ label: 'Repeat Customers', actualVp: 99.8, targetVp: 200 }],
      monthlyEntries: [
        { member_name: 'Jordan', volume_points: 10 },
        { member_name: 'Alex', volume_points: 40 },
        { member_name: 'Alex', volume_points: 2.5 },
      ],
      changedEntries: [],
      totalActualVp: 99.8,
      changeCount: 0,
      intervalStartedAt: '2026-10-11T00:00:00Z',
      intervalEndedAt: '2026-10-12T00:00:00Z',
    };

    const noChangeMessage = format({ data: digest }, lookup)[0].json.telegramText;
    expect(noChangeMessage).toContain('Repeat Customers: 99.8 VP');
    expect(noChangeMessage).toContain('WHO ORDERED\n');
    expect(noChangeMessage).toContain('NAME | VP');
    expect(noChangeMessage).toContain('Alex | 42.5 VP');
    expect(noChangeMessage).toContain('Jordan | 10 VP');
    expect(noChangeMessage).toContain('No changes since the previous digest.');
    expect(noChangeMessage).not.toContain('target');

    const changedMessage = format(
      {
        data: {
          ...digest,
          changeCount: 3,
          changedEntries: [
            { member_name: 'Alex', volume_points: 40 },
            { member_name: 'Alex', volume_points: 2.5 },
            { member_name: 'Jordan', volume_points: 10 },
          ],
        },
      },
      lookup
    )[0].json.telegramText;
    expect(changedMessage).toContain('Alex | 42.5 VP');
    expect(changedMessage).toContain('Jordan | 10 VP');
    expect(changedMessage).toContain('3 updated entries since the previous digest.');
    expect(
      format({ data: { ...digest, intervalStartedAt: '2026-10-12T02:41:00.41+00:00' } }, lookup)[0]
        .json.intervalStartedAt
    ).toBe('2026-10-12T02:41:00.410Z');
  });

  it('groups outreach figures without dropping metrics', () => {
    const definition = workflow('uhp-outreach-weekly-summary.json');
    const code = definition.nodes.find((node) => node.name === 'Build Weekly Summary')?.parameters
      .jsCode as string;
    const format = new Function('$json', '$', code) as (
      input: unknown,
      lookup: unknown
    ) => Array<{ json: { telegramText: string } }>;
    const lookup = () => ({
      first: () => ({
        json: {
          destinationsJson: '[{"key":"test","chatId":"123"}]',
          controlHubUrl: 'https://example.com',
        },
      }),
    });
    const summary = {
      clientsReachedOut: 36,
      outreachAttempts: 38,
      clientsReplied: 11,
      responseRate: 25,
      noResponse: 27,
      interested: 1,
      declined: 2,
      newClients: 38,
      wellnessEvaluationForms: 2,
      wellnessEvaluationCalls: 3,
      wellnessEvaluationsScheduled: 4,
      callsScheduled: 5,
    };
    const message = format(
      {
        data: {
          intervalStartedAt: '2026-10-05T00:00:00Z',
          intervalEndedAt: '2026-10-12T00:00:00Z',
          summary,
        },
      },
      lookup
    )[0].json.telegramText;

    expect(message).toContain('Weekly summary · Oct 5 – Oct 12');
    expect(message).toContain('\n\nREACH & RESPONSE\n');
    expect(message).toContain('\n\nPROSPECTS\n');
    expect(message).toContain('\n\nBOOKINGS\n');
    for (const value of [
      '36 (38 messages)',
      '11 · Response rate: 25%',
      '27',
      '1 · Declined: 2',
      '38',
      'Wellness Evaluation Form: 2',
      'Wellness Evaluation Calls: 3',
      'Calls: 5',
    ]) {
      expect(message).toContain(value);
    }
  });

  it('schedules the outreach summary for 9:00 AM every Friday in Manila', () => {
    const definition = workflow('uhp-outreach-weekly-summary.json');
    const schedule = definition.nodes.find(
      (node) => node.type === 'n8n-nodes-base.scheduleTrigger'
    );

    expect(definition.settings).toMatchObject({ timezone: 'Asia/Manila' });
    expect(JSON.stringify(schedule?.parameters)).toContain('0 9 * * 5');
  });

  it('checks portal reminders daily at 5:30 AM in Manila', () => {
    const definition = workflow('uhp-herbalife-portal-reminders.json');
    const schedule = definition.nodes.find(
      (node) => node.type === 'n8n-nodes-base.scheduleTrigger'
    );

    expect(definition.settings).toMatchObject({ timezone: 'Asia/Manila' });
    expect(schedule?.name).toBe('Daily 05:30 PHT');
    expect(JSON.stringify(schedule?.parameters)).toContain('30 5 * * *');
  });

  it.each(names)('%s sends UTC timestamps to the Control Hub callback', (name) => {
    const definition = workflow(name);
    const sentCallback = definition.nodes.find(
      (node) => node.name.startsWith('Record ') && node.name.endsWith(' Run')
    );
    expect(sentCallback?.parameters.jsonBody).toContain('sentAt: $now.toUTC().toISO()');
  });

  it('builds reminder scheduledFor in UTC for the API schema', () => {
    const definition = workflow('uhp-herbalife-portal-reminders.json');
    const code = definition.nodes.find((node) => node.name === "Build Today's Reminders")
      ?.parameters.jsCode;
    expect(code).toContain('scheduledFor: now.toUTC().toISO()');
  });
});
