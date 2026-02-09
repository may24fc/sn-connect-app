'use client';

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
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
  Calendar,
  ChevronRight,
  Megaphone,
  Star,
  Target,
  TrendingUp,
} from 'lucide-react';
import { type ReactNode, useState } from 'react';

interface Announcement {
  id: string;
  title: string;
  content: string;
  category: string;
  date: string;
  isNew: boolean;
}

interface GrowthItem {
  id: string;
  title: string;
  description: string;
  progress: number;
  dueDate?: string;
  type: 'course' | 'goal' | 'achievement';
}

// Mock announcements data
const announcements: Array<Announcement> = [
  {
    id: '1',
    title: 'Company Holiday Schedule 2024',
    content:
      'Please review the updated holiday schedule for 2024. All regular holidays and special non-working days have been updated in the HR system.',
    category: 'HR Updates',
    date: '2 hours ago',
    isNew: true,
  },
  {
    id: '2',
    title: 'New Health Benefits Package',
    content:
      'We are excited to announce enhanced health benefits starting February 2024. This includes increased coverage for dental and vision care.',
    category: 'Benefits',
    date: '1 day ago',
    isNew: true,
  },
  {
    id: '3',
    title: 'Q4 Town Hall Meeting Recap',
    content:
      'Thank you to everyone who attended the Q4 Town Hall. For those who missed it, the recording is now available on the company intranet.',
    category: 'Events',
    date: '2 days ago',
    isNew: false,
  },
  {
    id: '4',
    title: 'Performance Review Period',
    content:
      'Annual performance reviews will begin on January 15. Please ensure all self-assessments are completed by January 20.',
    category: 'Performance',
    date: '3 days ago',
    isNew: false,
  },
  {
    id: '5',
    title: 'New Learning Platform Launch',
    content:
      'We are launching a new learning management system next week. Stay tuned for training sessions on how to use the new platform.',
    category: 'Training',
    date: '1 week ago',
    isNew: false,
  },
];

// Mock growth data
const growthItems: Array<GrowthItem> = [
  {
    id: '1',
    title: 'Leadership Fundamentals',
    description: 'Complete the leadership training course',
    progress: 75,
    dueDate: 'Feb 28, 2024',
    type: 'course',
  },
  {
    id: '2',
    title: 'Q1 Performance Goals',
    description: 'Achieve quarterly performance targets',
    progress: 40,
    dueDate: 'Mar 31, 2024',
    type: 'goal',
  },
  {
    id: '3',
    title: 'Communication Skills',
    description: 'Complete the effective communication workshop',
    progress: 100,
    type: 'course',
  },
  {
    id: '4',
    title: 'Project Management Certification',
    description: 'Obtain PMP certification',
    progress: 20,
    dueDate: 'Jun 30, 2024',
    type: 'goal',
  },
];

const categoryColors: Record<string, string> = {
  'HR Updates': 'bg-primary/10 text-primary',
  Benefits: 'bg-success/10 text-success',
  Events: 'bg-warning/10 text-warning',
  Performance: 'bg-error/10 text-error',
  Training: 'bg-purple-100 text-purple-600',
};

const typeIcons: Record<GrowthItem['type'], typeof BookOpen> = {
  course: BookOpen,
  goal: Target,
  achievement: Award,
};

export default function AnnouncementsPage(): ReactNode {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const categories = [...new Set(announcements.map((a) => a.category))];

  const filteredAnnouncements = selectedCategory
    ? announcements.filter((a) => a.category === selectedCategory)
    : announcements;

  const completedCourses = growthItems.filter((item) => item.progress === 100).length;

  return (
    <div className="space-y-6">
      {/* Header */}
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

        {/* Announcements Tab */}
        <TabsContent value="announcements" className="space-y-6">
          {/* Category Filters */}
          <div className="flex flex-wrap gap-2">
            <Button
              variant={selectedCategory === null ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory(null)}
            >
              All
            </Button>
            {categories.map((category) => (
              <Button
                key={category}
                variant={selectedCategory === category ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedCategory(category)}
              >
                {category}
              </Button>
            ))}
          </div>

          {/* Announcements List */}
          <div className="space-y-4">
            {filteredAnnouncements.map((announcement) => (
              <Card
                key={announcement.id}
                className="cursor-pointer hover:shadow-card-hover transition-shadow"
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="secondary"
                          className={categoryColors[announcement.category]}
                        >
                          {announcement.category}
                        </Badge>
                        {announcement.isNew && (
                          <Badge variant="default" className="bg-primary">
                            New
                          </Badge>
                        )}
                      </div>
                      <h3 className="text-lg font-semibold">{announcement.title}</h3>
                      <p className="text-muted-foreground line-clamp-2">{announcement.content}</p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        {announcement.date}
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* My Growth Tab */}
        <TabsContent value="growth" className="space-y-6">
          {/* Growth Stats */}
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

          {/* Growth Items */}
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
                        {isCompleted && (
                          <Badge variant="success" className="flex-shrink-0">
                            Completed
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{item.description}</p>
                      {!isCompleted && (
                        <div className="mt-2 flex items-center gap-3">
                          <Progress value={item.progress} className="h-2 flex-1" />
                          <span className="text-sm font-medium">{item.progress}%</span>
                        </div>
                      )}
                      {item.dueDate && !isCompleted && (
                        <p className="mt-1 text-xs text-muted-foreground">Due: {item.dueDate}</p>
                      )}
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
