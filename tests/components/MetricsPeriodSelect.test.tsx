import { MetricsPeriodSelect } from '@/components/data-display/MetricsPeriodSelect';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

describe('MetricsPeriodSelect', () => {
  it('labels the controlled period and shows its selected value', () => {
    render(
      <MetricsPeriodSelect
        id="test-metrics-period"
        value="month"
        onValueChange={vi.fn()}
        options={[
          { value: 'week', label: 'This week' },
          { value: 'month', label: 'This month' },
        ]}
      />
    );

    expect(screen.getByRole('combobox', { name: 'Metrics period' }).textContent).toContain(
      'This month'
    );
  });
});
