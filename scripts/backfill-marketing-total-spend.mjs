import { execFileSync } from 'node:child_process';
import process from 'node:process';

const MARKETING_CONTEXT_START = '[marketing_context]';
const MARKETING_CONTEXT_END = '[/marketing_context]';
const APPLY = process.argv.includes('--apply');

function runPsql(query) {
  return execFileSync(
    'psql',
    [
      '-h',
      process.env.PGHOST || '127.0.0.1',
      '-p',
      process.env.PGPORT || '55322',
      '-U',
      process.env.PGUSER || 'postgres',
      '-d',
      process.env.PGDATABASE || 'postgres',
      '-At',
      '-F',
      '\t',
      '-c',
      query,
    ],
    {
      encoding: 'utf8',
      env: {
        ...process.env,
        PGPASSWORD: process.env.PGPASSWORD || 'postgres',
      },
    }
  );
}

function decodeHex(value) {
  return Buffer.from(value, 'hex').toString('utf8');
}

function encodeHex(value) {
  return Buffer.from(value, 'utf8').toString('hex');
}

function normalizeMetricName(metricName) {
  return String(metricName || '').trim().toLowerCase();
}

function getMetricNumericValue(metrics, metricNames) {
  const candidates = Array.isArray(metricNames) ? metricNames : [metricNames];

  for (const metricName of candidates) {
    const match = metrics.find((metric) => normalizeMetricName(metric.metric_name) === normalizeMetricName(metricName));
    if (match && Number.isFinite(match.metric_value) && match.metric_value > 0) {
      return match.metric_value;
    }
  }

  return null;
}

function deriveMarketingSpendFromMetrics(metrics) {
  const safeMetrics = metrics.filter(
    (metric) => metric.metric_name && Number.isFinite(metric.metric_value) && metric.metric_value > 0
  );

  if (safeMetrics.length === 0) {
    return null;
  }

  const directSpendMetric = safeMetrics.find(
    (metric) => normalizeMetricName(metric.metric_name) === 'total spend'
  );

  if (directSpendMetric) {
    return directSpendMetric.metric_value;
  }

  const formulas = [
    { spendMetric: 'CPM', driverMetric: 'Impressions', divisor: 1000 },
  ];

  for (const formula of formulas) {
    const spendRate = getMetricNumericValue(safeMetrics, formula.spendMetric);
    if (!spendRate) {
      continue;
    }

    let driverValue = null;

    if (Array.isArray(formula.driverMetric)) {
      const driverValues = formula.driverMetric
        .map((metricName) => getMetricNumericValue(safeMetrics, metricName))
        .filter((value) => value !== null);

      if (driverValues.length > 0) {
        driverValue = formula.aggregate === 'max'
          ? Math.max(...driverValues)
          : driverValues.reduce((sum, value) => sum + value, 0);
      }
    } else {
      driverValue = getMetricNumericValue(safeMetrics, formula.driverMetric);
    }

    if (!driverValue || driverValue <= 0) {
      continue;
    }

    const divisor = formula.divisor || 1;
    const derivedSpend = (spendRate * driverValue) / divisor;
    if (Number.isFinite(derivedSpend) && derivedSpend > 0) {
      return derivedSpend;
    }
  }

  return null;
}

function extractMarketingContext(notes) {
  const rawNotes = String(notes || '').trim();
  const startIndex = rawNotes.indexOf(MARKETING_CONTEXT_START);
  const endIndex = rawNotes.indexOf(MARKETING_CONTEXT_END);

  if (startIndex === -1 || endIndex === -1 || endIndex < startIndex) {
    return { marketingContext: null, cleanNotes: rawNotes };
  }

  const jsonStart = startIndex + MARKETING_CONTEXT_START.length;
  const jsonText = rawNotes.slice(jsonStart, endIndex).trim();
  const before = rawNotes.slice(0, startIndex).trim();
  const after = rawNotes.slice(endIndex + MARKETING_CONTEXT_END.length).trim();
  const cleanNotes = [before, after].filter(Boolean).join('\n\n').trim();

  try {
    return {
      marketingContext: JSON.parse(jsonText),
      cleanNotes,
    };
  } catch {
    return {
      marketingContext: null,
      cleanNotes,
    };
  }
}

function serializeReportNotes(cleanNotes, marketingContext) {
  const contextBlock = `${MARKETING_CONTEXT_START}\n${JSON.stringify(marketingContext)}\n${MARKETING_CONTEXT_END}`;
  const trimmedNotes = String(cleanNotes || '').trim();
  return trimmedNotes ? `${contextBlock}\n\n${trimmedNotes}` : contextBlock;
}

const reportsOutput = runPsql(`
  SELECT id, encode(convert_to(COALESCE(notes, ''), 'UTF8'), 'hex')
  FROM public.reports
  WHERE report_type = 'marketing'
    AND status <> 'draft'
    AND COALESCE(notes, '') <> ''
    AND COALESCE(notes, '') NOT LIKE '%"totalSpend"%'
  ORDER BY created_at ASC;
`);

const metricsOutput = runPsql(`
  SELECT report_id, metric_name, metric_value
  FROM public.report_metrics
  WHERE report_id IN (
    SELECT id
    FROM public.reports
    WHERE report_type = 'marketing'
      AND status <> 'draft'
      AND COALESCE(notes, '') <> ''
      AND COALESCE(notes, '') NOT LIKE '%"totalSpend"%'
  )
  ORDER BY report_id ASC, metric_name ASC;
`);

const reports = reportsOutput
  .split(/\r?\n/)
  .filter(Boolean)
  .map((line) => {
    const separatorIndex = line.indexOf('\t');
    const id = separatorIndex === -1 ? line : line.slice(0, separatorIndex);
    const notesHex = separatorIndex === -1 ? '' : line.slice(separatorIndex + 1);
    return {
      id,
      notes: notesHex ? decodeHex(notesHex) : '',
    };
  });

const metricsByReportId = new Map();
for (const line of metricsOutput.split(/\r?\n/).filter(Boolean)) {
  const [reportId, metricName, metricValue] = line.split('\t');
  const metrics = metricsByReportId.get(reportId) || [];
  metrics.push({ metric_name: metricName, metric_value: Number(metricValue) });
  metricsByReportId.set(reportId, metrics);
}

const updates = [];

for (const report of reports) {
  const { marketingContext, cleanNotes } = extractMarketingContext(report.notes);
  if (!marketingContext) {
    continue;
  }

  if (Number(marketingContext.totalSpend) > 0) {
    continue;
  }

  const derivedSpend = deriveMarketingSpendFromMetrics(metricsByReportId.get(report.id) || []);
  if (!derivedSpend || derivedSpend <= 0) {
    continue;
  }

  updates.push({
    id: report.id,
    derivedSpend,
    notes: serializeReportNotes(cleanNotes, {
      ...marketingContext,
      totalSpend: Number(derivedSpend.toFixed(2)),
    }),
  });
}

if (updates.length === 0) {
  console.log('No marketing reports needed a totalSpend backfill.');
  process.exit(0);
}

console.log(`${APPLY ? 'Applying' : 'Previewing'} totalSpend backfill for ${updates.length} marketing report(s):`);
for (const update of updates) {
  console.log(`- ${update.id}: ${update.derivedSpend.toFixed(2)}`);
}

if (!APPLY) {
  console.log('Run with --apply to persist these derived totalSpend values.');
  process.exit(0);
}

for (const update of updates) {
  const encodedNotes = encodeHex(update.notes);
  runPsql(`
    UPDATE public.reports
    SET notes = convert_from(decode('${encodedNotes}', 'hex'), 'UTF8')
    WHERE id = '${update.id}';
  `);
}

console.log(`Backfilled ${updates.length} marketing report(s).`);
