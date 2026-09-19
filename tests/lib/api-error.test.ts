import {
  ApiError,
  ensureOk,
  getApiErrorStatus,
  getErrorMessage,
  toApiError,
} from '@/lib/api-error';
import { describe, expect, it } from 'vitest';

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('ApiError', () => {
  it('carries the HTTP status alongside the message', () => {
    const error = new ApiError('Forbidden', 403);

    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('ApiError');
    expect(error.status).toBe(403);
    expect(error.message).toBe('Forbidden');
  });
});

describe('toApiError', () => {
  it('prefers the API route error field', async () => {
    const error = await toApiError(jsonResponse({ error: 'Task not found' }, 404), 'Fallback');

    expect(error.status).toBe(404);
    expect(error.message).toBe('Task not found');
  });

  it('falls back when the body has no error field', async () => {
    const error = await toApiError(jsonResponse({}, 500), 'Failed to fetch');

    expect(error.message).toBe('Failed to fetch');
  });

  it('falls back when the body is not JSON', async () => {
    const error = await toApiError(new Response('boom', { status: 502 }), 'Failed to fetch');

    expect(error.status).toBe(502);
    expect(error.message).toBe('Failed to fetch');
  });

  it('keeps validation details when present', async () => {
    const error = await toApiError(
      jsonResponse({ error: 'Invalid request body', details: { fieldErrors: {} } }, 400),
      'Fallback'
    );

    expect(error.details).toEqual({ fieldErrors: {} });
  });
});

describe('ensureOk', () => {
  it('returns the response when it succeeded', async () => {
    const response = jsonResponse({ data: [] }, 200);

    await expect(ensureOk(response, 'Failed')).resolves.toBe(response);
  });

  it('throws an ApiError carrying the status when it failed', async () => {
    await expect(ensureOk(jsonResponse({ error: 'Nope' }, 403), 'Failed')).rejects.toMatchObject({
      name: 'ApiError',
      status: 403,
      message: 'Nope',
    });
  });
});

describe('getApiErrorStatus', () => {
  it('returns the status for an ApiError', () => {
    expect(getApiErrorStatus(new ApiError('Gone', 410))).toBe(410);
  });

  it('returns null for any other error', () => {
    expect(getApiErrorStatus(new Error('boom'))).toBeNull();
    expect(getApiErrorStatus('boom')).toBeNull();
    expect(getApiErrorStatus(null)).toBeNull();
  });
});

describe('getErrorMessage', () => {
  it('uses the error message when present', () => {
    expect(getErrorMessage(new Error('boom'))).toBe('boom');
  });

  it('uses the fallback for non-errors and empty messages', () => {
    expect(getErrorMessage(new Error(''), 'fallback')).toBe('fallback');
    expect(getErrorMessage(undefined, 'fallback')).toBe('fallback');
  });
});
