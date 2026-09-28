'use client';

import type { ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle, Badge } from '@hr-portal/ui';
import { Target, TrendingUp, ClipboardCheck, BarChart3, ChevronRight } from 'lucide-react';

interface FAQItem {
  question: string;
  answer: string;
}

const faqs: FAQItem[] = [
  {
    question: 'What are OKRs?',
    answer:
      'OKRs (Objectives & Key Results) are a goal-setting framework. You define high-level objectives, then add measurable key results (targets) underneath each one. Your overall progress auto-calculates based on how close you are to each target.',
  },
  {
    question: 'How do I create a new objective?',
    answer:
      'Click the "+ New Objective" button at the top of the OKRs & KPIs page. Fill in the objective title, optional description, confirm the active cycle, and set a weight. After saving, click on the objective to add specific targets and KPIs.',
  },
  {
    question: 'What does the "weight" on an objective mean?',
    answer:
      'Weight determines how much each objective contributes to your overall score. For example, if you have two objectives with weights of 2 and 1, the first objective counts for 67% of your overall progress and the second counts for 33%.',
  },
  {
    question: 'How is my Overall Score calculated?',
    answer:
      'Your Overall Score is the weighted average of all your objectives\' progress in the current cycle. Each objective\'s progress percentage is multiplied by its weight, summed up, and divided by the total weight.',
  },
  {
    question: 'What are the different target (key result) types?',
    answer:
      'Targets can be Number (e.g., 10 tasks), Boolean (done/not done), Currency (PHP amounts), or Task-based (completed vs. total). Each type has a different input method when you update progress.',
  },
  {
    question: 'How do I update my progress?',
    answer:
      'Click on any objective to open its detail view. For each target, use the "Update Progress" button to log your current value. Number and currency targets use a numeric input, boolean targets use a toggle switch. Changes are reflected in real-time.',
  },
  {
    question: 'What is a review cycle?',
    answer:
      'A review cycle is a time period (usually a quarter) during which performance is assessed. Your admin creates review cycles with start/end dates plus due dates for OKR submissions, KPI submissions, and self-assessments. You can only create objectives within an active cycle.',
  },
  {
    question: 'What is a self-assessment?',
    answer:
      'During an active review cycle, you\'ll first work against the OKR and KPI due dates set on the cycle. Later, you\'ll be asked to rate yourself on each objective and KPI, and provide a written self-reflection. After you submit, your manager reviews your assessment, followed by HR\'s final evaluation.',
  },
  {
    question: 'What do the performance ratings mean?',
    answer:
      'Ratings range from "Exceptional" (consistently exceeds expectations) to "Unsatisfactory" (does not meet minimum requirements). The middle rating, "Meets Expectations," means you achieved all required objectives.',
  },
  {
    question: 'I can\'t see any objectives. What\'s wrong?',
    answer:
      'Make sure there is an active review cycle — check the banner at the top of the page. If it says "No Active Cycle," your admin hasn\'t created one yet. Contact HR to activate a cycle before creating objectives.',
  },
];

const reviewFlow = [
  { label: 'Self-Assessment', description: 'You rate yourself and write reflections', icon: ClipboardCheck },
  { label: 'Manager Review', description: 'Your manager evaluates your performance', icon: BarChart3 },
  { label: 'HR Review', description: 'HR finalizes ratings and provides feedback', icon: TrendingUp },
];

export default function PerformanceHelpPage(): ReactNode {
  return (
    <div className="space-y-8">
      {/* Page Title */}
      <div>
        <h2 className="text-xl font-semibold text-foreground">OKRs & KPIs</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Everything you need to know about tracking objectives, KPIs, and review cycles.
        </p>
      </div>

      {/* Quick Overview */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4 flex items-start gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 shrink-0">
              <Target className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="font-medium text-sm">OKRs</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Set objectives and track key results with auto-calculated progress
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-start gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 shrink-0">
              <TrendingUp className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="font-medium text-sm">KPIs</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Track key metrics with targets, actuals, scores, and trends
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-start gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 shrink-0">
              <ClipboardCheck className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="font-medium text-sm">Reviews</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Self-assessments followed by manager and HR evaluations
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Review Flow */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">How the Review Process Works</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            {reviewFlow.map((step, index) => {
              return (
                <div key={step.label} className="flex items-center gap-3 flex-1">
                  <div className="flex items-center gap-3 flex-1">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 shrink-0">
                      <span className="text-xs font-bold text-primary">{index + 1}</span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{step.label}</p>
                      <p className="text-xs text-muted-foreground">{step.description}</p>
                    </div>
                  </div>
                  {index < reviewFlow.length - 1 && (
                    <ChevronRight className="h-4 w-4 text-muted-foreground hidden sm:block shrink-0" />
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Ratings Reference */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Performance Ratings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2">
            {[
              { rating: 'Exceptional', description: 'Consistently exceeds expectations', variant: 'success' as const },
              { rating: 'Exceeds Expectations', description: 'Frequently surpasses goals', variant: 'success' as const },
              { rating: 'Meets Expectations', description: 'Achieves all required objectives', variant: 'pending' as const },
              { rating: 'Needs Improvement', description: 'Falls short on some objectives', variant: 'secondary' as const },
              { rating: 'Unsatisfactory', description: 'Does not meet minimum requirements', variant: 'error' as const },
            ].map((item) => (
              <div key={item.rating} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div className="flex items-center gap-3">
                  <Badge variant={item.variant}>{item.rating}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">{item.description}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* FAQ */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Frequently Asked Questions</h3>
        <div className="space-y-3">
          {faqs.map((faq) => (
            <Card key={faq.question}>
              <CardContent className="p-4">
                <p className="font-medium text-sm text-foreground">{faq.question}</p>
                <p className="text-sm text-muted-foreground mt-1.5">{faq.answer}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
