'use client';

import { Button, Card, CardContent } from '@hr-portal/ui';
import { BellRing, CalendarClock, Loader2, RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { UhpAccessManagerButton } from './UhpAccessManagerDialog';
import { UhpWorkspaceHeader } from './UhpWorkspaceHeader';

type ReminderData = {
  timezone: string;
  deliveryTime: string;
  definitions: Array<{
    type: string;
    label: string;
    next: { deadlineDate: string; deliveryDate: string } | null;
  }>;
  runs: Array<{
    id: string;
    reminder_type: string;
    scheduled_for: string;
    status: string;
    destination_key: string;
    error_message: string | null;
  }>;
};

export function UhpRemindersPage({ isAdmin = false }: { isAdmin?: boolean }) {
  const [data, setData] = useState<ReminderData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    setLoading(true);
    const response = await fetch('/api/uhp/reminders');
    const payload = await response.json();
    setError(response.ok ? null : (payload.error ?? 'Failed to load reminders'));
    if (response.ok) setData(payload.data);
    setLoading(false);
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      <UhpWorkspaceHeader
        title="Herbalife Portal Reminders"
        description="Telegram reminders are scheduled in Philippine time. Monthly deadlines that fall on a weekend are sent on the preceding Friday."
        actions={
          <div className="flex gap-2">
            {isAdmin && (
              <UhpAccessManagerButton module="portal_reminders" label="Portal Reminders" />
            )}
            <Button variant="outline" onClick={() => void load()}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
          </div>
        }
      />
      {loading ? (
        <div className="py-16 text-center text-muted-foreground">
          <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />
          Loading reminder schedule...
        </div>
      ) : error ? (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 p-4 text-destructive">
          {error}
        </div>
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-3">
            {data?.definitions.map((item) => (
              <Card key={item.type}>
                <CardContent className="p-5">
                  <BellRing className="mb-4 h-5 w-5 text-emerald-600" />
                  <p className="font-medium">{item.label}</p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Next delivery:{' '}
                    <span className="font-medium text-foreground">
                      {item.next?.deliveryDate ?? 'Not scheduled'}
                    </span>{' '}
                    at {data.deliveryTime}
                  </p>
                  {item.next && item.next.deliveryDate !== item.next.deadlineDate && (
                    <p className="mt-1 text-xs text-amber-700">
                      Adjusted from the {item.next.deadlineDate} weekend deadline.
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
          <Card>
            <CardContent className="p-0">
              <div className="flex items-center gap-2 border-b p-4 font-medium">
                <CalendarClock className="h-4 w-4" />
                Delivery history · {data?.timezone}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b bg-muted/40 text-xs uppercase text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3">Reminder</th>
                      <th className="px-4 py-3">Scheduled</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Destination</th>
                      <th className="px-4 py-3">Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data?.runs.length ? (
                      data.runs.map((run) => (
                        <tr key={run.id} className="border-b last:border-0">
                          <td className="px-4 py-3">{run.reminder_type}</td>
                          <td className="px-4 py-3">
                            {new Date(run.scheduled_for).toLocaleString()}
                          </td>
                          <td className="px-4 py-3">{run.status}</td>
                          <td className="px-4 py-3">{run.destination_key}</td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {run.error_message ?? '—'}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-muted-foreground">
                          No delivery runs have been reported yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
