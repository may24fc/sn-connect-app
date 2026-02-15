import { Card, CardContent, CardHeader, CardTitle } from '../../primitives/card';

export interface AnnouncementAnalyticsProps {
  readCount: number;
  uniqueReaders: number;
  timeSeries: Array<{ date: string; count: number }>;
}

export function AnnouncementAnalytics({
  readCount,
  uniqueReaders,
  timeSeries,
}: AnnouncementAnalyticsProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-4">
          <CardHeader className="p-0 pb-2">
            <CardTitle className="text-sm text-zinc-600 dark:text-zinc-400">Read Count</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">{readCount}</p>
          </CardContent>
        </Card>
        <Card className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-4">
          <CardHeader className="p-0 pb-2">
            <CardTitle className="text-sm text-zinc-600 dark:text-zinc-400">
              Unique Readers
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">{uniqueReaders}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-4">
        <CardHeader className="p-0 pb-3">
          <CardTitle className="text-sm text-zinc-600 dark:text-zinc-400">Read Trend</CardTitle>
        </CardHeader>
        <CardContent className="p-0 space-y-2">
          {timeSeries.length === 0 ? (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">No read activity yet.</p>
          ) : (
            timeSeries.map((item) => (
              <div key={item.date} className="flex items-center justify-between text-sm">
                <span className="text-zinc-600 dark:text-zinc-400">{item.date}</span>
                <span className="font-medium text-zinc-900 dark:text-zinc-50">{item.count}</span>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
