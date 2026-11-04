'use client';

import { financeCategoryName as categoryName } from '@/lib/finance/categories';
import {
  type FinanceSnapshotReport,
  financeSnapshotReportSchema,
} from '@/lib/finance/report-snapshot';
import { formatFinanceDate, formatFinanceDateTime } from '@/lib/format';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  tableHeadTextClassName,
  tableHeaderClassName,
} from '@hr-portal/ui';
import type { ReactNode } from 'react';

export type FinanceSnapshotRecord = {
  id: string;
  status: string;
  exception_count: number;
  created_at: string;
  report_month: string;
  report_data: unknown;
};

type TableRow = { key: string; cells: Array<ReactNode> };

const money = (amount: number, currency = 'AUD') =>
  new Intl.NumberFormat('en-AU', { style: 'currency', currency }).format(amount);
const percent = (value: number | null) =>
  value === null ? '—' : `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
const monthLabel = (month: string) =>
  new Intl.DateTimeFormat('en-AU', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(
    new Date(`${month.slice(0, 7)}-01T00:00:00Z`)
  );

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-2">
      <h3 className="text-sm font-semibold">{title}</h3>
      {children}
    </section>
  );
}

function Table({ headers, rows }: { headers: Array<string>; rows: Array<TableRow> }) {
  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full min-w-[420px] text-left text-sm">
        <thead className={`${tableHeaderClassName} ${tableHeadTextClassName}`}>
          <tr>
            {headers.map((header, index) => (
              <th key={header} scope="col" className={`p-2 ${index > 0 ? 'text-right' : ''}`}>
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key} className="border-t">
              {row.cells.map((cell, index) => (
                <td
                  key={headers[index]}
                  className={`p-2 ${index > 0 ? 'text-right tabular-nums' : ''}`}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CountGrid({ items, columns }: { items: Array<[string, number]>; columns: string }) {
  return (
    <dl className={`grid gap-2 text-sm ${columns}`}>
      {items.map(([name, count]) => (
        <div key={name} className="rounded-lg border p-3">
          <dt className="text-xs text-muted-foreground">{name}</dt>
          <dd className="text-lg font-semibold tabular-nums">{count}</dd>
        </div>
      ))}
    </dl>
  );
}

function categoryRows(report: FinanceSnapshotReport): Array<TableRow> {
  const previous = new Map(
    report.previousCategoryBreakdown.map((row) => [row.category, row.spendAud])
  );
  const current = new Map(report.categoryBreakdown.map((row) => [row.category, row]));
  const codes = [...new Set([...current.keys(), ...previous.keys()])];
  return codes.map((code) => ({
    key: code,
    cells: [
      categoryName(code),
      money(previous.get(code) ?? 0),
      money(current.get(code)?.spendAud ?? 0),
      `${(current.get(code)?.percentOfTotal ?? 0).toFixed(1)}%`,
    ],
  }));
}

function departmentRows(report: FinanceSnapshotReport): Array<TableRow> {
  const previous = new Map(
    report.previousDepartmentBreakdown.map((row) => [row.departmentName, row.spendAud])
  );
  return report.departmentBreakdown.map((row) => ({
    key: row.departmentName,
    cells: [
      row.departmentName,
      money(previous.get(row.departmentName) ?? 0),
      money(row.spendAud),
      percent(row.momVariationPercent),
    ],
  }));
}

function exceptionRows(report: FinanceSnapshotReport): Array<TableRow> {
  return report.anomalies.map((row, index) => ({
    key: `${row.transactionDate}-${row.vendorName}-${index}`,
    cells: [
      <span key="vendor">
        {row.vendorName}
        <span className="block text-xs text-muted-foreground">
          {row.reason === 'variance_flagged' ? 'Amount differs' : 'Price spike'}
        </span>
      </span>,
      formatFinanceDate(row.transactionDate),
      money(row.totalAmountAud),
      row.varianceAmountAud === null ? '—' : money(row.varianceAmountAud),
    ],
  }));
}

function SnapshotStatusCounts({ report }: { report: FinanceSnapshotReport }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {report.paymentStatusCounts ? (
        <Section title="Payment status">
          <CountGrid
            columns="grid-cols-3"
            items={[
              ['Paid', report.paymentStatusCounts.confirmed],
              ['Unpaid', report.paymentStatusCounts.unpaid],
              ['Unknown', report.paymentStatusCounts.unknown],
            ]}
          />
        </Section>
      ) : null}
      <Section title="Review progress">
        <CountGrid
          columns="grid-cols-2"
          items={[
            ['Approved', report.pipelineStatus.approved],
            ['Auto-approved', report.pipelineStatus.autoApproved],
            ['Awaiting review', report.pipelineStatus.awaitingAssociateReview],
            ['Reading receipt', report.pipelineStatus.draftExtracted],
          ]}
        />
      </Section>
    </div>
  );
}

function SnapshotSourceRecords({ report }: { report: FinanceSnapshotReport }) {
  const unknownPayments = report.unknownPayments ?? [];
  const subscriptions = report.subscriptionsAsOfSnapshot ?? [];
  const wiseRows = report.wiseImportRowsForMonth;
  return (
    <>
      {unknownPayments.length ? (
        <Section title={`Payments not yet confirmed (${unknownPayments.length})`}>
          <Table
            headers={['Expense', 'Date', 'Amount']}
            rows={unknownPayments.map((row, index) => ({
              key: `${row.transactionDate}-${row.vendorName}-${index}`,
              cells: [
                row.vendorName,
                formatFinanceDate(row.transactionDate),
                money(row.amount, row.currency),
              ],
            }))}
          />
        </Section>
      ) : null}
      {subscriptions.length ? (
        <Section title={`Subscriptions at save time (${subscriptions.length})`}>
          <Table
            headers={['Service', 'Monthly (AUD)', 'Next renewal', 'Status']}
            rows={subscriptions.map((row) => ({
              key: row.id,
              cells: [
                row.vendor_name,
                row.monthly_amount_aud === null ? 'Unknown' : money(row.monthly_amount_aud),
                formatFinanceDate(row.next_renewal),
                row.active ? 'Active' : 'Inactive',
              ],
            }))}
          />
        </Section>
      ) : null}
      {wiseRows ? (
        <p className="text-sm text-muted-foreground">
          Wise results imported this month: {wiseRows.length} ·{' '}
          {wiseRows.filter((row) => row.result !== 'completed' && !row.resolved_at).length}{' '}
          unresolved.
        </p>
      ) : null}
    </>
  );
}

function SnapshotReport({ report }: { report: FinanceSnapshotReport }) {
  const categories = categoryRows(report);
  const departments = departmentRows(report);
  return (
    <div className="space-y-6">
      <section aria-label="Snapshot totals" className="grid gap-3 sm:grid-cols-2">
        {report.summary.map((row) => (
          <div key={row.metric} className="rounded-lg border bg-card p-4">
            <p className="text-sm text-muted-foreground">{row.metric.replace(' (AUD)', '')}</p>
            <p className="mt-1 text-2xl font-bold tabular-nums">{money(row.currentMonth)}</p>
            <p className="text-xs text-muted-foreground">
              {money(row.previousMonth)} previous month · {percent(row.momPercentChange)}
            </p>
          </div>
        ))}
      </section>
      {report.audEstimates?.currentMonthEntries ? (
        <p className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          Total spend includes {money(report.audEstimates.currentMonthAud)} estimated at daily
          exchange rates ({report.audEstimates.currentMonthEntries} foreign-currency{' '}
          {report.audEstimates.currentMonthEntries === 1 ? 'payment' : 'payments'}) at the time this
          snapshot was saved.
        </p>
      ) : null}
      <Section title="Spend by category (AUD)">
        {categories.length ? (
          <Table
            headers={['Category', 'Previous month', 'This month', 'Share']}
            rows={categories}
          />
        ) : (
          <p className="text-sm text-muted-foreground">No spend recorded.</p>
        )}
      </Section>
      {departments.length ? (
        <Section title="Spend by department (AUD)">
          <Table
            headers={['Department', 'Previous month', 'This month', 'Change']}
            rows={departments}
          />
        </Section>
      ) : null}
      <SnapshotStatusCounts report={report} />
      <Section title={`Exceptions (${report.anomalies.length})`}>
        {report.anomalies.length ? (
          <Table
            headers={['Expense', 'Date', 'Amount', 'Difference']}
            rows={exceptionRows(report)}
          />
        ) : (
          <p className="text-sm text-muted-foreground">No exceptions recorded.</p>
        )}
      </Section>
      <SnapshotSourceRecords report={report} />
    </div>
  );
}

export function FinanceSnapshotDetail({
  snapshot,
  onClose,
}: {
  snapshot: FinanceSnapshotRecord | null;
  onClose: () => void;
}) {
  const parsed = snapshot ? financeSnapshotReportSchema.safeParse(snapshot.report_data) : null;
  return (
    <Dialog open={snapshot !== null} onOpenChange={(open) => (open ? undefined : onClose())}>
      <DialogContent className="max-h-[90vh] w-[calc(100vw-2rem)] max-w-4xl overflow-y-auto [&>*]:min-w-0">
        {snapshot ? (
          <>
            <DialogHeader>
              <DialogTitle>
                {snapshot.status === 'final' ? 'Final' : 'Draft'} snapshot ·{' '}
                {monthLabel(snapshot.report_month)}
              </DialogTitle>
              <DialogDescription>
                Saved {formatFinanceDateTime(snapshot.created_at)} · {snapshot.exception_count} open{' '}
                {snapshot.exception_count === 1 ? 'exception' : 'exceptions'} when saved. Values are
                fixed at save time.
              </DialogDescription>
            </DialogHeader>
            {parsed?.success ? (
              <SnapshotReport report={parsed.data} />
            ) : (
              <p
                role="alert"
                className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900"
              >
                This snapshot was saved in an older format. Download its CSV for the full detail.
              </p>
            )}
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
