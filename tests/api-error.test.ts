import { ApiError, toApiError } from '@/lib/api-error';
import { describe, expect, it } from 'vitest';

describe('toApiError', () => {
  it('prefers actionable validation details over a generic API error', async () => {
    const response = new Response(
      JSON.stringify({
        error: 'Invalid request body',
        details: {
          formErrors: [],
          fieldErrors: {
            marketingContext: ['Plan item must be 1,000 characters or fewer'],
          },
        },
      }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );

    const error = await toApiError(response, 'Failed to save report');

    expect(error).toBeInstanceOf(ApiError);
    expect(error.message).toBe('Plan item must be 1,000 characters or fewer');
    expect(error.status).toBe(400);
  });
});
