'use client';

import {
  type MaintenanceJob,
  type PropertyRegister,
  propertySummary,
} from '@/lib/finance/properties';
import { type FormEvent, useCallback, useEffect, useRef, useState } from 'react';

const money = (value: number) =>
  new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(value);
type FormKind = 'property' | 'rent' | 'maintenance';
type Tab = 'rent' | 'maintenance';
type Correction =
  | { kind: 'rent_void'; id: string }
  | { kind: 'maintenance_status'; id: string; expectedStatus: MaintenanceJob['status'] };
const empty: PropertyRegister = { properties: [], payments: [], maintenance: [], statusEvents: [] };
const inputClass = 'w-full rounded-md border bg-card px-3 py-2 text-sm';
const labelClass = 'grid gap-1 text-sm font-medium';

export function FinancePropertiesPanel({ month }: { month: string }) {
  const [register, setRegister] = useState<PropertyRegister>(empty);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('rent');
  const [formKind, setFormKind] = useState<FormKind | null>(null);
  const [correction, setCorrection] = useState<Correction | null>(null);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const correctionRef = useRef<HTMLElement>(null);
  const today = new Date().toISOString().slice(0, 10);

  const load = useCallback(
    async (signal?: AbortSignal) => {
      const response = await fetch(`/api/finance/properties?month=${encodeURIComponent(month)}`, {
        signal: signal ?? null,
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? 'Could not load property register');
      setRegister(body.data);
    },
    [month]
  );
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    load(controller.signal)
      .catch((cause: unknown) => {
        if (!controller.signal.aborted)
          setError(cause instanceof Error ? cause.message : 'Could not load property register');
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [load]);
  useEffect(() => {
    if (correction && typeof correctionRef.current?.scrollIntoView === 'function')
      correctionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [correction]);

  const summary = propertySummary(register, month, today);
  const names = new Map(register.properties.map((property) => [property.id, property.name]));
  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!formKind || saving) return;
    const form = event.currentTarget;
    const fields = new FormData(form);
    const text = (key: string) => String(fields.get(key) ?? '').trim();
    const optional = (key: string) => text(key) || null;
    const payload =
      formKind === 'property'
        ? {
            kind: 'property',
            name: text('name'),
            propertyType: text('propertyType'),
            tenantName: optional('tenantName'),
            occupancy: text('occupancy'),
            weeklyRentAud: Number(text('weeklyRentAud')),
            dueDay: Number(text('dueDay')),
          }
        : formKind === 'rent'
          ? {
              kind: 'rent',
              propertyId: text('propertyId'),
              month,
              receivedOn: text('receivedOn'),
              amountAud: Number(text('amountAud')),
              reference: optional('reference'),
            }
          : {
              kind: 'maintenance',
              propertyId: text('propertyId'),
              jobDate: text('jobDate'),
              description: text('description'),
              contractor: optional('contractor'),
              costAud: Number(text('costAud')),
              invoiceReference: optional('invoiceReference'),
              status: text('status'),
            };
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const response = await fetch('/api/finance/properties', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? 'Could not save record');
      setFormKind(null);
      setNotice(
        formKind === 'property'
          ? 'Property added'
          : formKind === 'rent'
            ? 'Rent recorded'
            : 'Maintenance logged'
      );
      await load();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : 'Could not save or refresh property register'
      );
    } finally {
      setSaving(false);
    }
  }

  async function saveCorrection(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!correction || saving) return;
    const fields = new FormData(event.currentTarget);
    const payload =
      correction.kind === 'rent_void'
        ? { ...correction, reason: String(fields.get('reason') ?? '').trim() }
        : { ...correction, status: String(fields.get('status') ?? '') };
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const response = await fetch('/api/finance/properties/corrections', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? 'Could not save correction');
      await load();
      setCorrection(null);
      setNotice(
        correction.kind === 'rent_void'
          ? 'Payment voided; original retained for audit'
          : 'Maintenance status updated'
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save or refresh correction');
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Recorded property data only; no sample records. Rent due uses current property terms,
          including for earlier months. Payment and maintenance statuses are manually recorded.
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              setError(null);
              setFormKind('property');
            }}
            className="rounded-md bg-[#1f6a7c] px-4 py-2 text-sm font-semibold text-white"
          >
            + Add property
          </button>
          <button
            type="button"
            onClick={() => {
              setError(null);
              setFormKind('rent');
            }}
            disabled={!register.properties.length}
            className="rounded-md border bg-card px-4 py-2 text-sm font-semibold disabled:opacity-50"
          >
            Record rent
          </button>
          <button
            type="button"
            onClick={() => {
              setError(null);
              setFormKind('maintenance');
            }}
            disabled={!register.properties.length}
            className="rounded-md border bg-card px-4 py-2 text-sm font-semibold disabled:opacity-50"
          >
            Log maintenance
          </button>
        </div>
      </div>
      {notice && (
        <output className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
          {notice}
        </output>
      )}
      {error && (
        <p
          role="alert"
          className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800"
        >
          {error}
        </p>
      )}
      {formKind && (
        <section
          aria-label={`${formKind} entry`}
          className="rounded-xl border bg-card p-5 shadow-sm"
        >
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">
              {formKind === 'property'
                ? 'Add property'
                : formKind === 'rent'
                  ? 'Record rent received'
                  : 'Log maintenance'}
            </h2>
            <button
              type="button"
              onClick={() => setFormKind(null)}
              disabled={saving}
              className="text-sm underline"
            >
              Cancel
            </button>
          </div>
          <form onSubmit={create} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {formKind === 'property' ? (
              <>
                <label className={labelClass}>
                  Property name
                  <input className={inputClass} name="name" required maxLength={180} />
                </label>
                <label className={labelClass}>
                  Type
                  <input
                    className={inputClass}
                    name="propertyType"
                    required
                    maxLength={100}
                    placeholder="Residential, commercial…"
                  />
                </label>
                <label className={labelClass}>
                  Occupancy
                  <select className={inputClass} name="occupancy">
                    <option value="occupied">Occupied</option>
                    <option value="vacant">Vacant</option>
                  </select>
                </label>
                <label className={labelClass}>
                  Tenant (optional)
                  <input className={inputClass} name="tenantName" maxLength={180} />
                </label>
                <label className={labelClass}>
                  Weekly rent (AUD)
                  <input
                    className={inputClass}
                    name="weeklyRentAud"
                    type="number"
                    min="0"
                    max="1000000000"
                    step="0.01"
                    required
                  />
                </label>
                <label className={labelClass}>
                  Due day of month (1–28)
                  <input
                    className={inputClass}
                    name="dueDay"
                    type="number"
                    min="1"
                    max="28"
                    defaultValue="1"
                    required
                  />
                </label>
              </>
            ) : (
              <>
                <label className={labelClass}>
                  Property
                  <select className={inputClass} name="propertyId" required>
                    {register.properties.map((property) => (
                      <option value={property.id} key={property.id}>
                        {property.name}
                      </option>
                    ))}
                  </select>
                </label>
                {formKind === 'rent' ? (
                  <>
                    <label className={labelClass}>
                      Received on
                      <input
                        className={inputClass}
                        type="date"
                        name="receivedOn"
                        defaultValue={today}
                        required
                      />
                    </label>
                    <label className={labelClass}>
                      Amount received (AUD)
                      <input
                        className={inputClass}
                        name="amountAud"
                        type="number"
                        min="0.01"
                        step="0.01"
                        required
                      />
                    </label>
                    <label className={labelClass}>
                      Reference (optional)
                      <input className={inputClass} name="reference" maxLength={255} />
                    </label>
                    <p className="self-center text-sm text-muted-foreground">
                      Records payment against {month}. Partial payments are supported.
                    </p>
                  </>
                ) : (
                  <>
                    <label className={labelClass}>
                      Job date
                      <input
                        className={inputClass}
                        name="jobDate"
                        type="date"
                        defaultValue={today}
                        required
                      />
                    </label>
                    <label className={labelClass}>
                      Job description
                      <input className={inputClass} name="description" maxLength={500} required />
                    </label>
                    <label className={labelClass}>
                      Contractor (optional)
                      <input className={inputClass} name="contractor" maxLength={180} />
                    </label>
                    <label className={labelClass}>
                      Cost recorded (AUD)
                      <input
                        className={inputClass}
                        name="costAud"
                        type="number"
                        min="0"
                        step="0.01"
                        required
                      />
                    </label>
                    <label className={labelClass}>
                      Invoice reference (optional)
                      <input className={inputClass} name="invoiceReference" maxLength={255} />
                    </label>
                    <label className={labelClass}>
                      Status
                      <select className={inputClass} name="status">
                        <option value="scheduled">Scheduled</option>
                        <option value="awaiting_invoice">Awaiting invoice</option>
                        <option value="paid">Paid</option>
                      </select>
                    </label>
                  </>
                )}
              </>
            )}
            <div className="flex items-end">
              <button
                type="submit"
                disabled={saving}
                className="rounded-md bg-[#1f6a7c] px-5 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Save record'}
              </button>
            </div>
          </form>
        </section>
      )}
      {correction && (
        <section
          ref={correctionRef}
          aria-label="Property correction"
          className="rounded-xl border bg-card p-5 shadow-sm"
        >
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">
              {correction.kind === 'rent_void' ? 'Void recorded rent' : 'Update maintenance status'}
            </h2>
            <button
              type="button"
              disabled={saving}
              onClick={() => setCorrection(null)}
              className="text-sm underline"
            >
              Cancel
            </button>
          </div>
          <form onSubmit={saveCorrection} className="flex flex-wrap items-end gap-3">
            {correction.kind === 'rent_void' ? (
              <label className={labelClass}>
                Reason for correction (retained with original entry)
                <input
                  className={inputClass}
                  name="reason"
                  required
                  minLength={10}
                  maxLength={500}
                />
              </label>
            ) : (
              <label className={labelClass}>
                New recorded status
                <select className={inputClass} name="status" required defaultValue="">
                  <option value="" disabled>
                    Choose status
                  </option>
                  {(['scheduled', 'awaiting_invoice', 'paid'] as const)
                    .filter((status) => status !== correction.expectedStatus)
                    .map((status) => (
                      <option key={status} value={status}>
                        {status.replace('_', ' ')}
                      </option>
                    ))}
                </select>
              </label>
            )}
            <button
              type="submit"
              disabled={saving}
              className="rounded-md bg-[#1f6a7c] px-5 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Confirm correction'}
            </button>
          </form>
        </section>
      )}
      {loading ? (
        <output>Loading property register…</output>
      ) : !error || register.properties.length ? (
        <>
          <section
            aria-label="Property highlights"
            className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
          >
            {[
              ['Rent due', summary.due, 'Occupied properties · monthly equivalent'],
              ['Rent received', summary.received, `Payments allocated to ${month}`],
              ['Overdue rent', summary.overdue, 'Past due date and still outstanding'],
              [
                'Maintenance recorded',
                summary.maintenance,
                `${summary.missingInvoices} without invoice reference`,
              ],
            ].map(([title, value, description]) => (
              <div key={title} className="rounded-xl border bg-card p-5 shadow-sm">
                <p className="text-sm text-muted-foreground">{title}</p>
                <p className="mt-2 text-2xl font-bold tabular-nums">{money(value as number)}</p>
                <p className="mt-1 text-xs text-muted-foreground">{description}</p>
              </div>
            ))}
          </section>
          <section
            aria-label="Property portfolio"
            className="grid gap-4 md:grid-cols-2 xl:grid-cols-3"
          >
            {summary.rows.length === 0 ? (
              <div className="rounded-xl border bg-card p-8 text-center text-sm text-muted-foreground md:col-span-2 xl:col-span-3">
                No properties yet. Add a property to begin the live register.
              </div>
            ) : (
              summary.rows.map(
                ({ property, due, received, maintenance, outstanding, status, dueDate }) => (
                  <article key={property.id} className="rounded-xl border bg-card p-5 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h2 className="font-semibold">{property.name}</h2>
                        <p className="text-sm text-muted-foreground">
                          {property.property_type} ·{' '}
                          {property.tenant_name ||
                            (property.occupancy === 'vacant' ? 'Vacant' : 'Tenant not recorded')}
                        </p>
                      </div>
                      <span className="rounded-full bg-[#e9f1f2] px-3 py-1 text-xs font-semibold text-[#1f6a7c]">
                        {status}
                      </span>
                    </div>
                    <dl className="mt-5 grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <dt className="text-muted-foreground">Weekly rent</dt>
                        <dd className="font-semibold">{money(Number(property.weekly_rent_aud))}</dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">Monthly due</dt>
                        <dd className="font-semibold">{money(due)}</dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">Received</dt>
                        <dd className="font-semibold">{money(received)}</dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">Outstanding</dt>
                        <dd className="font-semibold">{money(outstanding)}</dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">Maintenance recorded</dt>
                        <dd className="font-semibold">{money(maintenance)}</dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">Rent due date</dt>
                        <dd className="font-semibold">
                          {property.occupancy === 'vacant' ? '—' : dueDate}
                        </dd>
                      </div>
                    </dl>
                  </article>
                )
              )
            )}
          </section>
          <section className="overflow-hidden rounded-xl border bg-card shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4">
              <h2 className="text-lg font-semibold">Property register · {month}</h2>
              <div role="tablist" aria-label="Property records" className="flex gap-2 text-sm">
                <button
                  type="button"
                  role="tab"
                  aria-selected={tab === 'rent'}
                  onClick={() => setTab('rent')}
                  className={`rounded-md px-3 py-2 ${tab === 'rent' ? 'bg-[#1f6a7c] text-white' : 'border'}`}
                >
                  Rent collection
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={tab === 'maintenance'}
                  onClick={() => setTab('maintenance')}
                  className={`rounded-md px-3 py-2 ${tab === 'maintenance' ? 'bg-[#1f6a7c] text-white' : 'border'}`}
                >
                  Maintenance
                </button>
              </div>
            </div>
            <div role="tabpanel" className="overflow-x-auto">
              {tab === 'rent' ? (
                summary.rows.length ? (
                  <table className="w-full min-w-[680px] text-left text-sm">
                    <thead className="bg-muted/50 text-muted-foreground">
                      <tr>
                        {[
                          'Property',
                          'Tenant',
                          'Due date',
                          'Rent due',
                          'Received',
                          'Outstanding',
                          'Status',
                        ].map((label) => (
                          <th key={label} className="px-5 py-3 font-medium">
                            {label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {summary.rows.map(
                        ({ property, due, received, outstanding, status, dueDate }) => (
                          <tr key={property.id} className="border-t">
                            <td className="px-5 py-3 font-medium">{property.name}</td>
                            <td className="px-5 py-3">{property.tenant_name || '—'}</td>
                            <td className="px-5 py-3">
                              {property.occupancy === 'vacant' ? '—' : dueDate}
                            </td>
                            <td className="px-5 py-3">{money(due)}</td>
                            <td className="px-5 py-3">{money(received)}</td>
                            <td className="px-5 py-3">{money(outstanding)}</td>
                            <td className="px-5 py-3">{status}</td>
                          </tr>
                        )
                      )}
                    </tbody>
                  </table>
                ) : (
                  <p className="p-8 text-center text-sm text-muted-foreground">
                    No properties recorded yet.
                  </p>
                )
              ) : register.maintenance.length ? (
                <table className="w-full min-w-[760px] text-left text-sm">
                  <thead className="bg-muted/50 text-muted-foreground">
                    <tr>
                      {[
                        'Date',
                        'Property',
                        'Job',
                        'Contractor',
                        'Cost recorded',
                        'Invoice reference',
                        'Status',
                      ].map((label) => (
                        <th key={label} className="px-5 py-3 font-medium">
                          {label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {register.maintenance.map((job) => (
                      <tr key={job.id} className="border-t">
                        <td className="px-5 py-3">{job.job_date}</td>
                        <td className="px-5 py-3">
                          {names.get(job.property_id) ?? 'Unknown property'}
                        </td>
                        <td className="px-5 py-3 font-medium">{job.description}</td>
                        <td className="px-5 py-3">{job.contractor || '—'}</td>
                        <td className="px-5 py-3">{money(Number(job.cost_aud))}</td>
                        <td className="px-5 py-3">{job.invoice_reference || 'Not recorded'}</td>
                        <td className="px-5 py-3">
                          <span className="capitalize">{job.status.replace('_', ' ')}</span>
                          <button
                            type="button"
                            onClick={() =>
                              setCorrection({
                                kind: 'maintenance_status',
                                id: job.id,
                                expectedStatus: job.status,
                              })
                            }
                            className="ml-2 text-[#1f6a7c] underline"
                          >
                            Update
                          </button>
                          {register.statusEvents.some(
                            (event) => event.maintenance_id === job.id
                          ) && (
                            <details className="mt-1 text-xs">
                              <summary className="cursor-pointer">Status history</summary>
                              <ol>
                                {register.statusEvents
                                  .filter((event) => event.maintenance_id === job.id)
                                  .map((event) => (
                                    <li key={event.id}>
                                      {event.changed_at.slice(0, 10)}:{' '}
                                      {event.previous_status.replace('_', ' ')} →{' '}
                                      {event.next_status.replace('_', ' ')}
                                    </li>
                                  ))}
                              </ol>
                            </details>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="p-8 text-center text-sm text-muted-foreground">
                  No maintenance recorded for {month}.
                </p>
              )}
            </div>
            {tab === 'rent' && (
              <div className="border-t">
                <h3 className="px-5 py-4 font-semibold">Recorded rent payments · {month}</h3>
                {register.payments.length ? (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[650px] text-left text-sm">
                      <thead className="bg-muted/50 text-muted-foreground">
                        <tr>
                          {['Property', 'Received on', 'Amount', 'Reference', 'Correction'].map(
                            (label) => (
                              <th key={label} className="px-5 py-3 font-medium">
                                {label}
                              </th>
                            )
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {register.payments.map((payment) => (
                          <tr key={payment.id} className="border-t">
                            <td className="px-5 py-3">
                              {names.get(payment.property_id) ?? 'Unknown property'}
                            </td>
                            <td className="px-5 py-3">{payment.received_on}</td>
                            <td className="px-5 py-3">{money(Number(payment.amount_aud))}</td>
                            <td className="px-5 py-3">{payment.reference || '—'}</td>
                            <td className="px-5 py-3">
                              {payment.voided_at ? (
                                `Voided ${payment.voided_at.slice(0, 10)}: ${payment.void_reason}`
                              ) : (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setCorrection({ kind: 'rent_void', id: payment.id })
                                  }
                                  className="text-[#1f6a7c] underline"
                                >
                                  Void mistaken entry
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="px-5 pb-5 text-sm text-muted-foreground">
                    No rent payments recorded for {month}.
                  </p>
                )}
              </div>
            )}
          </section>
        </>
      ) : null}
    </>
  );
}
