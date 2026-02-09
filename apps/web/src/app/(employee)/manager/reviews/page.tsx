'use client';

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  type KPI,
  KPIList,
  Label,
  type OKR,
  OKRList,
  type PerformanceRating,
  RATING_CONFIG,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Textarea,
} from '@hr-portal/ui';
import {
  ArrowLeft,
  BarChart3,
  CheckCircle2,
  Clock,
  FileText,
  MessageSquare,
  Star,
  Target,
} from 'lucide-react';
import Link from 'next/link';
import { type ReactNode, useState } from 'react';

// Mock data for employee pending review
const mockEmployee = {
  id: 'emp-1',
  name: 'John Doe',
  email: 'john.doe@company.com',
  position: 'Senior Developer',
  department: 'Engineering',
  avatarUrl: undefined,
  selfAssessment: {
    accomplishments:
      'Led the development of the new HR Portal system, implementing modern React architecture with TypeScript. Successfully migrated legacy systems reducing technical debt by 40%. Mentored 2 junior developers.',
    challenges:
      'Faced tight deadlines with the portal launch but managed through effective prioritization and communication with stakeholders.',
    areasOfImprovement:
      'Would like to improve my public speaking skills and take on more leadership roles in cross-team projects.',
    goals:
      'Complete AWS certification, lead at least one major cross-functional project, and mentor another team member.',
    selfRating: 'exceeds' as PerformanceRating,
  },
};

const mockOKRs: Array<OKR> = [
  {
    id: 'okr-1' as OKR['id'],
    employeeId: 'emp-1' as OKR['employeeId'],
    cycleId: 'cycle-2024-q1' as OKR['cycleId'],
    objective: 'Deliver HR Portal MVP',
    status: 'completed',
    progressPercentage: 100,
    keyResults: [
      {
        id: 'kr-1' as OKR['keyResults'][0]['id'],
        okrId: 'okr-1' as OKR['keyResults'][0]['okrId'],
        description: 'Complete core modules (Dashboard, Profile, Payroll)',
        targetValue: 100,
        currentValue: 100,
        unit: '%',
        weight: 50,
        progressPercentage: 100,
        createdAt: '2024-01-01',
        updatedAt: '2024-02-15',
      },
      {
        id: 'kr-2' as OKR['keyResults'][0]['id'],
        okrId: 'okr-1' as OKR['keyResults'][0]['okrId'],
        description: 'Achieve 90% test coverage',
        targetValue: 90,
        currentValue: 85,
        unit: '%',
        weight: 30,
        progressPercentage: 94,
        createdAt: '2024-01-01',
        updatedAt: '2024-02-15',
      },
    ],
    createdAt: '2024-01-01',
    updatedAt: '2024-02-15',
  },
];

const mockKPIs: Array<KPI> = [
  {
    id: 'kpi-1' as KPI['id'],
    employeeId: 'emp-1' as KPI['employeeId'],
    cycleId: 'cycle-2024-q1' as KPI['cycleId'],
    name: 'Code Quality Score',
    target: 80,
    actual: 88,
    unit: '%',
    weight: 30,
    score: 110,
    createdAt: '2024-01-01',
    updatedAt: '2024-02-15',
  },
  {
    id: 'kpi-2' as KPI['id'],
    employeeId: 'emp-1' as KPI['employeeId'],
    cycleId: 'cycle-2024-q1' as KPI['cycleId'],
    name: 'Sprint Velocity',
    target: 40,
    actual: 42,
    unit: 'points',
    weight: 25,
    score: 105,
    createdAt: '2024-01-01',
    updatedAt: '2024-02-15',
  },
];

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function StarRating({
  value,
  onChange,
}: {
  value: number;
  onChange: (rating: number) => void;
}): ReactNode {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          className="cursor-pointer transition-all hover:scale-110"
        >
          <Star
            className={`h-8 w-8 ${
              star <= value ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'
            }`}
          />
        </button>
      ))}
    </div>
  );
}

export default function ManagerReviewsPage(): ReactNode {
  const [managerFeedback, setManagerFeedback] = useState('');
  const [managerRating, setManagerRating] = useState<PerformanceRating | null>(null);
  const [starRating, setStarRating] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);

  const avgOkrProgress =
    mockOKRs.length > 0
      ? Math.round(mockOKRs.reduce((sum, o) => sum + o.progressPercentage, 0) / mockOKRs.length)
      : 0;

  const avgKpiScore =
    mockKPIs.length > 0
      ? Math.round(mockKPIs.reduce((sum, k) => sum + k.score, 0) / mockKPIs.length)
      : 0;

  const isFormValid = (): boolean => {
    return managerFeedback.trim().length >= 50 && managerRating !== null && starRating > 0;
  };

  const handleSubmit = async (): Promise<void> => {
    setConfirmDialogOpen(false);
    setIsSubmitting(true);
    // TODO: Implement API call
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsSubmitting(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/manager/team-performance">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Manager Review</h1>
            <p className="text-muted-foreground">Complete the performance review</p>
          </div>
        </div>
        <Badge variant="warning" className="gap-1">
          <Clock className="h-3 w-3" />
          Pending Your Review
        </Badge>
      </div>

      {/* Employee Info Card */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              {mockEmployee.avatarUrl && <AvatarImage src={mockEmployee.avatarUrl} />}
              <AvatarFallback className="text-lg">{getInitials(mockEmployee.name)}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h2 className="text-xl font-semibold">{mockEmployee.name}</h2>
              <p className="text-muted-foreground">{mockEmployee.position}</p>
              <p className="text-sm text-muted-foreground">{mockEmployee.department}</p>
            </div>
            <div className="hidden sm:flex gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold">{avgOkrProgress}%</p>
                <p className="text-xs text-muted-foreground">OKR Progress</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold">{avgKpiScore}%</p>
                <p className="text-xs text-muted-foreground">KPI Score</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Review Tabs */}
      <Tabs defaultValue="self-assessment" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="self-assessment">Self-Assessment</TabsTrigger>
          <TabsTrigger value="okrs">OKRs</TabsTrigger>
          <TabsTrigger value="kpis">KPIs</TabsTrigger>
          <TabsTrigger value="your-review">Your Review</TabsTrigger>
        </TabsList>

        {/* Self-Assessment Tab */}
        <TabsContent value="self-assessment">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                Employee Self-Assessment
              </CardTitle>
              <CardDescription>
                Review what {mockEmployee.name} submitted about their performance
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label className="text-muted-foreground">Self-Rating</Label>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-lg px-4 py-2">
                    {RATING_CONFIG[mockEmployee.selfAssessment.selfRating].label}
                  </Badge>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-muted-foreground">Key Accomplishments</Label>
                <p className="text-sm p-3 rounded-lg bg-muted/50">
                  {mockEmployee.selfAssessment.accomplishments}
                </p>
              </div>

              <div className="space-y-2">
                <Label className="text-muted-foreground">Challenges Faced</Label>
                <p className="text-sm p-3 rounded-lg bg-muted/50">
                  {mockEmployee.selfAssessment.challenges}
                </p>
              </div>

              <div className="space-y-2">
                <Label className="text-muted-foreground">Areas for Improvement</Label>
                <p className="text-sm p-3 rounded-lg bg-muted/50">
                  {mockEmployee.selfAssessment.areasOfImprovement}
                </p>
              </div>

              <div className="space-y-2">
                <Label className="text-muted-foreground">Goals for Next Period</Label>
                <p className="text-sm p-3 rounded-lg bg-muted/50">
                  {mockEmployee.selfAssessment.goals}
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* OKRs Tab */}
        <TabsContent value="okrs">
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-success" />
                  Objectives & Key Results
                </CardTitle>
                <CardDescription>Average Progress: {avgOkrProgress}%</CardDescription>
              </CardHeader>
            </Card>
            <OKRList okrs={mockOKRs} readonly />
          </div>
        </TabsContent>

        {/* KPIs Tab */}
        <TabsContent value="kpis">
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-warning" />
                  Key Performance Indicators
                </CardTitle>
                <CardDescription>Average Score: {avgKpiScore}%</CardDescription>
              </CardHeader>
            </Card>
            <KPIList kpis={mockKPIs} />
          </div>
        </TabsContent>

        {/* Your Review Tab */}
        <TabsContent value="your-review">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-primary" />
                Your Manager Review
              </CardTitle>
              <CardDescription>
                Provide your assessment of {mockEmployee.name}'s performance
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Star Rating */}
              <div className="flex flex-col items-center gap-4 py-4">
                <Label>Overall Rating</Label>
                <StarRating value={starRating} onChange={setStarRating} />
                <p className="text-lg font-semibold">{starRating}/5 Stars</p>
              </div>

              {/* Performance Rating */}
              <div className="space-y-3">
                <Label>Performance Level</Label>
                <div className="grid gap-2">
                  {(Object.keys(RATING_CONFIG) as Array<PerformanceRating>).map((rating) => (
                    <button
                      key={rating}
                      type="button"
                      onClick={() => setManagerRating(rating)}
                      className={`flex items-start gap-3 p-3 rounded-lg border text-left transition-colors ${
                        managerRating === rating
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:bg-muted/50'
                      }`}
                    >
                      <div
                        className={`mt-1 h-4 w-4 rounded-full shrink-0 ${RATING_CONFIG[rating].color}`}
                      />
                      <div className="flex-1">
                        <p className="font-medium">{RATING_CONFIG[rating].label}</p>
                        <p className="text-sm text-muted-foreground">
                          {RATING_CONFIG[rating].description}
                        </p>
                      </div>
                      {managerRating === rating && (
                        <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Manager Feedback */}
              <div className="space-y-2">
                <Label>Detailed Feedback</Label>
                <Textarea
                  placeholder="Provide specific feedback on strengths, areas for improvement, and recommendations..."
                  value={managerFeedback}
                  onChange={(e) => setManagerFeedback(e.target.value)}
                  className="min-h-[150px]"
                />
                <p className="text-xs text-muted-foreground">
                  Minimum 50 characters required ({managerFeedback.length}/50)
                </p>
              </div>
            </CardContent>
            <CardFooter className="flex justify-end gap-3 border-t border-border pt-4">
              <Button
                onClick={() => setConfirmDialogOpen(true)}
                disabled={!isFormValid() || isSubmitting}
              >
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Submit Review
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Confirmation Dialog */}
      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Submit Manager Review
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to submit your review for {mockEmployee.name}? This will
              finalize the performance review and notify HR.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Clock className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Confirm Submission
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
