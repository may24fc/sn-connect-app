import { FinanceDetailDisclosure } from '@/components/finance/FinanceDetailDisclosure';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

describe('Finance detailed view disclosure', () => {
  it('does not mount a legacy data view until it is opened', () => {
    const mount = vi.fn();
    function LegacyView() {
      mount();
      return <p>Detailed ledger</p>;
    }
    render(
      <FinanceDetailDisclosure title="Open detailed ledger">
        <LegacyView />
      </FinanceDetailDisclosure>
    );
    expect(mount).not.toHaveBeenCalled();
    const details = screen.getByText('Open detailed ledger').closest('details')!;
    details.open = true;
    fireEvent(details, new Event('toggle'));
    expect(screen.getByText('Detailed ledger')).toBeInTheDocument();
    expect(mount).toHaveBeenCalledOnce();
  });
});
