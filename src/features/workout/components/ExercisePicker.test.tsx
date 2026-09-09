import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { useState, type ComponentProps } from 'react';
import { describe, expect, it, vi } from 'vitest';
import type { ExercisePickerItem } from '../model';
import { ExercisePicker } from './ExercisePicker';

const catalog: ExercisePickerItem[] = [
  { id: 'bench-bb', canonicalName: 'Barbell Bench Press', measurementType: 'WEIGHT_REPS', primaryMuscleGroup: 'CHEST', workoutType: 'BARBELL', aliases: ['Bench Press'], lastUsedAt: '2026-08-18T12:00:00.000Z' },
  { id: 'bench-db', canonicalName: 'Dumbbell Bench Press', measurementType: 'WEIGHT_REPS', primaryMuscleGroup: 'CHEST', workoutType: 'DUMBBELL', aliases: ['DB Bench'], lastUsedAt: null },
  { id: 'rdl', canonicalName: 'Romanian Deadlift', measurementType: 'WEIGHT_REPS', primaryMuscleGroup: 'HAMSTRINGS', workoutType: 'BARBELL', aliases: ['RDL'], lastUsedAt: null },
  { id: 'box', canonicalName: 'Box Jump', measurementType: 'OTHER', primaryMuscleGroup: 'QUADS', workoutType: 'PLYOMETRIC', aliases: [], lastUsedAt: null },
];

function picker(overrides: Partial<ComponentProps<typeof ExercisePicker>> = {}) {
  return <ExercisePicker catalog={catalog} error="" isAdding={false} onAdd={vi.fn(async () => true)} onClose={vi.fn()} onRetry={vi.fn(async () => catalog)} open selectedExerciseIds={[]} status="ready" {...overrides} />;
}

describe('ExercisePicker', () => {
  it('opens a dedicated muscle-group screen and filters that group by workout type', () => {
    render(picker());

    fireEvent.click(screen.getByRole('button', { name: 'Open Chest exercises' }));
    expect(screen.getByRole('heading', { name: 'Chest exercises' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Back to exercise library' })).toBeInTheDocument();

    const typeFilter = screen.getByRole('group', { name: 'Filter by workout type' });
    fireEvent.click(within(typeFilter).getByRole('button', { name: 'Dumbbell' }));
    expect(screen.getByText('Dumbbell Bench Press')).toBeInTheDocument();
    expect(screen.queryByText('Barbell Bench Press')).not.toBeInTheDocument();
    expect(screen.queryByText('Romanian Deadlift')).not.toBeInTheDocument();
  });

  it('uses the back arrow to return from a muscle-group screen to the top-level selector', () => {
    render(picker());
    fireEvent.click(screen.getByRole('button', { name: 'Open Quads exercises' }));
    fireEvent.click(screen.getByRole('button', { name: 'Back to exercise library' }));

    expect(screen.getByRole('heading', { name: 'Add exercise' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Open Chest exercises' })).toBeInTheDocument();
  });

  it('keeps a separate Search all exercises path with alias search and matching result icon', () => {
    const onAdd = vi.fn(async () => true);
    render(picker({ onAdd }));

    fireEvent.click(screen.getByRole('button', { name: 'Search all exercises' }));
    expect(screen.getByRole('heading', { name: 'All exercises' })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Search all exercises'), { target: { value: 'rdl' } });
    const rdlRow = screen.getByText('Romanian Deadlift').closest('li');
    expect(rdlRow?.querySelector('img')).not.toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Add Romanian Deadlift' }));
    expect(onAdd).toHaveBeenCalledWith('rdl');
  });

  it('uses icon-and-label muscle navigation while keeping workout type filtering on detail screens', () => {
    render(picker());
    expect(screen.getByRole('button', { name: 'Open Chest exercises' }).querySelector('img')).not.toBeNull();
    expect(screen.getByRole('button', { name: 'Open Obliques exercises' })).toBeInTheDocument();
    expect(screen.queryByRole('group', { name: 'Filter by workout type' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Open Chest exercises' }));
    expect(screen.getByRole('group', { name: 'Filter by workout type' })).toBeInTheDocument();
  });

  it('marks exercises already in the active workout instead of offering a duplicate add', () => {
    render(picker({ selectedExerciseIds: ['bench-bb'] }));
    fireEvent.click(screen.getByRole('button', { name: 'Search all exercises' }));
    const added = screen.getByRole('button', { name: 'Barbell Bench Press already added' });
    expect(added).toBeDisabled();
    expect(added).toHaveTextContent('Added');
  });

  it('places Recent below the body-part selector, collapsed by default, without changing canonical add behavior', () => {
    const onAdd = vi.fn(async () => true);
    render(picker({ onAdd }));

    const chest = screen.getByRole('button', { name: 'Open Chest exercises' });
    const recentHeading = screen.getByRole('heading', { name: 'Recent' });
    const recentToggle = screen.getByRole('button', { name: 'Show 1' });

    expect(chest.compareDocumentPosition(recentHeading) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(recentToggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('button', { name: 'Add Barbell Bench Press' })).not.toBeInTheDocument();

    fireEvent.click(recentToggle);
    expect(screen.getByRole('button', { name: 'Hide' })).toHaveAttribute('aria-expanded', 'true');
    fireEvent.click(screen.getByRole('button', { name: 'Add Barbell Bench Press' }));
    expect(onAdd).toHaveBeenCalledWith('bench-bb');

    fireEvent.click(screen.getByRole('button', { name: 'Hide' }));
    expect(screen.queryByRole('button', { name: 'Add Barbell Bench Press' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Open Chest exercises' })).toBeInTheDocument();
  });

  it('uses Escape as in-app back before closing the picker', () => {
    const onClose = vi.fn();
    render(picker({ onClose }));

    fireEvent.click(screen.getByRole('button', { name: 'Open Chest exercises' }));
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.getByRole('heading', { name: 'Add exercise' })).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('focuses the picker chrome and restores focus to the opener after close', async () => {
    function Harness() {
      const [open, setOpen] = useState(false);
      return (
        <>
          <button onClick={() => setOpen(true)} type="button">Open picker</button>
          <ExercisePicker
            catalog={catalog}
            error=""
            isAdding={false}
            onAdd={vi.fn(async () => true)}
            onClose={() => setOpen(false)}
            onRetry={vi.fn(async () => catalog)}
            open={open}
            selectedExerciseIds={[]}
            status="ready"
          />
        </>
      );
    }

    render(<Harness />);
    const opener = screen.getByRole('button', { name: 'Open picker' });
    opener.focus();
    fireEvent.click(opener);

    const close = screen.getByRole('button', { name: 'Close exercise picker' });
    await waitFor(() => expect(close).toHaveFocus());
    fireEvent.click(close);
    await waitFor(() => expect(opener).toHaveFocus());
  });
});
