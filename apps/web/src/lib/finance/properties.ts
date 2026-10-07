export type FinanceProperty = {
  id: string;
  name: string;
  property_type: string;
  tenant_name: string | null;
  occupancy: 'occupied' | 'vacant';
  weekly_rent_aud: number;
  due_day: number;
  created_by: string;
  created_at: string;
};

export type RentPayment = {
  id: string;
  property_id: string;
  period_month: string;
  received_on: string;
  amount_aud: number;
  reference: string | null;
  voided_at: string | null;
  void_reason: string | null;
  created_by: string;
  created_at: string;
};

export type MaintenanceJob = {
  id: string;
  property_id: string;
  job_date: string;
  description: string;
  contractor: string | null;
  cost_aud: number;
  invoice_reference: string | null;
  status: 'scheduled' | 'awaiting_invoice' | 'paid';
  created_by: string;
  created_at: string;
};

export type PropertyRegister = {
  properties: Array<FinanceProperty>;
  payments: Array<RentPayment>;
  maintenance: Array<MaintenanceJob>;
  statusEvents: Array<MaintenanceStatusEvent>;
};

export type MaintenanceStatusEvent = {
  id: string;
  maintenance_id: string;
  previous_status: MaintenanceJob['status'];
  next_status: MaintenanceJob['status'];
  changed_at: string;
  changed_by: string;
};

export type PropertyQuery<T> = PromiseLike<{
  data: Array<T> | null;
  count: number | null;
  error: { message: string } | null;
}> & {
  select: (columns: string, options?: { count: 'exact' }) => PropertyQuery<T>;
  eq: (column: string, value: string) => PropertyQuery<T>;
  gte: (column: string, value: string) => PropertyQuery<T>;
  lt: (column: string, value: string) => PropertyQuery<T>;
  order: (column: string, options?: { ascending: boolean }) => PropertyQuery<T>;
  limit: (count: number) => PropertyQuery<T>;
  in: (column: string, values: Array<string>) => PropertyQuery<T>;
  insert: (value: Record<string, unknown>) => PropertyQuery<T>;
  update: (value: Record<string, unknown>) => PropertyQuery<T>;
  single: () => Promise<{ data: T | null; error: { message: string } | null }>;
  maybeSingle: () => Promise<{ data: T | null; error: { message: string } | null }>;
};

export type PropertyClient = {
  from(table: 'finance_properties'): PropertyQuery<FinanceProperty>;
  from(table: 'finance_property_rent_payments'): PropertyQuery<RentPayment>;
  from(table: 'finance_property_maintenance'): PropertyQuery<MaintenanceJob>;
  from(table: 'finance_property_maintenance_status_events'): PropertyQuery<MaintenanceStatusEvent>;
};

export function monthlyRent(weekly: number): number {
  return Math.round(((Number(weekly) * 52) / 12 + Number.EPSILON) * 100) / 100;
}

export function propertySummary(register: PropertyRegister, month: string, today: string) {
  const rows = register.properties.map((property) => {
    const due = property.occupancy === 'occupied' ? monthlyRent(property.weekly_rent_aud) : 0;
    const received = register.payments
      .filter((payment) => payment.property_id === property.id && !payment.voided_at)
      .reduce((sum, payment) => sum + Number(payment.amount_aud), 0);
    const maintenance = register.maintenance
      .filter((job) => job.property_id === property.id)
      .reduce((sum, job) => sum + Number(job.cost_aud), 0);
    const dueDate = `${month}-${String(property.due_day).padStart(2, '0')}`;
    const outstanding = Math.max(0, Math.round((due - received) * 100) / 100);
    const status =
      property.occupancy === 'vacant'
        ? 'Vacant'
        : outstanding === 0
          ? 'Paid'
          : dueDate < today
            ? 'Overdue'
            : received > 0
              ? 'Partially paid'
              : 'Due';
    return { property, due, received, maintenance, dueDate, outstanding, status };
  });
  return {
    rows,
    due: rows.reduce((sum, row) => sum + row.due, 0),
    received: rows.reduce((sum, row) => sum + row.received, 0),
    overdue: rows
      .filter((row) => row.status === 'Overdue')
      .reduce((sum, row) => sum + row.outstanding, 0),
    maintenance: rows.reduce((sum, row) => sum + row.maintenance, 0),
    missingInvoices: register.maintenance.filter((job) => !job.invoice_reference).length,
  };
}
