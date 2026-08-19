import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Button } from './Button';

 describe('Button', () => {
  it('renders its variant and forwards click behavior', async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick} variant="secondary">Continue</Button>);

    const button = screen.getByRole('button', { name: 'Continue' });
    expect(button).toHaveClass('ui-button--secondary');

    await userEvent.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
