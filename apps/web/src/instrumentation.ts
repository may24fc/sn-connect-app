import { registerOTel } from '@vercel/otel';

export async function register() {
  if (!process.env.LANGWATCH_API_KEY || process.env.NEXT_RUNTIME !== 'nodejs') {
    return;
  }

  const { LangWatchExporter } = await import('langwatch/observability');

  registerOTel({
    serviceName: 'sn-connect-web',
    traceExporter: new LangWatchExporter({
      apiKey: process.env.LANGWATCH_API_KEY,
    }),
  });
}