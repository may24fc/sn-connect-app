import { FivePercentReflectionForm } from '@/components/performance/FivePercentReflectionForm';
import { MonthlySelfEvaluationForm } from '@/components/performance/MonthlySelfEvaluationForm';
import { QuarterlyTemperatureCheckForm } from '@/components/performance/QuarterlyTemperatureCheckForm';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@hr-portal/ui';
import type { ReactNode } from 'react';

type SelfEvaluationPageProps = {
  searchParams?: Promise<{ tab?: string }>;
};

export default async function MonthlySelfEvaluationPage({
  searchParams,
}: SelfEvaluationPageProps): Promise<ReactNode> {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const defaultTab =
    resolvedSearchParams?.tab === 'quarterly'
      ? 'quarterly'
      : resolvedSearchParams?.tab === 'five-percent'
        ? 'five-percent'
        : 'monthly';

  return (
    <div className="space-y-6">
      <Tabs defaultValue={defaultTab} className="space-y-6">
        <div className="mx-auto max-w-3xl space-y-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              Self-Evaluation
            </h1>
            <p className="text-sm text-muted-foreground">
              Use the monthly reflection for regular check-ins, the 5% reflection for
              work-family-personal reflection, and the quarterly temperature check for broader
              feedback on workload, support, and overall experience.
            </p>
          </div>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="monthly">Monthly Self-Evaluation</TabsTrigger>
            <TabsTrigger value="five-percent">5% Reflection</TabsTrigger>
            <TabsTrigger value="quarterly">Quarterly Temperature Check</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="monthly" className="space-y-4">
          <MonthlySelfEvaluationForm />
        </TabsContent>

        <TabsContent value="five-percent" className="space-y-4">
          <FivePercentReflectionForm />
        </TabsContent>

        <TabsContent value="quarterly" className="space-y-4">
          <QuarterlyTemperatureCheckForm />
        </TabsContent>
      </Tabs>
    </div>
  );
}
