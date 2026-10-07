/**
 * Feature-agnostic latency sampler for before/after optimization evidence.
 * See docs/guides/latency-measurement.md for the full workflow.
 *
 * Modes:
 *   pnpm performance:latency --feature directory --targets "/admin/directory,/api/directory" --label after
 *   pnpm performance:latency --preset auth --label after
 *       Optionally signs in (Supabase password grant), then issues interleaved
 *       read-only GETs and summarizes total time, TTFB, and every Server-Timing metric.
 *   pnpm performance:latency --log <server-output.log>
 *       Summarizes structured `[<scope>-timing]` events from apps/web/src/lib/observability/timing.ts.
 *   pnpm performance:latency --compare <before.json> <after.json>
 *       Prints a before/after p50/p95 delta table from two saved runs.
 *
 * Credentials: LATENCY_BENCH_EMAIL/LATENCY_BENCH_PASSWORD, falling back to
 * E2E_AUTH_EMAIL/E2E_AUTH_PASSWORD from apps/web/.env.local. Use --anonymous for
 * public routes. Non-local app or Supabase targets require --allow-remote.
 */
import { execSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { createServerClient } from '@supabase/ssr';
import {
  type NamedSummary,
  compareSummaries,
  formatComparisonTable,
  formatSummaryTable,
  parseServerTimingMetrics,
  parseTimingLog,
  summarize,
  summarizeTimingEvents,
} from './lib/latency-stats';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');

interface Preset {
  feature: string;
  targets: Array<string>;
  logins: number;
}

const PRESETS: Record<string, Preset> = {
  auth: {
    feature: 'authentication',
    // Middleware + layout page, a middleware-protected API, and two middleware-bypassed APIs.
    targets: [
      '/dashboard',
      '/api/notifications?limit=1',
      '/api/dashboard/stats',
      '/api/dashboard/pending',
    ],
    logins: 5,
  },
};

interface SavedRun {
  feature: string;
  label: string;
  recordedAt: string;
  gitCommit: string;
  gitDirty: boolean;
  baseUrl: string;
  authenticated: boolean;
  samples: number;
  warmup: number;
  logins: number;
  targets: Array<string>;
  statusCounts: Record<string, Record<string, number>>;
  summaries: Array<NamedSummary>;
}

interface MeasurementConfig {
  feature: string;
  label: string;
  baseUrl: string;
  targets: Array<string>;
  samples: number;
  warmup: number;
  logins: number;
  out: string | undefined;
  auth: { supabaseUrl: string; anonKey: string; email: string; password: string } | null;
}

interface Session {
  cookieHeader: string;
  signOut: () => Promise<void>;
}

type CliValues = Record<string, string | boolean | undefined>;

class CliError extends Error {}

// Throw rather than process.exit(): exiting with open fetch sockets crashes Node on Windows.
function fail(message: string): never {
  throw new CliError(message);
}

function isLocalUrl(url: string): boolean {
  const { hostname } = new URL(url);
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
}

function optionalString(value: string | boolean | undefined): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function readCount(value: string | undefined, fallback: number, name: string): number {
  if (value === undefined) {
    return fallback;
  }
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed < 0) {
    fail(`--${name} must be a non-negative integer.`);
  }
  return parsed;
}

function git(command: string): string {
  try {
    return execSync(`git ${command}`, { cwd: REPO_ROOT, encoding: 'utf8' }).trim();
  } catch {
    return 'unknown';
  }
}

function readRun(path: string): SavedRun {
  const parsed: unknown = JSON.parse(readFileSync(resolve(path), 'utf8'));
  if (
    typeof parsed !== 'object' ||
    parsed === null ||
    !Array.isArray((parsed as Partial<SavedRun>).summaries)
  ) {
    fail(`${path} is not a latency run file.`);
  }
  return parsed as SavedRun;
}

function resolveAuth(values: CliValues, baseUrl: string): MeasurementConfig['auth'] {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const allowRemote = values['allow-remote'] === true;
  if (!(isLocalUrl(baseUrl) || allowRemote)) {
    fail('Refusing to measure a non-local app without --allow-remote.');
  }
  if (values.anonymous === true) {
    return null;
  }

  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const email = process.env.LATENCY_BENCH_EMAIL ?? process.env.E2E_AUTH_EMAIL;
  const password = process.env.LATENCY_BENCH_PASSWORD ?? process.env.E2E_AUTH_PASSWORD;
  if (!(supabaseUrl && anonKey)) {
    fail('NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are required.');
  }
  if (!(email && password)) {
    fail('Set LATENCY_BENCH_EMAIL/LATENCY_BENCH_PASSWORD (or E2E_AUTH_*), or pass --anonymous.');
  }
  if (!(isLocalUrl(supabaseUrl) || allowRemote)) {
    fail('Refusing to sign in to a non-local Supabase project without --allow-remote.');
  }
  return { supabaseUrl, anonKey, email, password };
}

function resolveConfig(values: CliValues): MeasurementConfig {
  const presetName = optionalString(values.preset);
  const preset = presetName ? PRESETS[presetName] : undefined;
  if (presetName && !preset) {
    fail(`Unknown --preset "${presetName}". Available: ${Object.keys(PRESETS).join(', ')}.`);
  }

  const explicitTargets = optionalString(values.targets)
    ?.split(',')
    .map((target) => target.trim())
    .filter(Boolean);
  const targets = explicitTargets?.length ? explicitTargets : preset?.targets;
  if (!targets?.length) {
    fail('Pass --targets "/path,/api/path" or --preset <name>.');
  }

  const baseUrl =
    optionalString(values['base-url']) ??
    process.env.LATENCY_BENCH_BASE_URL ??
    'http://localhost:3001';
  const auth = resolveAuth(values, baseUrl);

  return {
    feature: optionalString(values.feature) ?? preset?.feature ?? 'general',
    label: optionalString(values.label) ?? 'run',
    baseUrl,
    targets,
    samples: readCount(optionalString(values.samples), 30, 'samples'),
    warmup: readCount(optionalString(values.warmup), 3, 'warmup'),
    logins: auth
      ? Math.max(1, readCount(optionalString(values.logins), preset?.logins ?? 1, 'logins'))
      : 0,
    out: optionalString(values.out),
    auth,
  };
}

async function signIn(
  auth: NonNullable<MeasurementConfig['auth']>
): Promise<Session & { durationMs: number }> {
  const jar = new Map<string, string>();
  const supabase = createServerClient(auth.supabaseUrl, auth.anonKey, {
    cookies: {
      getAll: () => [...jar.entries()].map(([name, value]) => ({ name, value })),
      setAll: (cookiesToSet) => {
        for (const { name, value } of cookiesToSet) {
          if (value) {
            jar.set(name, value);
          } else {
            jar.delete(name);
          }
        }
      },
    },
  });

  const startedAt = performance.now();
  const { error } = await supabase.auth.signInWithPassword({
    email: auth.email,
    password: auth.password,
  });
  const durationMs = performance.now() - startedAt;
  if (error) {
    fail(`Sign-in failed (${error.status ?? 'no status'}): ${error.message}`);
  }

  return {
    durationMs,
    cookieHeader: [...jar.entries()].map(([name, value]) => `${name}=${value}`).join('; '),
    signOut: async () => {
      await supabase.auth.signOut({ scope: 'local' });
    },
  };
}

/** Times fresh password logins, revoking all but the final session used for requests. */
async function sampleLogins(
  config: MeasurementConfig
): Promise<{ durations: Array<number>; session: Session }> {
  if (!config.auth) {
    return { durations: [], session: { cookieHeader: '', signOut: async () => undefined } };
  }
  const durations: Array<number> = [];
  let session: Session | null = null;
  for (let index = 0; index < config.logins; index += 1) {
    const next = await signIn(config.auth);
    durations.push(next.durationMs);
    await session?.signOut();
    session = next;
  }
  if (!session) {
    fail('No session was created.');
  }
  return { durations, session };
}

async function timeRequest(
  url: string,
  cookieHeader: string
): Promise<{
  status: number;
  ttfbMs: number;
  totalMs: number;
  serverTiming: ReturnType<typeof parseServerTimingMetrics>;
  location: string | null;
}> {
  const headers: Record<string, string> = {
    accept: new URL(url).pathname.startsWith('/api/') ? 'application/json' : 'text/html',
  };
  if (cookieHeader) {
    headers.cookie = cookieHeader;
  }
  const startedAt = performance.now();
  const response = await fetch(url, { headers, redirect: 'manual', cache: 'no-store' });
  const ttfbMs = performance.now() - startedAt;
  await response.arrayBuffer();
  return {
    status: response.status,
    ttfbMs,
    totalMs: performance.now() - startedAt,
    serverTiming: parseServerTimingMetrics(response.headers.get('server-timing')),
    location: response.headers.get('location'),
  };
}

type RequestResult = Awaited<ReturnType<typeof timeRequest>>;

interface SampleSink {
  metrics: Map<string, Array<number>>;
  statusCounts: Record<string, Record<string, number>>;
}

function recordResult(sink: SampleSink, target: string, result: RequestResult): void {
  const push = (name: string, value: number): void => {
    sink.metrics.set(name, [...(sink.metrics.get(name) ?? []), value]);
  };
  const counts = sink.statusCounts[target] ?? {};
  counts[String(result.status)] = (counts[String(result.status)] ?? 0) + 1;
  sink.statusCounts[target] = counts;
  push(`GET ${target} total`, result.totalMs);
  push(`GET ${target} ttfb`, result.ttfbMs);
  for (const metric of result.serverTiming) {
    push(`GET ${target} st:${metric.name}`, metric.durationMs);
  }
}

async function sampleRequests(config: MeasurementConfig, session: Session): Promise<SampleSink> {
  const sink: SampleSink = { metrics: new Map(), statusCounts: {} };

  for (let iteration = 0; iteration < config.warmup + config.samples; iteration += 1) {
    // Interleave targets so server warm-up or background drift affects each equally.
    for (const target of config.targets) {
      const result = await timeRequest(
        new URL(target, config.baseUrl).toString(),
        session.cookieHeader
      );
      const redirectedToLogin =
        result.status >= 300 && result.status < 400 && result.location?.includes('/login');
      if (redirectedToLogin && config.auth) {
        fail(`${target} redirected to /login; the measurement session was rejected.`);
      }
      if (iteration >= config.warmup) {
        recordResult(sink, target, result);
      }
    }
  }
  return sink;
}

function saveAndReport(run: SavedRun, out: string | undefined): void {
  const outPath = out
    ? resolve(out)
    : resolve(
        REPO_ROOT,
        'perf-results',
        run.feature,
        `${run.recordedAt.replace(/[:.]/g, '-')}-${run.label}.json`
      );
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, `${JSON.stringify(run, null, 2)}\n`);

  console.info(
    `\nCommit ${run.gitCommit}${run.gitDirty ? ' (dirty)' : ''}; HTTP status counts: ${JSON.stringify(run.statusCounts)}\n`
  );
  console.info(formatSummaryTable(run.summaries));
  const nonSuccess = Object.entries(run.statusCounts).filter(([, counts]) =>
    Object.keys(counts).some((status) => !status.startsWith('2'))
  );
  if (nonSuccess.length > 0) {
    console.warn(
      `\nWarning: non-2xx responses for ${nonSuccess.map(([target]) => target).join(', ')}; use a user whose role can access every target before comparing runs.`
    );
  }
  console.info(`\nSaved ${outPath}`);
}

async function runMeasurement(values: CliValues): Promise<void> {
  const config = resolveConfig(values);
  console.info(
    `[latency] ${config.feature}/${config.label}: ${config.baseUrl} | ${config.targets.length} targets, ${config.samples} samples, ${config.warmup} warmup, ${config.auth ? `${config.logins} logins` : 'anonymous'}`
  );

  const { durations, session } = await sampleLogins(config);
  let sampled: SampleSink;
  try {
    sampled = await sampleRequests(config, session);
  } finally {
    await session.signOut();
  }
  const { metrics, statusCounts } = sampled;

  const summaries: Array<NamedSummary> = [
    ...(durations.length > 0
      ? [{ name: 'Supabase password sign-in', summary: summarize(durations) }]
      : []),
    ...[...metrics.entries()].map(([name, list]) => ({ name, summary: summarize(list) })),
  ];

  saveAndReport(
    {
      feature: config.feature,
      label: config.label,
      recordedAt: new Date().toISOString(),
      gitCommit: git('rev-parse --short HEAD'),
      gitDirty: git('status --porcelain') !== '',
      baseUrl: config.baseUrl,
      authenticated: config.auth !== null,
      samples: config.samples,
      warmup: config.warmup,
      logins: config.logins,
      targets: config.targets,
      statusCounts,
      summaries,
    },
    config.out
  );
}

async function main(): Promise<void> {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      'allow-remote': { type: 'boolean' },
      anonymous: { type: 'boolean' },
      'base-url': { type: 'string' },
      compare: { type: 'boolean' },
      feature: { type: 'string' },
      label: { type: 'string' },
      log: { type: 'string' },
      logins: { type: 'string' },
      out: { type: 'string' },
      preset: { type: 'string' },
      samples: { type: 'string' },
      targets: { type: 'string' },
      warmup: { type: 'string' },
    },
  });

  if (values.compare) {
    const [beforePath, afterPath] = positionals;
    if (!(beforePath && afterPath)) {
      fail('Usage: --compare <before.json> <after.json>');
    }
    const before = readRun(beforePath);
    const after = readRun(afterPath);
    console.info(`Before: ${before.label} @ ${before.gitCommit} (${before.recordedAt})`);
    console.info(`After:  ${after.label} @ ${after.gitCommit} (${after.recordedAt})\n`);
    console.info(formatComparisonTable(compareSummaries(before.summaries, after.summaries)));
    return;
  }

  if (typeof values.log === 'string') {
    const events = parseTimingLog(readFileSync(resolve(values.log), 'utf8'));
    if (events.length === 0) {
      fail('No timing events found. Start the server with LATENCY_TIMING_ENABLED=true.');
    }
    console.info(formatSummaryTable(summarizeTimingEvents(events)));
    return;
  }

  await runMeasurement(values);
}

main().catch((error: unknown) => {
  console.error(`\n[latency] ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
