import { beforeEach, describe, expect, it, vi } from 'vitest';

const create = vi.fn();

vi.mock('openai', () => ({
  default: vi.fn().mockImplementation(() => ({ chat: { completions: { create } } })),
}));

const { streamCompletion } = await import('@hr-portal/ai');

async function* chunks() {
  yield { choices: [{ delta: { content: 'Hello' } }] };
  yield { choices: [{ delta: { content: ' team' } }] };
  yield { choices: [], usage: { prompt_tokens: 120, completion_tokens: 4 } };
}

async function collect(generator: AsyncGenerator<unknown>) {
  const events: Array<unknown> = [];
  for await (const event of generator) events.push(event);
  return events;
}

describe('streamCompletion', () => {
  beforeEach(() => {
    create.mockReset();
  });

  it('sends the system prompt verbatim and streams deltas with usage', async () => {
    create.mockResolvedValue(chunks());
    const controller = new AbortController();

    const events = await collect(
      streamCompletion({
        systemPrompt: 'Custom insights prompt',
        messages: [{ role: 'user', content: 'Who is pending?' }],
        model: 'test-model',
        maxTokens: 50,
        signal: controller.signal,
      })
    );

    expect(events).toEqual([
      { type: 'text_delta', text: 'Hello' },
      { type: 'text_delta', text: ' team' },
      { type: 'done', usage: { inputTokens: 120, outputTokens: 4 } },
    ]);

    const [params, options] = create.mock.calls[0] as [
      Record<string, unknown>,
      { signal: AbortSignal },
    ];
    expect(params.messages).toEqual([
      { role: 'system', content: 'Custom insights prompt' },
      { role: 'user', content: 'Who is pending?' },
    ]);
    expect(params).not.toHaveProperty('temperature');
    expect(params.max_completion_tokens).toBe(50);
    expect(options.signal).toBe(controller.signal);
  });

  it('includes temperature only when set and reports upstream errors', async () => {
    create.mockRejectedValue(new Error('rate limited'));

    const events = await collect(
      streamCompletion({ systemPrompt: 'p', messages: [], temperature: 0.2 })
    );

    expect(events).toEqual([{ type: 'error', error: 'rate limited' }]);
    expect(create.mock.calls[0]?.[0]).toMatchObject({ temperature: 0.2 });
    expect(create.mock.calls[0]?.[1]).toBeUndefined();
  });
});
