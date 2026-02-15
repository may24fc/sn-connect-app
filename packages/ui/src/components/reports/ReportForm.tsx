'use client';

import { Save, Send, Upload, X } from 'lucide-react';
import * as React from 'react';
import { Button } from '../../primitives/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../primitives/card';
import { Input } from '../../primitives/input';
import { Label } from '../../primitives/label';
import { Separator } from '../../primitives/separator';
import { Textarea } from '../../primitives/textarea';
import { cn } from '../../utils/cn';
import { MetricInputGroup } from './MetricInput';
import type { ReportContent, ReportMetric, WeekPeriod } from './types';

interface ReportFormProps {
  initialContent?: Partial<ReportContent>;
  weekPeriod: WeekPeriod;
  onSaveDraft: (content: ReportContent) => void;
  onSubmit: (content: ReportContent) => void;
  onCancel?: () => void;
  isSubmitting?: boolean;
  className?: string;
}

export function ReportForm({
  initialContent,
  weekPeriod,
  onSaveDraft,
  onSubmit,
  onCancel,
  isSubmitting = false,
  className,
}: ReportFormProps): React.ReactNode {
  const [summary, setSummary] = React.useState(initialContent?.summary || '');
  const [accomplishments, setAccomplishments] = React.useState<Array<string>>(
    initialContent?.accomplishments || ['']
  );
  const [challenges, setChallenges] = React.useState<Array<string>>(
    initialContent?.challenges || ['']
  );
  const [nextWeekPlans, setNextWeekPlans] = React.useState<Array<string>>(
    initialContent?.nextWeekPlans || ['']
  );
  const [notes, setNotes] = React.useState(initialContent?.notes || '');
  const [metrics, setMetrics] = React.useState<Array<ReportMetric>>(initialContent?.metrics || []);
  const [attachments, setAttachments] = React.useState<Array<File>>([]);

  const expenditures = metrics.filter((m) => m.type === 'expenditure');
  const results = metrics.filter((m) => m.type === 'result');

  const handleStringArrayChange = (
    index: number,
    value: string,
    array: Array<string>,
    setter: React.Dispatch<React.SetStateAction<Array<string>>>
  ): void => {
    const updated = [...array];
    updated[index] = value;
    setter(updated);
  };

  const handleAddStringItem = (
    array: Array<string>,
    setter: React.Dispatch<React.SetStateAction<Array<string>>>
  ): void => {
    setter([...array, '']);
  };

  const handleRemoveStringItem = (
    index: number,
    array: Array<string>,
    setter: React.Dispatch<React.SetStateAction<Array<string>>>
  ): void => {
    if (array.length > 1) {
      setter(array.filter((_, i) => i !== index));
    }
  };

  const handleMetricsChange = (updatedMetrics: Array<ReportMetric>): void => {
    setMetrics(updatedMetrics);
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
    if (event.target.files) {
      setAttachments(Array.from(event.target.files));
    }
  };

  const handleRemoveFile = (index: number): void => {
    setAttachments(attachments.filter((_, i) => i !== index));
  };

  const getFormContent = (): ReportContent => {
    return {
      summary,
      accomplishments: accomplishments.filter((a) => a.trim() !== ''),
      challenges: challenges.filter((c) => c.trim() !== ''),
      nextWeekPlans: nextWeekPlans.filter((p) => p.trim() !== ''),
      metrics,
      ...(notes && { notes }),
    };
  };

  const handleSaveDraft = (): void => {
    onSaveDraft(getFormContent());
  };

  const handleSubmit = (): void => {
    onSubmit(getFormContent());
  };

  const isValid = (): boolean => {
    return (
      summary.trim() !== '' && accomplishments.some((a) => a.trim() !== '') && metrics.length > 0
    );
  };

  return (
    <div className={cn('space-y-6', className)}>
      <Card>
        <CardHeader>
          <CardTitle>Report Details</CardTitle>
          <CardDescription>Complete your weekly report for {weekPeriod.label}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Summary */}
          <div className="space-y-2">
            <Label htmlFor="summary">Summary *</Label>
            <Textarea
              id="summary"
              placeholder="Brief overview of the week's activities and outcomes..."
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              rows={4}
              required
            />
          </div>

          <Separator />

          {/* Accomplishments */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Key Accomplishments *</Label>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleAddStringItem(accomplishments, setAccomplishments)}
              >
                Add Item
              </Button>
            </div>
            {accomplishments.map((item, index) => (
              <div key={index} className="flex gap-2">
                <Input
                  placeholder={`Accomplishment ${index + 1}`}
                  value={item}
                  onChange={(e) =>
                    handleStringArrayChange(
                      index,
                      e.target.value,
                      accomplishments,
                      setAccomplishments
                    )
                  }
                  className="flex-1"
                />
                {accomplishments.length > 1 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() =>
                      handleRemoveStringItem(index, accomplishments, setAccomplishments)
                    }
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>

          <Separator />

          {/* Challenges */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Challenges Faced</Label>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleAddStringItem(challenges, setChallenges)}
              >
                Add Item
              </Button>
            </div>
            {challenges.map((item, index) => (
              <div key={index} className="flex gap-2">
                <Input
                  placeholder={`Challenge ${index + 1}`}
                  value={item}
                  onChange={(e) =>
                    handleStringArrayChange(index, e.target.value, challenges, setChallenges)
                  }
                  className="flex-1"
                />
                {challenges.length > 1 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveStringItem(index, challenges, setChallenges)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>

          <Separator />

          {/* Next Week Plans */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Next Week Plans</Label>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleAddStringItem(nextWeekPlans, setNextWeekPlans)}
              >
                Add Item
              </Button>
            </div>
            {nextWeekPlans.map((item, index) => (
              <div key={index} className="flex gap-2">
                <Input
                  placeholder={`Plan ${index + 1}`}
                  value={item}
                  onChange={(e) =>
                    handleStringArrayChange(index, e.target.value, nextWeekPlans, setNextWeekPlans)
                  }
                  className="flex-1"
                />
                {nextWeekPlans.length > 1 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveStringItem(index, nextWeekPlans, setNextWeekPlans)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Metrics Section */}
      <Card>
        <CardHeader>
          <CardTitle>Financial Metrics *</CardTitle>
          <CardDescription>
            Track expenditures and results for accurate ROI calculation
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <MetricInputGroup
            metrics={expenditures}
            onChange={(updated) => {
              const otherMetrics = metrics.filter((m) => m.type !== 'expenditure');
              handleMetricsChange([...otherMetrics, ...updated]);
            }}
            type="expenditure"
            title="Expenditures"
          />

          <Separator />

          <MetricInputGroup
            metrics={results}
            onChange={(updated) => {
              const otherMetrics = metrics.filter((m) => m.type !== 'result');
              handleMetricsChange([...otherMetrics, ...updated]);
            }}
            type="result"
            title="Results / Outcomes"
          />
        </CardContent>
      </Card>

      {/* Attachments Section */}
      <Card>
        <CardHeader>
          <CardTitle>Attachments</CardTitle>
          <CardDescription>Upload receipts, screenshots, or supporting documents</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <Input
              type="file"
              id="file-upload"
              multiple
              onChange={handleFileChange}
              className="hidden"
            />
            <Button variant="outline" size="sm" asChild>
              <label htmlFor="file-upload" className="cursor-pointer">
                <Upload className="h-4 w-4 mr-2" />
                Choose Files
              </label>
            </Button>
          </div>

          {attachments.length > 0 && (
            <div className="space-y-2">
              {attachments.map((file, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-2 bg-muted rounded-md"
                >
                  <span className="text-sm">{file.name}</span>
                  <Button variant="ghost" size="icon" onClick={() => handleRemoveFile(index)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Additional Notes */}
      <Card>
        <CardHeader>
          <CardTitle>Additional Notes</CardTitle>
          <CardDescription>Any other information or context (optional)</CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="Additional comments or notes..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
          />
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex items-center justify-between gap-4">
        {onCancel && (
          <Button variant="outline" onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </Button>
        )}
        <div className="flex gap-2 ml-auto">
          <Button variant="outline" onClick={handleSaveDraft} disabled={isSubmitting}>
            <Save className="h-4 w-4 mr-2" />
            Save Draft
          </Button>
          <Button onClick={handleSubmit} disabled={!isValid() || isSubmitting}>
            <Send className="h-4 w-4 mr-2" />
            Submit Report
          </Button>
        </div>
      </div>
    </div>
  );
}
