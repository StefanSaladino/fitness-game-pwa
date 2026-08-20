import { fireEvent, render, screen } from '@testing-library/react';
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
  it('searches shorthand aliases and adds the canonical exercise', () => {
    const onAdd = vi.fn(async () => true);
    render(picker({ onAdd }));
    fireEvent.change(screen.getByLabelText('Search exercises'), { target: { value: 'rdl' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add Romanian Deadlift' }));
    expect(onAdd).toHaveBeenCalledWith('rdl');
  });

  it('can browse by workout type and filter to dumbbell chest exercises', () => {
    render(picker());
    fireEvent.click(screen.getByRole('button', { name: 'Workout types' }));
    fireEvent.change(screen.getByLabelText('Muscle group'), { target: { value: 'CHEST' } });
    fireEvent.change(screen.getByLabelText('Workout type'), { target: { value: 'DUMBBELL' } });
    expect(screen.getByRole('heading', { name: 'Dumbbell' })).toBeInTheDocument();
    expect(screen.getByText('Dumbbell Bench Press')).toBeInTheDocument();
    expect(screen.queryByText('Barbell Bench Press')).not.toBeInTheDocument();
  });

  it('marks exercises already in the active workout instead of offering a duplicate add', () => {
    render(picker({ selectedExerciseIds: ['bench-bb'] }));
    expect(screen.getByRole('button', { name: 'Barbell Bench Press already added' })).toBeDisabled();
  });
});
