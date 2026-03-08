import { z } from 'zod';

/**
 * Validated environment variables for Supabase Edge Functions.
 *
 * Uses Zod for strict validation at startup. Throws a descriptive error
 * if any required variable is missing or invalid.
 */

const edgeFunctionEnv = z.object({
  SUPABASE_URL: z.string().url('SUPABASE_URL must be a valid URL'),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, 'SUPABASE_SERVICE_ROLE_KEY is required'),
  RESEND_API_KEY: z.string().startsWith('re_', "RESEND_API_KEY must start with 're_'"),
  ADMIN_SECRET_KEY: z
    .string()
    .min(32, 'ADMIN_SECRET_KEY must be at least 32 characters')
    .optional(),
  // Uncomment when Telegram workspace is ready:
  // TELEGRAM_BOT_TOKEN: z.string().optional(),
  // TELEGRAM_CHAT_ID: z.string().optional(),
});

export type EdgeFunctionEnv = z.infer<typeof edgeFunctionEnv>;

function loadEnv(): EdgeFunctionEnv {
  const raw: Record<string, string | undefined> = {
    SUPABASE_URL: Deno.env.get('SUPABASE_URL'),
    SUPABASE_SERVICE_ROLE_KEY: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
    RESEND_API_KEY: Deno.env.get('RESEND_API_KEY'),
    ADMIN_SECRET_KEY: Deno.env.get('ADMIN_SECRET_KEY'),
  };

  const parsed = edgeFunctionEnv.safeParse(raw);

  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `  ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    throw new Error(`Invalid Edge Function environment variables:\n${issues}`);
  }

  return parsed.data;
}

/**
 * Validated environment singleton.
 * Access any env var as `env.SUPABASE_URL`, etc.
 */
export const env: EdgeFunctionEnv = loadEnv();
