import { FivePercentReflectionAdminReview } from '@/components/performance/FivePercentReflectionAdminReview';
import { MonthlySelfEvaluationAdminReview } from '@/components/performance/MonthlySelfEvaluationAdminReview';
import { QuarterlyTemperatureCheckAdminReview } from '@/components/performance/QuarterlyTemperatureCheckAdminReview';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@hr-portal/ui';
import type { ReactNode } from 'react';

export default function MonthlySelfEvaluationsAdminPage(): ReactNode {
  return (
    <Tabs defaultValue="monthly" className="space-y-6">
      <div className="space-y-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Self-Evaluation Reviews
          </h1>
          <p className="text-sm text-muted-foreground">
            Review monthly self-evaluations, 5% reflections, and quarterly temperature checks from
            one leadership workspace.
          </p>
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
