import { fireEvent, render, screen, within } from '@testing-library/react';
import type { ComponentProps } from 'react';
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

  it('shows recent exercises on the library home without changing their canonical add behavior', () => {
    const onAdd = vi.fn(async () => true);
    render(picker({ onAdd }));

    expect(screen.getByRole('heading', { name: 'Recent' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Add Barbell Bench Press' }));
    expect(onAdd).toHaveBeenCalledWith('bench-bb');
  });
});
