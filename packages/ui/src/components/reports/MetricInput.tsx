'use client';

import * as React from 'react';
import { X, Plus } from 'lucide-react';
import { Input } from '../../primitives/input';
import { Button } from '../../primitives/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../primitives/select';
import { cn } from '../../utils/cn';
import type { ReportMetric, MetricType } from './types';

interface MetricInputProps {
  metric: ReportMetric;
  onChange: (metric: ReportMetric) => void;
  onRemove: () => void;
  className?: string;
  categories?: string[];
}

export function MetricInput({
  metric,
  onChange,
  onRemove,
  className,
  categories = ['Marketing', 'Sales', 'Operations', 'HR'],
}: MetricInputProps): React.ReactNode {
  const handleFieldChange = (field: keyof ReportMetric, value: string | number): void => {
    onChange({
      ...metric,
      [field]: value,
    });
  };

  return (
    <div className={cn('flex items-start gap-2', className)}>
      <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-2">
        <Input
          placeholder="Metric name"
          value={metric.name}
          onChange={(e) => handleFieldChange('name', e.target.value)}
          className="col-span-1"
        />

        <Select
          value={metric.category}
          onValueChange={(value) => handleFieldChange('category', value)}
        >
          <SelectTrigger className="col-span-1">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            {categories.map((category) => (
              <SelectItem key={category} value={category}>
                {category}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex gap-2 col-span-1 md:col-span-2">
          <Select
            value={metric.unit}
            onValueChange={(value) => handleFieldChange('unit', value)}
          >
            <SelectTrigger className="w-[100px]">
              <SelectValue placeholder="Unit" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="PHP">PHP</SelectItem>
              <SelectItem value="USD">USD</SelectItem>
              <SelectItem value="count">Count</SelectItem>
              <SelectItem value="%">%</SelectItem>
            </SelectContent>
          </Select>

          <Input
            type="number"
            placeholder="0"
            value={metric.value || ''}
            onChange={(e) => handleFieldChange('value', parseFloat(e.target.value) || 0)}
            className="flex-1"
          />
        </div>
      </div>

      <Button
        variant="ghost"
        size="icon"
        onClick={onRemove}
        className="shrink-0 text-muted-foreground hover:text-destructive"
      >
        <X className="h-4 w-4" />
        <span className="sr-only">Remove metric</span>
      </Button>
    </div>
  );
}

interface MetricInputGroupProps {
  metrics: ReportMetric[];
  onChange: (metrics: ReportMetric[]) => void;
  type: MetricType;
  title: string;
  className?: string;
  categories?: string[];
}

export function MetricInputGroup({
  metrics,
  onChange,
  type,
  title,
  className,
  categories,
}: MetricInputGroupProps): React.ReactNode {
  const handleAddMetric = (): void => {
    const newMetric: ReportMetric = {
      id: `temp-${Date.now()}`,
      type,
      name: '',
      value: 0,
      unit: 'PHP',
      category: '',
    };
    onChange([...metrics, newMetric]);
  };

  const handleUpdateMetric = (index: number, updatedMetric: ReportMetric): void => {
    const updated = [...metrics];
    updated[index] = updatedMetric;
    onChange(updated);
  };

  const handleRemoveMetric = (index: number): void => {
    onChange(metrics.filter((_, i) => i !== index));
  };

  const total = metrics.reduce((sum, m) => sum + (m.value || 0), 0);

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex items-center justify-between">
        <h3 className="font-medium">{title}</h3>
        <Button variant="outline" size="sm" onClick={handleAddMetric}>
          <Plus className="h-4 w-4 mr-1" />
          Add
        </Button>
      </div>

      <div className="space-y-2">
        {metrics.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4 border-2 border-dashed rounded-lg">
            No {title.toLowerCase()} added yet. Click "Add" to create one.
          </p>
        ) : (
          metrics.map((metric, index) => (
            <MetricInput
              key={metric.id}
              metric={metric}
              onChange={(updated) => handleUpdateMetric(index, updated)}
              onRemove={() => handleRemoveMetric(index)}
              {...(categories && { categories })}
            />
          ))
        )}
      </div>

      {metrics.length > 0 && (
        <div className="flex justify-end pt-2 border-t">
          <span className="font-semibold">
            Total: PHP {total.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
          </span>
        </div>
      )}
    </div>
  );
}
