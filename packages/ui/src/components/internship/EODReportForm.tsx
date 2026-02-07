'use client';

import * as React from 'react';
import { Calendar, Clock, BookOpen, AlertCircle, Send } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '../../primitives/card';
import { Button } from '../../primitives/button';
import { Input } from '../../primitives/input';
import { Textarea } from '../../primitives/textarea';
import { Label } from '../../primitives/label';
import { cn } from '../../utils/cn';
import type { EODReportFormData } from '../../types/internship.types';

interface EODReportFormProps {
  onSubmit: (data: EODReportFormData) => void | Promise<void>;
  isSubmitting?: boolean;
  defaultDate?: string;
  maxHoursPerDay?: number;
  className?: string;
}

export function EODReportForm({
  onSubmit,
  isSubmitting = false,
  defaultDate,
  maxHoursPerDay = 12,
  className,
}: EODReportFormProps): React.ReactNode {
  const initialDate = defaultDate ?? new Date().toISOString().split('T')[0]!;
  const [formData, setFormData] = React.useState<EODReportFormData>({
    date: initialDate,
    tasksCompleted: '',
    hoursLogged: 8,
    learnings: '',
    challenges: '',
  });

  const [errors, setErrors] = React.useState<Partial<Record<keyof EODReportFormData, string>>>({});

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof EODReportFormData, string>> = {};

    if (!formData.date) {
      newErrors.date = 'Date is required';
    }

    if (!formData.tasksCompleted.trim()) {
      newErrors.tasksCompleted = 'Please describe the tasks you completed';
    } else if (formData.tasksCompleted.length < 20) {
      newErrors.tasksCompleted = 'Please provide more detail (at least 20 characters)';
    }

    if (formData.hoursLogged <= 0) {
      newErrors.hoursLogged = 'Hours must be greater than 0';
    } else if (formData.hoursLogged > maxHoursPerDay) {
      newErrors.hoursLogged = `Maximum ${maxHoursPerDay} hours per day`;
    }

    if (!formData.learnings.trim()) {
      newErrors.learnings = 'Please share what you learned today';
    } else if (formData.learnings.length < 10) {
      newErrors.learnings = 'Please provide more detail (at least 10 characters)';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (validateForm()) {
      await onSubmit(formData);
    }
  };

  const handleChange = (
    field: keyof EODReportFormData,
    value: string | number
  ): void => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  return (
    <Card className={cn('w-full', className)}>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Send className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle>End of Day Report</CardTitle>
            <CardDescription>
              Submit your daily progress report
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-6">
          {/* Date and Hours Row */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="date" className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                Date
              </Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) => handleChange('date', e.target.value)}
                max={new Date().toISOString().split('T')[0]}
                className={errors.date ? 'border-error' : ''}
              />
              {errors.date && (
                <p className="text-xs text-error">{errors.date}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="hours" className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                Hours Logged
              </Label>
              <Input
                id="hours"
                type="number"
                min="0.5"
                max={maxHoursPerDay}
                step="0.5"
                value={formData.hoursLogged}
                onChange={(e) => handleChange('hoursLogged', parseFloat(e.target.value) || 0)}
                className={errors.hoursLogged ? 'border-error' : ''}
              />
              {errors.hoursLogged && (
                <p className="text-xs text-error">{errors.hoursLogged}</p>
              )}
            </div>
          </div>

          {/* Tasks Completed */}
          <div className="space-y-2">
            <Label htmlFor="tasks" className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-muted-foreground" />
              Tasks Completed *
            </Label>
            <Textarea
              id="tasks"
              placeholder="Describe the tasks you worked on today. Be specific about what you accomplished..."
              value={formData.tasksCompleted}
              onChange={(e) => handleChange('tasksCompleted', e.target.value)}
              className={cn('min-h-[100px]', errors.tasksCompleted ? 'border-error' : '')}
            />
            {errors.tasksCompleted && (
              <p className="text-xs text-error">{errors.tasksCompleted}</p>
            )}
          </div>

          {/* Key Learnings */}
          <div className="space-y-2">
            <Label htmlFor="learnings" className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-muted-foreground" />
              Key Learnings *
            </Label>
            <Textarea
              id="learnings"
              placeholder="What did you learn today? What new skills or knowledge did you gain?"
              value={formData.learnings}
              onChange={(e) => handleChange('learnings', e.target.value)}
              className={cn('min-h-[80px]', errors.learnings ? 'border-error' : '')}
            />
            {errors.learnings && (
              <p className="text-xs text-error">{errors.learnings}</p>
            )}
          </div>

          {/* Challenges (Optional) */}
          <div className="space-y-2">
            <Label htmlFor="challenges" className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
              Challenges Faced (Optional)
            </Label>
            <Textarea
              id="challenges"
              placeholder="Did you face any challenges or blockers today? How did you address them?"
              value={formData.challenges || ''}
              onChange={(e) => handleChange('challenges', e.target.value)}
              className="min-h-[80px]"
            />
          </div>
        </CardContent>

        <CardFooter className="flex justify-end gap-3 border-t border-border pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setFormData({
                date: initialDate,
                tasksCompleted: '',
                hoursLogged: 8,
                learnings: '',
                challenges: '',
              });
              setErrors({});
            }}
          >
            Clear
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Clock className="mr-2 h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Submit Report
              </>
            )}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
