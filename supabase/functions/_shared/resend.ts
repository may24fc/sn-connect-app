/**
 * Transactional email via Resend.
 *
 * Uses the Resend HTTP API directly (no SDK dependency needed in Deno).
 * Includes 1 retry with exponential backoff on failure.
 */

interface SendEmailParams {
  to: string | string[];
  subject: string;
  html: string;
  from?: string;
}

interface SendEmailResult {
  id: string;
}

const DEFAULT_FROM = 'SN Connect <no-reply@sngroup.com.au>';
const RESEND_API_URL = 'https://api.resend.com/emails';
const MAX_RETRIES = 1;
const BASE_BACKOFF_MS = 1000;

export async function sendEmail(params: SendEmailParams): Promise<SendEmailResult> {
  const apiKey = Deno.env.get('RESEND_API_KEY');
  if (!apiKey) {
    throw new Error('Missing RESEND_API_KEY environment variable');
  }

  const payload = {
    from: params.from ?? DEFAULT_FROM,
    to: Array.isArray(params.to) ? params.to : [params.to],
    subject: params.subject,
    html: params.html,
  };

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      if (attempt > 0) {
        const backoffMs = BASE_BACKOFF_MS * 2 ** (attempt - 1);
        await new Promise((resolve) => setTimeout(resolve, backoffMs));
      }

      const response = await fetch(RESEND_API_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Resend API error (${response.status}): ${errorBody}`);
      }

      const result = (await response.json()) as SendEmailResult;
      return result;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.error(
        `[resend] Email send attempt ${attempt + 1}/${MAX_RETRIES + 1} failed:`,
        lastError.message
      );
    }
  }

  throw lastError ?? new Error('Failed to send email via Resend');
}
