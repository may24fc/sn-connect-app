export interface LatencySummary {
  count: number;
  min: number;
  p50: number;
  p95: number;
  max: number;
  mean: number;
}

export interface NamedSummary {
  name: string;
  summary: LatencySummary;
}

export interface SummaryComparison {
  name: string;
  before: LatencySummary;
  after: LatencySummary;
  p50DeltaMs: number;
  p50DeltaPct: number;
  p95DeltaMs: number;
  p95DeltaPct: number;
}

export interface ServerTimingMetric {
  name: string;
  durationMs: number;
}

export interface TimingLogEvent {
  event: string;
  layer: string;
  operation: string;
  route: string;
  durationMs: number;
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

/** Nearest-rank percentile; stable for the small sample sizes used locally. */
export function percentile(sortedValues: ReadonlyArray<number>, pct: number): number {
  if (sortedValues.length === 0) {
    return Number.NaN;
  }
  const rank = Math.ceil((pct / 100) * sortedValues.length);
  const index = Math.min(sortedValues.length - 1, Math.max(0, rank - 1));
  return sortedValues[index] as number;
}

export function summarize(values: ReadonlyArray<number>): LatencySummary {
  const finite = values.filter((value) => Number.isFinite(value));
  if (finite.length === 0) {
    return {
      count: 0,
      min: Number.NaN,
      p50: Number.NaN,
      p95: Number.NaN,
      max: Number.NaN,
      mean: Number.NaN,
    };
  }
  const sorted = [...finite].sort((a, b) => a - b);
  const total = sorted.reduce((sum, value) => sum + value, 0);
  return {
    count: sorted.length,
    min: round(sorted[0] as number),
    p50: round(percentile(sorted, 50)),
    p95: round(percentile(sorted, 95)),
    max: round(sorted[sorted.length - 1] as number),
    mean: round(total / sorted.length),
  };
}

/** Returns every metric with a numeric `dur` from a Server-Timing header. */
export function parseServerTimingMetrics(header: string | null): Array<ServerTimingMetric> {
  if (!header) {
    return [];
  }
  const metrics: Array<ServerTimingMetric> = [];
  for (const entry of header.split(',')) {
    const [rawName, ...params] = entry.trim().split(';');
    const name = rawName?.trim();
    if (!name) {
      continue;
    }
    for (const param of params) {
      const [key, value] = param.trim().split('=');
      const duration = key === 'dur' && value !== undefined ? Number.parseFloat(value) : Number.NaN;
      if (Number.isFinite(duration)) {
        metrics.push({ name, durationMs: duration });
        break;
      }
    }
  }
  return metrics;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function toTimingEvent(value: unknown): TimingLogEvent | null {
  if (
    isRecord(value) &&
    typeof value.event === 'string' &&
    value.event.endsWith('_timing') &&
    typeof value.layer === 'string' &&
    typeof value.operation === 'string' &&
    typeof value.route === 'string' &&
    typeof value.duration_ms === 'number'
  ) {
    return {
      event: value.event,
      layer: value.layer,
      operation: value.operation,
      route: value.route,
      durationMs: value.duration_ms,
    };
  }
  return null;
}

/**
 * Extracts structured `[<scope>-timing] {"event":"<scope>_timing",...}` lines emitted by
 * apps/web/src/lib/observability/timing.ts (and wrappers such as lib/auth/timing.ts).
 */
export function parseTimingLog(text: string): Array<TimingLogEvent> {
  const events: Array<TimingLogEvent> = [];
  for (const line of text.split(/\r?\n/)) {
    const marker = /\[[\w-]+-timing\]/.exec(line);
    if (!marker) {
      continue;
    }
    const jsonStart = line.indexOf('{', marker.index);
    const jsonEnd = line.lastIndexOf('}');
    if (jsonStart === -1 || jsonEnd <= jsonStart) {
      continue;
    }
    try {
      const event = toTimingEvent(JSON.parse(line.slice(jsonStart, jsonEnd + 1)));
      if (event) {
        events.push(event);
      }
    } catch {
      // Ignore truncated or interleaved log lines.
    }
  }
  return events;
}

export function summarizeTimingEvents(events: ReadonlyArray<TimingLogEvent>): Array<NamedSummary> {
  const groups = new Map<string, Array<number>>();
  for (const event of events) {
    const key = `${event.event} ${event.layer} ${event.operation} ${event.route}`;
    const durations = groups.get(key) ?? [];
    durations.push(event.durationMs);
    groups.set(key, durations);
  }
  return [...groups.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, durations]) => ({ name, summary: summarize(durations) }));
}

function deltaPct(before: number, after: number): number {
  if (!Number.isFinite(before) || before === 0 || !Number.isFinite(after)) {
    return Number.NaN;
  }
  return round(((after - before) / before) * 100);
}

/** Pairs summaries by name; negative deltas mean the "after" run is faster. */
export function compareSummaries(
  before: ReadonlyArray<NamedSummary>,
  after: ReadonlyArray<NamedSummary>
): Array<SummaryComparison> {
  const beforeByName = new Map(before.map((entry) => [entry.name, entry.summary]));
  const comparisons: Array<SummaryComparison> = [];
  for (const entry of after) {
    const previous = beforeByName.get(entry.name);
    if (!previous) {
      continue;
    }
    comparisons.push({
      name: entry.name,
      before: previous,
      after: entry.summary,
      p50DeltaMs: round(entry.summary.p50 - previous.p50),
      p50DeltaPct: deltaPct(previous.p50, entry.summary.p50),
      p95DeltaMs: round(entry.summary.p95 - previous.p95),
      p95DeltaPct: deltaPct(previous.p95, entry.summary.p95),
    });
  }
  return comparisons;
}

function formatMs(value: number): string {
  return Number.isFinite(value) ? value.toFixed(1) : 'n/a';
}

function formatSigned(value: number, suffix: string): string {
  if (!Number.isFinite(value)) {
    return 'n/a';
  }
  return `${value > 0 ? '+' : ''}${value.toFixed(1)}${suffix}`;
}

export function formatSummaryTable(rows: ReadonlyArray<NamedSummary>): string {
  const lines = [
    '| Metric | n | p50 ms | p95 ms | mean ms | min ms | max ms |',
    '| --- | ---: | ---: | ---: | ---: | ---: | ---: |',
  ];
  for (const { name, summary } of rows) {
    lines.push(
      `| ${name} | ${summary.count} | ${formatMs(summary.p50)} | ${formatMs(summary.p95)} | ${formatMs(summary.mean)} | ${formatMs(summary.min)} | ${formatMs(summary.max)} |`
    );
  }
  return lines.join('\n');
}

export function formatComparisonTable(rows: ReadonlyArray<SummaryComparison>): string {
  const lines = [
    '| Metric | Before p50 | After p50 | Δ p50 | Before p95 | After p95 | Δ p95 |',
    '| --- | ---: | ---: | ---: | ---: | ---: | ---: |',
  ];
  for (const row of rows) {
    lines.push(
      `| ${row.name} | ${formatMs(row.before.p50)} | ${formatMs(row.after.p50)} | ${formatSigned(row.p50DeltaMs, ' ms')} (${formatSigned(row.p50DeltaPct, '%')}) | ${formatMs(row.before.p95)} | ${formatMs(row.after.p95)} | ${formatSigned(row.p95DeltaMs, ' ms')} (${formatSigned(row.p95DeltaPct, '%')}) |`
    );
  }
  return lines.join('\n');
}
