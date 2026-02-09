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
  BookOpen,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Circle,
  FileText,
  Laptop,
  Users,
} from 'lucide-react';
import { type ReactNode, useState } from 'react';

interface ChecklistItem {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  category: string;
  dueDate?: string;
}

interface ChecklistCategory {
  id: string;
  title: string;
  icon: typeof FileText;
  items: Array<ChecklistItem>;
}

// Mock onboarding data
const onboardingCategories: Array<ChecklistCategory> = [
  {
    id: 'documents',
    title: 'Document Submission',
    icon: FileText,
    items: [
      {
        id: '1',
        title: 'Submit Government IDs',
        description: 'Upload valid government-issued IDs (front and back)',
        completed: true,
        category: 'documents',
      },
      {
        id: '2',
        title: 'Submit NBI Clearance',
        description: 'Upload your NBI clearance certificate',
        completed: true,
        category: 'documents',
      },
      {
        id: '3',
        title: 'Submit SSS, PhilHealth, Pag-IBIG',
        description: 'Upload your government benefit documents',
        completed: false,
        category: 'documents',
        dueDate: 'Jan 20, 2024',
      },
    ],
  },
  {
    id: 'hr',
    title: 'HR Requirements',
    icon: Users,
    items: [
      {
        id: '4',
        title: 'Complete Employee Information Form',
        description: 'Fill out your personal and emergency contact details',
        completed: true,
        category: 'hr',
      },
      {
        id: '5',
        title: 'Sign Employment Contract',
        description: 'Review and sign your employment contract',
        completed: true,
        category: 'hr',
      },
      {
        id: '6',
        title: 'Attend HR Orientation',
        description: 'Attend the HR orientation session',
        completed: false,
        category: 'hr',
        dueDate: 'Jan 18, 2024',
      },
    ],
  },
  {
    id: 'it',
    title: 'IT Setup',
    icon: Laptop,
    items: [
      {
        id: '7',
        title: 'Set up company email',
        description: 'Activate and configure your company email account',
        completed: true,
        category: 'it',
      },
      {
        id: '8',
        title: 'Install required software',
        description: 'Install all required work applications',
        completed: false,
        category: 'it',
      },
      {
        id: '9',
        title: 'Complete security training',
        description: 'Complete the IT security awareness training module',
        completed: false,
        category: 'it',
        dueDate: 'Jan 25, 2024',
      },
    ],
  },
  {
    id: 'training',
    title: 'Training & Development',
    icon: BookOpen,
    items: [
      {
        id: '10',
        title: 'Complete company culture training',
        description: 'Learn about our company values and culture',
        completed: false,
        category: 'training',
      },
      {
        id: '11',
        title: 'Meet with mentor',
        description: 'Schedule and complete your first mentor meeting',
        completed: false,
        category: 'training',
      },
    ],
  },
];

// Mock offboarding data
const offboardingCategories: Array<ChecklistCategory> = [
  {
    id: 'clearance',
    title: 'Clearance Process',
    icon: FileText,
    items: [
      {
        id: 'o1',
        title: 'Return company equipment',
        description: 'Return all company-issued devices and accessories',
        completed: false,
        category: 'clearance',
      },
      {
        id: 'o2',
        title: 'Clear financial obligations',
        description: 'Settle any pending loans or cash advances',
        completed: false,
        category: 'clearance',
      },
    ],
  },
  {
    id: 'it-offboard',
    title: 'IT Clearance',
    icon: Laptop,
    items: [
      {
        id: 'o3',
        title: 'Backup personal files',
        description: 'Transfer personal files before account deactivation',
        completed: false,
        category: 'it-offboard',
      },
      {
        id: 'o4',
        title: 'Hand over access credentials',
        description: 'Transfer all project access and credentials',
        completed: false,
        category: 'it-offboard',
      },
    ],
  },
];

function CategorySection({
  category,
  expanded,
  onToggle,
}: {
  category: ChecklistCategory;
  expanded: boolean;
  onToggle: () => void;
}): ReactNode {
  const completedCount = category.items.filter((item) => item.completed).length;
  const totalCount = category.items.length;
  const progressPercentage = Math.round((completedCount / totalCount) * 100);
  const Icon = category.icon;

  return (
    <Card>
      <CardHeader className="cursor-pointer" onClick={onToggle}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Icon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">{category.title}</CardTitle>
              <CardDescription>
                {completedCount} of {totalCount} completed
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2">
              <Progress value={progressPercentage} className="h-2 w-24" />
              <span className="text-sm font-medium">{progressPercentage}%</span>
            </div>
            {expanded ? (
              <ChevronUp className="h-5 w-5 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-5 w-5 text-muted-foreground" />
            )}
          </div>
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="border-t pt-4">
          <div className="space-y-4">
            {category.items.map((item) => (
              <div
                key={item.id}
                className="flex items-start gap-3 rounded-lg p-3 transition-colors hover:bg-muted/50"
              >
                <div className="pt-0.5">
                  {item.completed ? (
                    <CheckCircle2 className="h-5 w-5 text-success" />
                  ) : (
                    <Circle className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p
                    className={`font-medium ${
                      item.completed ? 'text-muted-foreground line-through' : ''
                    }`}
                  >
                    {item.title}
                  </p>
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                  {item.dueDate && !item.completed && (
                    <div className="mt-2 flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-warning" />
                      <span className="text-xs text-warning">Due: {item.dueDate}</span>
                    </div>
                  )}
                </div>
                {!item.completed && (
                  <Button size="sm" variant="outline">
                    Complete
                  </Button>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      )}
    </Card>
  );
}

export default function OnboardingPage(): ReactNode {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['documents']));

  const toggleCategory = (categoryId: string): void => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  };

  const totalOnboarding = onboardingCategories.flatMap((c) => c.items);
  const completedOnboarding = totalOnboarding.filter((i) => i.completed);
  const onboardingProgress = Math.round(
    (completedOnboarding.length / totalOnboarding.length) * 100
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Onboarding</h1>
        <p className="text-muted-foreground">
          Track your onboarding progress and complete required tasks
        </p>
      </div>

      {/* Overall Progress */}
      <Card className="bg-gradient-to-r from-primary/5 to-primary/10">
        <CardContent className="p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-2">
              <h2 className="text-lg font-semibold">Overall Progress</h2>
              <div className="flex items-center gap-3">
                <Progress
                  value={onboardingProgress}
                  className="h-3 w-48"
                  indicatorClassName="bg-primary"
                />
                <span className="text-2xl font-bold text-primary">{onboardingProgress}%</span>
              </div>
              <p className="text-sm text-muted-foreground">
                {completedOnboarding.length} of {totalOnboarding.length} tasks completed
              </p>
            </div>
            {onboardingProgress === 100 && (
              <Badge variant="success" className="text-sm px-4 py-2">
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Onboarding Complete!
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="onboarding" className="space-y-4">
        <TabsList>
          <TabsTrigger value="onboarding">Onboarding</TabsTrigger>
          <TabsTrigger value="offboarding">Offboarding</TabsTrigger>
        </TabsList>

        <TabsContent value="onboarding" className="space-y-4">
          {onboardingCategories.map((category) => (
            <CategorySection
              key={category.id}
              category={category}
              expanded={expandedCategories.has(category.id)}
              onToggle={() => toggleCategory(category.id)}
            />
          ))}
        </TabsContent>

        <TabsContent value="offboarding" className="space-y-4">
          <Card className="border-warning/50 bg-warning/5">
            <CardContent className="p-4">
              <p className="text-sm text-warning-600">
                The offboarding checklist will become active when you begin your separation process.
                Contact HR for more information.
              </p>
            </CardContent>
          </Card>
          {offboardingCategories.map((category) => (
            <CategorySection
              key={category.id}
              category={category}
              expanded={expandedCategories.has(category.id)}
              onToggle={() => toggleCategory(category.id)}
            />
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}
