'use client';

import { useAnnouncementFeed } from '@/hooks/useAnnouncementFeed';
import { useMarkAnnouncementRead } from '@/hooks/useMarkAnnouncementRead';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Progress,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@hr-portal/ui';
import {
  ArrowRight,
  Award,
  BookOpen,
  Megaphone,
  Search,
  Star,
  Target,
  TrendingUp,
} from 'lucide-react';
import { useMemo, useState } from 'react';

interface GrowthItem {
  id: string;
  title: string;
  description: string;
  progress: number;
  dueDate?: string;
  type: 'course' | 'goal' | 'achievement';
}

const growthItems: Array<GrowthItem> = [
  {
    id: '1',
    title: 'Leadership Fundamentals',
    description: 'Complete the leadership training course',
    progress: 75,
    dueDate: 'Feb 28, 2026',
    type: 'course',
  },
  {
    id: '2',
    title: 'Q1 Performance Goals',
    description: 'Achieve quarterly performance targets',
    progress: 40,
    dueDate: 'Mar 31, 2026',
    type: 'goal',
  },
  {
    id: '3',
    title: 'Communication Skills',
    description: 'Complete the effective communication workshop',
    progress: 100,
    type: 'course',
  },
];

const typeIcons: Record<GrowthItem['type'], typeof BookOpen> = {
  course: BookOpen,
  goal: Target,
  achievement: Award,
};

export default function AnnouncementsPage() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [readStatus, setReadStatus] = useState<'all' | 'read' | 'unread'>('all');
  const [page, setPage] = useState(1);

  const { data, isLoading, error } = useAnnouncementFeed({
    ...(search ? { search } : {}),
    ...(category !== 'all' ? { category: category as any } : {}),
    readStatus,
    page,
    pageSize: 10,
  });
  const markRead = useMarkAnnouncementRead();

  const announcements = data?.data || [];
  const categories = useMemo(
    () => ['all', ...new Set(announcements.map((announcement) => announcement.category))],
    [announcements]
  );
  const pinnedAnnouncements = announcements.filter((announcement) => announcement.is_pinned);
  const urgentAnnouncements = announcements.filter(
    (announcement) => announcement.priority === 'urgent'
  );

  const completedCourses = growthItems.filter((item) => item.progress === 100).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Information Hub</h1>
        <p className="text-muted-foreground">
          Stay updated with company news and track your growth
        </p>
      </div>

      <Tabs defaultValue="announcements" className="space-y-6">
        <TabsList>
          <TabsTrigger value="announcements">
            <Megaphone className="mr-2 h-4 w-4" />
            Announcements
          </TabsTrigger>
          <TabsTrigger value="growth">
            <TrendingUp className="mr-2 h-4 w-4" />
            My Growth
          </TabsTrigger>
        </TabsList>

        <TabsContent value="announcements" className="space-y-4">
          <div className="flex flex-wrap gap-2 items-center">
            <div className="relative max-w-sm flex-1 min-w-[220px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
              <Input
                className="pl-9"
                placeholder="Search announcements"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
              />
            </div>
            {categories.map((item) => (
              <Button
                key={item}
                variant={category === item ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  setCategory(item);
                  setPage(1);
                }}
              >
                {item}
              </Button>
            ))}
            <Button
              variant={readStatus === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setReadStatus('all')}
            >
              All
            </Button>
            <Button
              variant={readStatus === 'unread' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setReadStatus('unread')}
            >
              Unread
            </Button>
            <Button
              variant={readStatus === 'read' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setReadStatus('read')}
            >
              Read
            </Button>
          </div>

          {urgentAnnouncements.map((announcement) => (
            <div
              key={`urgent-${announcement.id}`}
              className="bg-rose-50 dark:bg-rose-950/30 border-l-4 border-rose-600 rounded-lg p-4 mb-4"
            >
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">
                  {announcement.title}
                </h3>
                <Badge variant="destructive">Urgent</Badge>
              </div>
              <p className="text-sm text-zinc-700 dark:text-zinc-300 mt-1">
                {announcement.excerpt || announcement.content.slice(0, 200)}
              </p>
            </div>
          ))}

          {pinnedAnnouncements.map((announcement) => (
            <div
              key={`pinned-${announcement.id}`}
              className="bg-gradient-to-r from-indigo-50 to-indigo-100 dark:from-indigo-950/50 dark:to-indigo-900/50 border-l-4 border-indigo-600 rounded-lg p-4 mb-4"
            >
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">
                  {announcement.title}
                </h3>
                <Badge>Pinned</Badge>
              </div>
              <p className="text-sm text-zinc-700 dark:text-zinc-300 mt-1">
                {announcement.excerpt || announcement.content.slice(0, 200)}
              </p>
            </div>
          ))}

          {isLoading ? (
            <Card>
              <CardContent className="p-6 text-sm text-zinc-600 dark:text-zinc-400">
                Loading announcements...
              </CardContent>
            </Card>
          ) : error ? (
            <Card>
              <CardContent className="p-6 text-sm text-rose-600 dark:text-rose-400">
                Failed to load announcements.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {announcements.map((announcement) => (
                <div
                  key={announcement.id}
                  className={
                    announcement.is_read
                      ? 'bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-4 opacity-75'
                      : 'bg-white dark:bg-zinc-900 border-l-4 border-indigo-600 border-r border-t border-b border-zinc-200 dark:border-zinc-800 rounded-lg p-4'
                  }
                  onClick={() => {
                    if (!announcement.is_read) {
                      markRead.mutate(announcement.id);
                    }
                  }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">
                      {announcement.title}
                    </h3>
                    {!announcement.is_read ? (
                      <Badge>Unread</Badge>
                    ) : (
                      <Badge variant="secondary">Read</Badge>
                    )}
                  </div>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1 line-clamp-3">
                    {announcement.excerpt || announcement.content.slice(0, 200)}
                  </p>
                  <div className="flex items-center gap-2 mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                    <span>{announcement.category}</span>
                    <span>•</span>
                    <span>{announcement.priority}</span>
                    <span>•</span>
                    <span>
                      {(announcement.published_at || announcement.created_at).slice(0, 10)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-between">
            <Button
              variant="outline"
              onClick={() => setPage((value) => Math.max(1, value - 1))}
              disabled={page === 1}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              onClick={() => setPage((value) => value + 1)}
              disabled={announcements.length < 10}
            >
              Next
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="growth" className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10">
                    <Award className="h-5 w-5 text-success" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Completed</p>
                    <p className="text-2xl font-bold">{completedCourses}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <BookOpen className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">In Progress</p>
                    <p className="text-2xl font-bold">{growthItems.length - completedCourses}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-warning/10">
                    <Star className="h-5 w-5 text-warning" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Learning Hours</p>
                    <p className="text-2xl font-bold">24</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Learning & Development</CardTitle>
              <CardDescription>
                Track your courses and professional development goals
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {growthItems.map((item) => {
                const Icon = typeIcons[item.type];
                const isCompleted = item.progress === 100;

                return (
                  <div
                    key={item.id}
                    className="flex items-center gap-4 rounded-lg border p-4 transition-colors hover:bg-muted/50"
                  >
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                        isCompleted ? 'bg-success/10' : 'bg-primary/10'
                      }`}
                    >
                      <Icon
                        className={`h-5 w-5 ${isCompleted ? 'text-success' : 'text-primary'}`}
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium truncate">{item.title}</h4>
                        {isCompleted ? <Badge variant="success">Completed</Badge> : null}
                      </div>
                      <p className="text-sm text-muted-foreground">{item.description}</p>
                      {!isCompleted ? (
                        <div className="mt-2 flex items-center gap-3">
                          <Progress value={item.progress} className="h-2 flex-1" />
                          <span className="text-sm font-medium">{item.progress}%</span>
                        </div>
                      ) : null}
                    </div>

                    <Button variant="ghost" size="sm">
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
