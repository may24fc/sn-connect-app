import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ChatInterface } from './ChatInterface';

describe('ChatInterface', () => {
  beforeEach(() => {
    Element.prototype.scrollIntoView = vi.fn();
  });

  it('hides the textarea character counter in the simulator input', () => {
    render(<ChatInterface debugMode={false} />);

    expect(screen.getByPlaceholderText('Ask the HR Agent a question...')).toBeTruthy();
    expect(screen.queryByText(/0\/3000/i)).toBeNull();
  });
});
