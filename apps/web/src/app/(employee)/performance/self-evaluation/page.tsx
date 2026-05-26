import { MonthlySelfEvaluationForm } from '@/components/performance/MonthlySelfEvaluationForm';
import { QuarterlyTemperatureCheckForm } from '@/components/performance/QuarterlyTemperatureCheckForm';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@hr-portal/ui';
import type { ReactNode } from 'react';

export default function MonthlySelfEvaluationPage(): ReactNode {
  return (
    <div className="space-y-6">
      <Tabs defaultValue="monthly" className="space-y-6">
        <div className="mx-auto max-w-3xl space-y-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">Self-Evaluation</h1>
            <p className="text-sm text-muted-foreground">
              Use the monthly reflection for regular check-ins and the quarterly temperature check
              for broader feedback on workload, support, and overall experience.
            </p>
          </div>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="monthly">Monthly Self-Evaluation</TabsTrigger>
            <TabsTrigger value="quarterly">Quarterly Temperature Check</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="monthly" className="space-y-4">
          <MonthlySelfEvaluationForm />
        </TabsContent>

        <TabsContent value="quarterly" className="space-y-4">
          <QuarterlyTemperatureCheckForm />
        </TabsContent>
      </Tabs>
    </div>
  );
}