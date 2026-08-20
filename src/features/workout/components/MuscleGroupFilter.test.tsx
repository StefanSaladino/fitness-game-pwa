import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MuscleGroupSelector } from './MuscleGroupFilter';

describe('MuscleGroupSelector', () => {
  it('uses visible icon-and-label buttons as navigation rather than pressed-state filters', () => {
    const onSelect = vi.fn();
    render(<MuscleGroupSelector onSelect={onSelect} />);

    const chest = screen.getByRole('button', { name: 'Open Chest exercises' });
    expect(chest.querySelector('img')).not.toBeNull();
    expect(chest).not.toHaveAttribute('aria-pressed');

    fireEvent.click(chest);
    expect(onSelect).toHaveBeenCalledWith('CHEST');
  });

  it('includes core, obliques, forearms/grip, lower body, neck, and full-body destinations', () => {
    render(<MuscleGroupSelector onSelect={() => undefined} />);
    for (const label of ['Core / abs', 'Obliques', 'Forearms / grip', 'Quads', 'Hamstrings', 'Glutes', 'Calves', 'Neck', 'Full body']) {
      expect(screen.getByRole('button', { name: `Open ${label} exercises` })).toBeInTheDocument();
    }
  });
});
