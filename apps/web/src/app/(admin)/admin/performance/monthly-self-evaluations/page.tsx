import { FivePercentReflectionAdminReview } from '@/components/performance/FivePercentReflectionAdminReview';
import { MonthlySelfEvaluationAdminReview } from '@/components/performance/MonthlySelfEvaluationAdminReview';
import { QuarterlyTemperatureCheckAdminReview } from '@/components/performance/QuarterlyTemperatureCheckAdminReview';
import { Button, Tabs, TabsContent, TabsList, TabsTrigger } from '@hr-portal/ui';
import { ClipboardCheck } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';

type MonthlySelfEvaluationsAdminPageProps = {
  searchParams?: Promise<{ tab?: string }>;
};

export default async function MonthlySelfEvaluationsAdminPage({
  searchParams,
}: MonthlySelfEvaluationsAdminPageProps): Promise<ReactNode> {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const defaultTab =
    resolvedSearchParams?.tab === 'quarterly'
      ? 'quarterly'
      : resolvedSearchParams?.tab === 'five-percent'
        ? 'five-percent'
        : 'monthly';

  return (
    <Tabs defaultValue={defaultTab} className="space-y-6">
      <div className="space-y-3">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              Self-Evaluation Reviews
            </h1>
            <p className="text-sm text-muted-foreground">
              Review monthly self-evaluations, 5% reflections, and quarterly temperature checks from
              one leadership workspace.
            </p>
          </div>
          <Button asChild>
            <Link href="/admin/performance/self-evaluation">
              <ClipboardCheck className="mr-2 h-4 w-4" />
              Write My Evaluation
            </Link>
          </Button>
        </div>
        <TabsList className="grid w-full max-w-2xl grid-cols-3">
          <TabsTrigger value="monthly">Monthly</TabsTrigger>
          <TabsTrigger value="five-percent">5% Reflection</TabsTrigger>
          <TabsTrigger value="quarterly">Quarterly</TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="monthly" className="space-y-4">
        <MonthlySelfEvaluationAdminReview />
      </TabsContent>

      <TabsContent value="five-percent" className="space-y-4">
        <FivePercentReflectionAdminReview />
      </TabsContent>

      <TabsContent value="quarterly" className="space-y-4">
        <QuarterlyTemperatureCheckAdminReview />
      </TabsContent>
    </Tabs>
  );
}
