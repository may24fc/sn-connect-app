import { AttachmentDeleteButton } from '@/components/attachments/AttachmentDeleteButton';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

describe('AttachmentDeleteButton', () => {
  it('asks for confirmation before deleting, and cancel does nothing', () => {
    const onConfirm = vi.fn();
    render(
      <AttachmentDeleteButton itemKind="image" itemName="receipt.png" onConfirm={onConfirm} />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Delete image receipt.png' }));
    expect(screen.getByText('Delete image?')).toBeInTheDocument();
    expect(onConfirm).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('does not trigger a click on the surrounding row or thumbnail', () => {
    const onRowClick = vi.fn();
    render(
      // biome-ignore lint/a11y/useKeyWithClickEvents: test harness for event propagation only
      <div onClick={onRowClick}>
        <AttachmentDeleteButton itemName="notes.pdf" onConfirm={vi.fn()} />
      </div>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Delete attachment notes.pdf' }));
    expect(onRowClick).not.toHaveBeenCalled();
  });

  it('keeps the dialog open while a server-confirmed delete is pending, then closes', async () => {
    let finish: () => void = () => undefined;
    const onConfirm = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        })
    );
    render(<AttachmentDeleteButton itemName="photo.jpg" onConfirm={onConfirm} />);

    fireEvent.click(screen.getByRole('button', { name: 'Delete attachment photo.jpg' }));
    fireEvent.click(screen.getByRole('button', { name: 'Delete attachment' }));

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(await screen.findByRole('button', { name: 'Working...' })).toBeDisabled();

    finish();
    await waitFor(() => expect(screen.queryByText('Delete attachment?')).not.toBeInTheDocument());
  });

  it('closes even when the delete fails, leaving the error to the caller', async () => {
    const onConfirm = vi.fn(() => Promise.reject(new Error('nope')));
    render(<AttachmentDeleteButton itemName="photo.jpg" onConfirm={onConfirm} />);

    fireEvent.click(screen.getByRole('button', { name: 'Delete attachment photo.jpg' }));
    fireEvent.click(screen.getByRole('button', { name: 'Delete attachment' }));

    await waitFor(() => expect(screen.queryByText('Delete attachment?')).not.toBeInTheDocument());
  });
});
