'use client';

import { useCallback, useEffect, useState } from 'react';

type Category = { code: string; name: string; example: string };
type Budget = { category_code: string; amount_aud: number };
type Subscription = {
  id: string;
  vendor_name: string;
  category_code: string;
  payment_source: string;
  monthly_amount_aud: number | null;
  next_renewal: string | null;
  active: boolean;
};
type Catalog = {
  categories: Array<Category>;
  budgets: Array<Budget>;
  subscriptions: Array<Subscription>;
};
const money = (value: number) =>
  new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(value);

export function FinanceCatalogPanel({ month }: { month: string }) {
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [vendor, setVendor] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('software');
  const [source, setSource] = useState('unknown');
  const active = catalog?.subscriptions.filter((item) => item.active) ?? [];
  const monthly = active.reduce((sum, item) => sum + Number(item.monthly_amount_aud ?? 0), 0);
  const aiMonthly = active
    .filter((item) => item.category_code === 'ai_cloud')
    .reduce((sum, item) => sum + Number(item.monthly_amount_aud ?? 0), 0);
  const unknownAmounts = active.filter((item) => item.monthly_amount_aud === null).length;
  const load = useCallback(async () => {
    try {
      const response = await fetch(`/api/finance/catalog?month=${month}`);
      if (!response.ok) throw new Error('Could not load subscriptions and budgets');
      setCatalog((await response.json()).data);
      setError('');
    } catch {
      setError('Could not load subscriptions and budgets');
    }
  }, [month]);
  useEffect(() => {
    void load();
  }, [load]);
  async function saveBudget(code: string, value: string) {
    const amountAud = Number(value);
    if (!Number.isFinite(amountAud) || amountAud < 0) {
      setError('Enter a valid budget');
      return;
    }
    setSaving(true);
    setError('');
    const response = await fetch('/api/finance/catalog', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind: 'budget', categoryCode: code, month, amountAud }),
    });
    setSaving(false);
    if (response.ok) void load();
    else setError('Could not save budget');
  }
  async function addSubscription(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError('');
    const monthlyAmountAud = amount.trim() ? Number(amount) : null;
    const response = await fetch('/api/finance/catalog', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        kind: 'subscription',
        vendorName: vendor,
        categoryCode: category,
        paymentSource: source,
        monthlyAmountAud,
        seats: null,
        nextRenewal: null,
        notes: null,
      }),
    });
    setSaving(false);
    if (response.ok) {
      setVendor('');
      setAmount('');
      void load();
    } else setError('Could not save subscription');
  }
  return (
    <div className="space-y-5">
      {error ? (
        <p role="alert" className="text-red-600">
          {error}
        </p>
      ) : null}
      <section
        aria-label="Subscription summary"
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        {[
          {
            title: 'Monthly run rate',
            value: money(monthly),
            detail: 'Known active subscriptions',
          },
          {
            title: 'Annualized run rate',
            value: money(monthly * 12),
            detail: 'At the current monthly rate',
          },
          {
            title: 'AI & Cloud',
            value: money(aiMonthly),
            detail: 'Known active AI tools per month',
          },
          {
            title: 'Need a look',
            value: String(unknownAmounts),
            detail: 'Active tools without a known price',
          },
        ].map((item) => (
          <div key={item.title} className="rounded-xl border bg-card p-5">
            <p className="text-sm text-[#4a5558]">{item.title}</p>
            <p className="mt-2 text-2xl font-bold tabular-nums">{catalog ? item.value : '—'}</p>
            <p className="text-xs text-muted-foreground">{item.detail}</p>
          </div>
        ))}
      </section>
      <section className="rounded-xl border bg-card p-5">
        <h2 className="text-lg font-semibold">Subscription register</h2>
        <p className="mb-3 text-sm text-muted-foreground">
          Recurring service metadata, not extra expense charges. Actual AI spend also appears in All
          expenses. Run rate includes active records with known amounts only.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[730px] text-left text-sm">
            <thead className="bg-[#fafbf9] text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                {[
                  'Service',
                  'Category',
                  'Paid with',
                  'Monthly',
                  'Yearly',
                  'Next renewal',
                  'Status',
                ].map((label) => (
                  <th className="border-b p-3" key={label}>
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {catalog?.subscriptions.map((item) => (
                <tr key={item.id} className="hover:bg-[#fafbf9]">
                  <td className="border-b p-3 font-semibold">{item.vendor_name}</td>
                  <td className="border-b p-3">
                    {catalog.categories.find((row) => row.code === item.category_code)?.name ??
                      item.category_code.replaceAll('_', ' ')}
                  </td>
                  <td className="border-b p-3 capitalize">
                    {item.payment_source.replaceAll('_', ' ')}
                  </td>
                  <td className="border-b p-3 tabular-nums">
                    {item.monthly_amount_aud === null
                      ? 'Unknown'
                      : money(Number(item.monthly_amount_aud))}
                  </td>
                  <td className="border-b p-3 tabular-nums">
                    {item.monthly_amount_aud === null
                      ? 'Unknown'
                      : money(Number(item.monthly_amount_aud) * 12)}
                  </td>
                  <td className="border-b p-3">{item.next_renewal ?? 'Not set'}</td>
                  <td className="border-b p-3">
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-semibold ${item.active ? 'bg-[#e5f4ea] text-[#0f8a3c]' : 'bg-muted text-muted-foreground'}`}
                    >
                      {item.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {catalog?.subscriptions.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">No subscriptions registered yet.</p>
          ) : null}
        </div>
        <form
          onSubmit={(event) => void addSubscription(event)}
          className="mt-4 flex flex-wrap items-end gap-2 text-sm"
        >
          <label>
            Service
            <input
              required
              value={vendor}
              onChange={(event) => setVendor(event.target.value)}
              className="ml-2 rounded border p-2"
            />
          </label>
          <label>
            Category
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              className="ml-2 rounded border p-2"
            >
              {catalog?.categories.map((item) => (
                <option value={item.code} key={item.code}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Paid with
            <select
              value={source}
              onChange={(event) => setSource(event.target.value)}
              className="ml-2 rounded border p-2"
            >
              <option value="unknown">Unknown</option>
              <option value="personal_card">Personal card</option>
              <option value="company_card">Company card</option>
              <option value="bank_transfer">Bank transfer</option>
            </select>
          </label>
          <label>
            Monthly AUD
            <input
              type="number"
              min="0"
              step="0.01"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              className="ml-2 w-28 rounded border p-2"
            />
          </label>
          <button
            type="submit"
            disabled={saving}
            className="rounded bg-[#16505f] px-3 py-2 text-white"
          >
            Add subscription
          </button>
        </form>
      </section>
      <section className="rounded-xl border bg-card p-5">
        <h2 className="mb-3 text-lg font-semibold">Categories and budgets · {month.slice(0, 7)}</h2>
        <div className="grid gap-3 md:grid-cols-2">
          {catalog?.categories.map((item) => (
            <BudgetEditor
              key={item.code}
              category={item}
              amount={
                catalog.budgets.find((budget) => budget.category_code === item.code)?.amount_aud ??
                null
              }
              saving={saving}
              onSave={saveBudget}
            />
          ))}
        </div>
      </section>
    </div>
  );
}

function BudgetEditor({
  category,
  amount,
  saving,
  onSave,
}: {
  category: Category;
  amount: number | null;
  saving: boolean;
  onSave: (code: string, amount: string) => Promise<void>;
}) {
  const [value, setValue] = useState(amount === null ? '' : String(amount));
  useEffect(() => setValue(amount === null ? '' : String(amount)), [amount]);
  return (
    <div className="rounded-lg border p-3 text-sm">
      <div className="font-semibold">{category.name}</div>
      <p className="text-xs text-muted-foreground">{category.example}</p>
      <div className="mt-2 flex items-center gap-2">
        <span>AUD</span>
        <input
          aria-label={`${category.name} monthly budget`}
          type="number"
          min="0"
          step="0.01"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          className="w-28 rounded border p-1"
        />
        <button
          type="button"
          disabled={saving || value === ''}
          onClick={() => void onSave(category.code, value)}
          className="rounded border px-2 py-1"
        >
          Save
        </button>
      </div>
    </div>
  );
}
