import { z } from 'zod';

const envSchema = z.object({
  // Supabase
  NEXT_PUBLIC_SUPABASE_URL: z.string().url('NEXT_PUBLIC_SUPABASE_URL must be a valid URL'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, 'NEXT_PUBLIC_SUPABASE_ANON_KEY is required'),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, 'SUPABASE_SERVICE_ROLE_KEY is required'),

  // OpenAI
  OPENAI_API_KEY: z
    .string()
    .startsWith('sk-', "OPENAI_API_KEY must start with 'sk-'"),

  // JWT
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters for security'),

  // Resend (transactional email)
  RESEND_API_KEY: z.string().startsWith('re_', "RESEND_API_KEY must start with 're_'"),

  // Vercel Cron
  CRON_SECRET: z.string().min(16, 'CRON_SECRET must be at least 16 characters'),

  // Edge Function admin auth (optional — used for manual Edge Function invocation)
  ADMIN_SECRET_KEY: z
    .string()
    .min(32, 'ADMIN_SECRET_KEY must be at least 32 characters')
    .optional(),

  // Telegram (future — uncomment when workspace is set up)
  // TELEGRAM_BOT_TOKEN: z.string().optional(),
  // TELEGRAM_CHAT_ID: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

function createEnv(): Env {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    console.error('Invalid environment variables:');
    for (const issue of parsed.error.issues) {
      console.error(`  ${issue.path.join('.')}: ${issue.message}`);
    }
    throw new Error('Invalid environment variables');
  }

  return parsed.data;
}

export const env = createEnv();
