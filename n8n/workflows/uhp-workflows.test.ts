import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

type WorkflowNode = {
  name: string;
  type: string;
  onError?: string;
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
  const names = ['uhp-herbalife-portal-reminders.json', 'uhp-volume-points-daily-digest.json'];

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
  ])('%s records Telegram failures', (name, sendNodeName, failureNodeName) => {
    const definition = workflow(name);
    const sendNode = definition.nodes.find((node) => node.name === sendNodeName);
    const errorOutputs = definition.connections[sendNodeName]?.main[1] ?? [];

    expect(sendNode?.onError).toBe('continueErrorOutput');
    expect(errorOutputs.some((connection) => connection.node === failureNodeName)).toBe(true);
  });

  it('keeps an explicit no-change daily digest message', () => {
    const definition = workflow('uhp-volume-points-daily-digest.json');
    const code = definition.nodes.find((node) => node.name === 'Build Daily Digest')?.parameters
      .jsCode;
    expect(code).toContain('No changes since the previous digest.');
  });
});
