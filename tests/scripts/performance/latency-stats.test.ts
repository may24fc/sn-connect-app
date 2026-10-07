import {
  compareSummaries,
  formatComparisonTable,
  parseServerTimingMetrics,
  parseTimingLog,
  percentile,
  summarize,
  summarizeTimingEvents,
} from '../../../scripts/performance/lib/latency-stats';

describe('latency stats', () => {
  it('computes nearest-rank percentiles and summary values', () => {
    const values = [50, 10, 40, 20, 30, 60, 70, 80, 90, 100];
    expect(percentile([10, 20, 30, 40], 50)).toBe(20);

    expect(summarize(values)).toEqual({
      count: 10,
      min: 10,
      p50: 50,
      p95: 100,
      max: 100,
      mean: 55,
    });
    expect(summarize([]).count).toBe(0);
  });

  it('reads every Server-Timing metric with a duration', () => {
    const header =
      'cache;desc="hit", auth_middleware;dur=42.37;desc="Supabase Auth getUser", db;dur=8';

    expect(parseServerTimingMetrics(header)).toEqual([
      { name: 'auth_middleware', durationMs: 42.37 },
      { name: 'db', durationMs: 8 },
    ]);
    expect(parseServerTimingMetrics(null)).toEqual([]);
  });

  it('parses well-formed timing events from any scope', () => {
    const log = [
      ' GET /dashboard 200 in 512ms',
      '[auth-timing] {"event":"auth_timing","layer":"middleware","operation":"getUser","route":"/dashboard","duration_ms":12.5}',
      'web:dev: [auth-timing] {"event":"auth_timing","layer":"middleware","operation":"getUser","route":"/dashboard","duration_ms":17.5}',
      '[directory-timing] {"event":"directory_timing","layer":"api-handler","operation":"list","route":"/api/directory","duration_ms":30}',
      '[auth-timing] {not json}',
      '[auth-timing] {"event":"other","layer":"x","operation":"y","route":"z","duration_ms":1}',
    ].join('\n');

    const events = parseTimingLog(log);

    expect(events).toHaveLength(3);
    expect(summarizeTimingEvents(events)).toEqual([
      {
        name: 'auth_timing middleware getUser /dashboard',
        summary: { count: 2, min: 12.5, p50: 12.5, p95: 17.5, max: 17.5, mean: 15 },
      },
      {
        name: 'directory_timing api-handler list /api/directory',
        summary: { count: 1, min: 30, p50: 30, p95: 30, max: 30, mean: 30 },
      },
    ]);
  });

  it('compares matching metrics with negative deltas for faster runs', () => {
    const before = [{ name: 'GET /dashboard total', summary: summarize([200, 220, 240]) }];
    const after = [
      { name: 'GET /dashboard total', summary: summarize([150, 160, 170]) },
      { name: 'only-after', summary: summarize([1]) },
    ];

    const comparisons = compareSummaries(before, after);

    expect(comparisons).toHaveLength(1);
    expect(comparisons[0]).toMatchObject({ p50DeltaMs: -60, p50DeltaPct: -27.27, p95DeltaMs: -70 });
    expect(formatComparisonTable(comparisons)).toContain('-60.0 ms (-27.3%)');
  });
});
