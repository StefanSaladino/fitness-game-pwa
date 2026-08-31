import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { badgePresentationDefinition } from '../badgeCatalog';
import { BadgeCoin } from './BadgeCoin';

describe('BadgeCoin', () => {
  const firstPr = badgePresentationDefinition('FIRST_PR');

  it('renders the shared emblem contract and locked achievement copy', () => {
    render(<BadgeCoin definition={firstPr} />);
    const badge = screen.getByRole('button', { name: /First PR badge, locked/i });
    expect(badge).toHaveAttribute('data-badge-emblem', 'top-set');
    expect(badge).toHaveAttribute('data-badge-state', 'locked');
    expect(screen.getAllByText(/Improved a personal record for the first time/i).length).toBeGreaterThan(0);
  });

  it('rotates a half turn on pointer click', () => {
    render(<BadgeCoin definition={firstPr} />);
    const badge = screen.getByRole('button', { name: /First PR badge/i });

    fireEvent.click(badge);
    expect(badge).toHaveAttribute('data-rotation', '180');
    expect(badge).toHaveAttribute('aria-pressed', 'true');
  });

  it('uses native button keyboard activation for Enter and Space without double rotation', async () => {
    const user = userEvent.setup();
    render(<BadgeCoin definition={firstPr} />);
    const badge = screen.getByRole('button', { name: /First PR badge/i });

    badge.focus();
    await user.keyboard('{Enter}');
    expect(badge).toHaveAttribute('data-rotation', '180');
    expect(badge).toHaveAttribute('aria-pressed', 'true');

    await user.keyboard(' ');
    expect(badge).toHaveAttribute('data-rotation', '360');
    expect(badge).toHaveAttribute('aria-pressed', 'false');
  });

  it('supports horizontal pointer rotation and snaps to a readable face', () => {
    render(<BadgeCoin definition={firstPr} />);
    const badge = screen.getByRole('button', { name: /First PR badge/i });

    fireEvent.pointerDown(badge, { button: 0, clientX: 20, pointerId: 7 });
    fireEvent.pointerMove(badge, { clientX: 280, pointerId: 7 });
    fireEvent.pointerUp(badge, { clientX: 280, pointerId: 7 });

    expect(badge).toHaveAttribute('data-rotation', '180');
    expect(badge).toHaveAttribute('aria-pressed', 'true');
  });

  it('announces earned state and earned date without changing the definition', () => {
    render(<BadgeCoin definition={firstPr} earnedAt="2026-08-30T12:00:00.000Z" />);
    const badge = screen.getByRole('button', { name: /First PR badge, earned/i });
    expect(badge).toHaveAttribute('data-badge-state', 'earned');
    expect(screen.getAllByText(/Earned Aug 30, 2026/i).length).toBeGreaterThan(0);
  });
});
