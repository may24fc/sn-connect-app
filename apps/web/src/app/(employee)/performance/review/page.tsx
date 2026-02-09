'use client';

import {
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
  Label,
  type PerformanceRating,
  Progress,
  RATING_CONFIG,
  type ReviewStatus,
  ReviewStatusBadge,
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
  FileText,
  Save,
  Send,
  Star,
  Target,
} from 'lucide-react';
import Link from 'next/link';
import { type ReactNode, useState } from 'react';

// Mock data
const mockReviewStatus: ReviewStatus = 'pending_self';

interface SelfAssessmentForm {
  accomplishments: string;
  challenges: string;
  areasOfImprovement: string;
  goals: string;
  additionalComments: string;
  selfRating: PerformanceRating | null;
}

function StarRating({
  value,
  onChange,
  readonly = false,
}: {
  value: number;
  onChange?: (rating: number) => void;
  readonly?: boolean;
}): ReactNode {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={readonly}
          onClick={() => onChange?.(star)}
          className={`transition-all ${readonly ? '' : 'cursor-pointer hover:scale-110'}`}
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

export default function ReviewPage(): ReactNode {
  const [form, setForm] = useState<SelfAssessmentForm>({
    accomplishments: '',
    challenges: '',
    areasOfImprovement: '',
    goals: '',
    additionalComments: '',
    selfRating: null,
  });
  const [starRating, setStarRating] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);

  const isFormValid = (): boolean => {
    return (
      form.accomplishments.trim().length >= 50 &&
      form.challenges.trim().length >= 20 &&
      form.areasOfImprovement.trim().length >= 20 &&
      form.goals.trim().length >= 20 &&
      form.selfRating !== null &&
      starRating > 0
    );
  };

  const getFormProgress = (): number => {
    let progress = 0;
    if (form.accomplishments.trim().length >= 50) progress += 20;
    if (form.challenges.trim().length >= 20) progress += 15;
    if (form.areasOfImprovement.trim().length >= 20) progress += 15;
    if (form.goals.trim().length >= 20) progress += 15;
    if (form.selfRating !== null) progress += 20;
    if (starRating > 0) progress += 15;
    return progress;
  };

  const handleSaveDraft = async (): Promise<void> => {
    setIsSaving(true);
    // TODO: Implement API call
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsSaving(false);
  };

  const handleSubmit = async (): Promise<void> => {
    setConfirmDialogOpen(false);
    setIsSaving(true);
    // TODO: Implement API call
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsSaving(false);
  };

  const ratingDescriptions: Record<PerformanceRating, string> = {
    exceptional: 'I consistently exceeded all expectations and delivered outstanding results',
    exceeds: 'I frequently exceeded expectations and delivered high-quality work',
    meets: 'I consistently met job requirements and expectations',
    needs_improvement: 'I had challenges meeting some expectations this period',
    unsatisfactory: 'I struggled significantly with my responsibilities',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/performance">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Self-Assessment</h1>
            <p className="text-muted-foreground">Complete your performance self-review</p>
          </div>
        </div>
        <ReviewStatusBadge status={mockReviewStatus} />
      </div>

      {/* Progress Card */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Form Completion</span>
            <span className="text-sm text-muted-foreground">{getFormProgress()}%</span>
          </div>
          <Progress value={getFormProgress()} className="h-2" />
        </CardContent>
      </Card>

      {/* Performance Summary */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10">
                <Target className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">OKR Progress</p>
                <p className="text-xl font-bold">75%</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-warning/10">
                <BarChart3 className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">KPI Score</p>
                <p className="text-xl font-bold">98%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Assessment Form */}
      <Tabs defaultValue="accomplishments" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 lg:grid-cols-5">
          <TabsTrigger value="accomplishments">Accomplishments</TabsTrigger>
          <TabsTrigger value="challenges">Challenges</TabsTrigger>
          <TabsTrigger value="improvement">Improvement</TabsTrigger>
          <TabsTrigger value="goals" className="hidden lg:block">
            Goals
          </TabsTrigger>
          <TabsTrigger value="rating" className="hidden lg:block">
            Rating
          </TabsTrigger>
        </TabsList>

        <TabsContent value="accomplishments">
          <Card>
            <CardHeader>
              <CardTitle>Key Accomplishments</CardTitle>
              <CardDescription>
                Describe your main achievements during this performance period. Reference specific
                projects, metrics, or outcomes.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="List your key accomplishments, successful projects, and measurable outcomes..."
                value={form.accomplishments}
                onChange={(e) => setForm({ ...form, accomplishments: e.target.value })}
                className="min-h-[200px]"
              />
              <p className="mt-2 text-xs text-muted-foreground">
                Minimum 50 characters required ({form.accomplishments.length}/50)
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="challenges">
          <Card>
            <CardHeader>
              <CardTitle>Challenges Faced</CardTitle>
              <CardDescription>
                Describe any challenges or obstacles you encountered and how you addressed them.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="What challenges did you face? How did you overcome them?"
                value={form.challenges}
                onChange={(e) => setForm({ ...form, challenges: e.target.value })}
                className="min-h-[150px]"
              />
              <p className="mt-2 text-xs text-muted-foreground">
                Minimum 20 characters required ({form.challenges.length}/20)
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="improvement">
          <Card>
            <CardHeader>
              <CardTitle>Areas for Improvement</CardTitle>
              <CardDescription>
                Identify areas where you can grow and improve. Be honest and constructive.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="What skills or areas would you like to develop further?"
                value={form.areasOfImprovement}
                onChange={(e) => setForm({ ...form, areasOfImprovement: e.target.value })}
                className="min-h-[150px]"
              />
              <p className="mt-2 text-xs text-muted-foreground">
                Minimum 20 characters required ({form.areasOfImprovement.length}/20)
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="goals">
          <Card>
            <CardHeader>
              <CardTitle>Goals for Next Period</CardTitle>
              <CardDescription>
                What goals would you like to set for the upcoming performance period?
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Describe your professional goals and how you plan to achieve them..."
                value={form.goals}
                onChange={(e) => setForm({ ...form, goals: e.target.value })}
                className="min-h-[150px]"
              />
              <p className="mt-2 text-xs text-muted-foreground">
                Minimum 20 characters required ({form.goals.length}/20)
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rating">
          <Card>
            <CardHeader>
              <CardTitle>Self-Rating</CardTitle>
              <CardDescription>Rate your overall performance for this period.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Star Rating */}
              <div className="flex flex-col items-center gap-4 py-4">
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
                      onClick={() => setForm({ ...form, selfRating: rating })}
                      className={`flex items-start gap-3 p-3 rounded-lg border text-left transition-colors ${
                        form.selfRating === rating
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:bg-muted/50'
                      }`}
                    >
                      <div
                        className={`mt-1 h-4 w-4 rounded-full shrink-0 ${RATING_CONFIG[rating].color}`}
                      />
                      <div>
                        <p className="font-medium">{RATING_CONFIG[rating].label}</p>
                        <p className="text-sm text-muted-foreground">
                          {ratingDescriptions[rating]}
                        </p>
                      </div>
                      {form.selfRating === rating && (
                        <CheckCircle2 className="h-5 w-5 text-primary shrink-0 ml-auto" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Additional Comments */}
              <div className="space-y-2 pt-4 border-t border-border">
                <Label>Additional Comments (Optional)</Label>
                <Textarea
                  placeholder="Any additional comments you'd like to share..."
                  value={form.additionalComments}
                  onChange={(e) => setForm({ ...form, additionalComments: e.target.value })}
                  className="min-h-[100px]"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Action Buttons */}
      <Card>
        <CardFooter className="flex justify-between p-4">
          <Button variant="outline" onClick={handleSaveDraft} disabled={isSaving}>
            <Save className="mr-2 h-4 w-4" />
            {isSaving ? 'Saving...' : 'Save Draft'}
          </Button>
          <Button onClick={() => setConfirmDialogOpen(true)} disabled={!isFormValid() || isSaving}>
            <Send className="mr-2 h-4 w-4" />
            Submit Assessment
          </Button>
        </CardFooter>
      </Card>

      {/* Confirmation Dialog */}
      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Submit Self-Assessment
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to submit your self-assessment? Once submitted, you will not be
              able to make changes. Your manager will be notified to complete their review.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit}>
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Confirm Submission
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
