import { DateRangeFilter } from '@/components/data-display/DateRangeFilter';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/components/forms/DatePickerField', () => ({
  DatePickerField: ({
    id,
    value,
    onChange,
    minDate,
    maxDate,
  }: {
    id: string;
    value: string;
    onChange: (value: string) => void;
    minDate?: string;
    maxDate?: string;
  }) => (
    <input
      id={id}
      type="date"
      value={value}
      min={minDate}
      max={maxDate}
      onChange={(event) => onChange(event.target.value)}
    />
  ),
}));

describe('DateRangeFilter', () => {
  it('keeps draft dates local until a complete changed range is applied', () => {
    const onApply = vi.fn();
    render(
      <DateRangeFilter
        idPrefix="period"
        value={{ from: '2026-10-01', to: '2026-10-15' }}
        onApply={onApply}
        maxDate="2026-10-15"
      />
    );

    const startDate = screen.getByLabelText('Start date');
    const endDate = screen.getByLabelText('End date');
    const apply = screen.getByRole('button', { name: 'Apply date range' });

    expect(apply).toBeDisabled();
    expect(startDate).toHaveAttribute('max', '2026-10-15');
    expect(endDate).toHaveAttribute('min', '2026-10-01');

    fireEvent.change(startDate, { target: { value: '2026-10-05' } });
    expect(onApply).not.toHaveBeenCalled();
    expect(apply).toBeEnabled();

    fireEvent.click(apply);
    expect(onApply).toHaveBeenCalledWith({ from: '2026-10-05', to: '2026-10-15' });
  });

  it('clears both the draft and applied range together', () => {
    const onApply = vi.fn();
    render(
      <DateRangeFilter
        idPrefix="period"
        value={{ from: '2026-10-01', to: '2026-10-15' }}
        onApply={onApply}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Clear' }));

    expect(screen.getByLabelText('Start date')).toHaveValue('');
    expect(screen.getByLabelText('End date')).toHaveValue('');
    expect(onApply).toHaveBeenCalledWith({ from: '', to: '' });
  });
});
