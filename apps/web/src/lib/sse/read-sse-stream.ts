import type { z } from 'zod';

/**
 * Reads a `text/event-stream` body of `data: {json}\n\n` frames, validating
 * each payload against `schema`. Frames that fail validation are skipped.
 */
export async function* readSseStream<T>(
  body: ReadableStream<Uint8Array>,
  schema: z.ZodType<T>
): AsyncGenerator<T> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  const parseFrame = (frame: string): T | null => {
    const data = frame
      .split('\n')
      .filter((line) => line.startsWith('data:'))
      .map((line) => line.slice(5).trimStart())
      .join('\n');
    if (!data) return null;

    try {
      const parsed = schema.safeParse(JSON.parse(data) as unknown);
      return parsed.success ? parsed.data : null;
    } catch {
      return null;
    }
  };

  try {
    while (true) {
      const { done, value } = await reader.read();
      buffer += decoder.decode(value, { stream: !done });

      let boundary = buffer.indexOf('\n\n');
      while (boundary !== -1) {
        const event = parseFrame(buffer.slice(0, boundary));
        buffer = buffer.slice(boundary + 2);
        if (event !== null) yield event;
        boundary = buffer.indexOf('\n\n');
      }

      if (done) break;
    }

    const trailing = parseFrame(buffer);
    if (trailing !== null) yield trailing;
  } finally {
    reader.releaseLock();
  }
}
