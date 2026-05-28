import { FivePercentReflectionForm } from '@/components/performance/FivePercentReflectionForm';
import { MonthlySelfEvaluationForm } from '@/components/performance/MonthlySelfEvaluationForm';
import { QuarterlyTemperatureCheckForm } from '@/components/performance/QuarterlyTemperatureCheckForm';
import { Button, Tabs, TabsContent, TabsList, TabsTrigger } from '@hr-portal/ui';
import { ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';

type SelfEvaluationWorkspaceProps = {
  defaultTab?: 'monthly' | 'five-percent' | 'quarterly';
  backHref?: string;
  backLabel?: string;
};

export function SelfEvaluationWorkspace({
  defaultTab = 'monthly',
  backHref,
  backLabel = 'Back',
}: SelfEvaluationWorkspaceProps): ReactNode {
  return (
    <div className="space-y-6">
      <Tabs defaultValue={defaultTab} className="space-y-6">
        <div className="mx-auto max-w-3xl space-y-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
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
            {backHref ? (
              <Button asChild variant="outline" size="sm">
                <Link href={backHref}>
                  <ChevronLeft className="mr-1 h-4 w-4" />
                  {backLabel}
                </Link>
              </Button>
            ) : null}
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