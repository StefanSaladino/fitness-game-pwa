import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState, type ComponentProps } from 'react';
import { describe, expect, it, vi } from 'vitest';
import type { WorkoutExercise, WorkoutSet, WorkoutSetInput } from '../model';
import { WorkoutSetList } from './WorkoutSetList';

const weightedExercise: WorkoutExercise = {
  id: 'we-1', workoutId: 'workout-1', exerciseId: 'exercise-1', orderIndex: 0,
  supersetGroupId: null, supersetOrder: null,
  revision: 0,
  canonicalName: 'Barbell Bench Press', measurementType: 'WEIGHT_REPS',
};

const bodyweightExercise: WorkoutExercise = {
  id: 'we-2', workoutId: 'workout-1', exerciseId: 'exercise-2', orderIndex: 1,
  supersetGroupId: null, supersetOrder: null,
  revision: 0,
  canonicalName: 'Pull Up', measurementType: 'BODYWEIGHT_REPS',
};

const sets: WorkoutSet[] = [
  { id: 'set-1', workoutExerciseId: 'we-1', setNumber: 1, setType: 'WARMUP', weightKg: 60, reps: 10, bodyweightMode: null, completed: false, completedAt: null, revision: 0 },
  { id: 'set-2', workoutExerciseId: 'we-1', setNumber: 2, setType: 'WORKING', weightKg: 100, reps: 5, bodyweightMode: null, completed: false, completedAt: null, revision: 0 },
];

function props(overrides: Partial<ComponentProps<typeof WorkoutSetList>> = {}): ComponentProps<typeof WorkoutSetList> {
  return {
    exercise: weightedExercise,
    sets,
    status: 'ready',
    busy: null,
    unit: 'KG',
    onAddSet: vi.fn(async () => true),
    onAddAdvancedSet: vi.fn(async () => true),
    onSaveAdvancedSet: vi.fn(async () => true),
    onCopySet: vi.fn(async () => true),
    onSaveSet: vi.fn(async () => true),
    onRemoveSet: vi.fn(async () => true),
    ...overrides,
  };
}

describe('WorkoutSetList', () => {
  it('keeps each set weight and reps independent', async () => {
    const onSaveSet = vi.fn(async (_id: string, _input: WorkoutSetInput) => true);
    render(<WorkoutSetList {...props({ onSaveSet })} />);

    fireEvent.change(screen.getByLabelText('Set 1 weight in kg'), { target: { value: '65' } });
    fireEvent.change(screen.getByLabelText('Set 1 reps'), { target: { value: '8' } });
    fireEvent.blur(screen.getByLabelText('Set 1 reps'));

    fireEvent.change(screen.getByLabelText('Set 2 weight in kg'), { target: { value: '105' } });
    fireEvent.change(screen.getByLabelText('Set 2 reps'), { target: { value: '4' } });
    fireEvent.blur(screen.getByLabelText('Set 2 reps'));

    await waitFor(() => expect(onSaveSet).toHaveBeenCalledTimes(2));
    expect(onSaveSet).toHaveBeenNthCalledWith(1, 'set-1', expect.objectContaining({ weightKg: 65, reps: 8 }));
    expect(onSaveSet).toHaveBeenNthCalledWith(2, 'set-2', expect.objectContaining({ weightKg: 105, reps: 4 }));
  });

  it('completes a set with the current draft values rather than stale persisted values', async () => {
    const onSaveSet = vi.fn(async (_id: string, _input: WorkoutSetInput) => true);
    render(<WorkoutSetList {...props({ onSaveSet })} />);

    fireEvent.change(screen.getByLabelText('Set 2 weight in kg'), { target: { value: '102.5' } });
    fireEvent.change(screen.getByLabelText('Set 2 reps'), { target: { value: '6' } });
    fireEvent.click(screen.getByRole('button', { name: 'Mark set 2 complete' }));

    await waitFor(() => expect(onSaveSet).toHaveBeenCalled());
    expect(onSaveSet).toHaveBeenLastCalledWith('set-2', expect.objectContaining({ weightKg: 102.5, reps: 6, completed: true }));
    const collapsed = await screen.findByRole('button', { name: 'Expand set 2' });
    expect(collapsed).toHaveTextContent('Set 2:');
    expect(within(collapsed).getByText('6 reps • 102.5 kg')).toBeInTheDocument();
  });

  it('collapses a completed weighted set into a compact reps and weight summary and lets it reopen for editing', () => {
    const completedSet: WorkoutSet = {
      ...sets[1],
      completed: true,
      completedAt: '2026-09-04T20:00:00.000Z',
      reps: 6,
      weightKg: 102.5,
    };
    render(<WorkoutSetList {...props({ sets: [completedSet] })} />);

    const expand = screen.getByRole('button', { name: 'Expand set 2' });
    expect(expand).toHaveTextContent('Set 2:');
    expect(expand).toHaveTextContent('6 reps • 102.5 kg');
    expect(screen.queryByLabelText('Set 2 weight in kg')).not.toBeInTheDocument();

    fireEvent.click(expand);
    expect(screen.getByLabelText('Set 2 weight in kg')).toHaveValue(102.5);
    expect(screen.getByLabelText('Set 2 reps')).toHaveValue(6);
    const done = screen.getByRole('button', { name: 'Reopen set 2' });
    const collapse = screen.getByRole('button', { name: 'Collapse set 2' });
    expect(collapse).toHaveAttribute('aria-expanded', 'true');
    expect(done.compareDocumentPosition(collapse) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('summarizes completed bodyweight sets without inventing a load', () => {
    const completedBodyweightSet: WorkoutSet = {
      id: 'set-bw-complete', workoutExerciseId: 'we-2', setNumber: 1, setType: 'WORKING',
      weightKg: null, reps: 8, bodyweightMode: 'BODYWEIGHT', completed: true,
      completedAt: '2026-09-04T20:00:00.000Z', revision: 0,
    };
    render(<WorkoutSetList {...props({ exercise: bodyweightExercise, sets: [completedBodyweightSet] })} />);

    const expand = screen.getByRole('button', { name: 'Expand set 1' });
    expect(expand).toHaveTextContent('Set 1:');
    expect(within(expand).getByText('8 reps • Bodyweight')).toBeInTheDocument();
  });

  it('adds a fresh set or copies the last set into a new independent row', () => {
    const onAddSet = vi.fn(async () => true);
    const onCopySet = vi.fn(async () => true);
    render(<WorkoutSetList {...props({ onAddSet, onCopySet })} />);

    fireEvent.click(screen.getByRole('button', { name: '+ Working set' }));
    fireEvent.click(screen.getByRole('button', { name: 'Copy last set' }));

    expect(onAddSet).toHaveBeenCalledWith('we-1', 'WORKING');
    expect(onCopySet).toHaveBeenCalledWith('set-2');
  });

  it('creates one logical advanced set for Drop and both Pyramid variants', async () => {
    const user = userEvent.setup();
    const onAddAdvancedSet = vi.fn(async () => true);
    render(<WorkoutSetList {...props({ onAddAdvancedSet })} />);

    await user.click(screen.getByRole('button', { name: '+ Drop set' }));
    await user.click(screen.getByRole('button', { name: '+ Ascending pyramid' }));
    await user.click(screen.getByRole('button', { name: '+ Full pyramid' }));

    expect(onAddAdvancedSet).toHaveBeenNthCalledWith(1, 'we-1', 'DROP');
    expect(onAddAdvancedSet).toHaveBeenNthCalledWith(2, 'we-1', 'ASCENDING_PYRAMID');
    expect(onAddAdvancedSet).toHaveBeenNthCalledWith(3, 'we-1', 'FULL_PYRAMID');
  });

  it('lets an incomplete standard set collapse and expand again', async () => {
    const user = userEvent.setup();
    render(<WorkoutSetList {...props({ sets: [sets[1]] })} />);

    await user.click(screen.getByRole('button', { name: 'Collapse set 2' }));
    expect(screen.getByRole('button', { name: 'Expand set 2' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Expand set 2' }));
    expect(screen.getByRole('button', { name: 'Collapse set 2' })).toBeInTheDocument();
  });

  it('edits multiple load and rep stages inside one logical Drop Set', async () => {
    const onSaveAdvancedSet = vi.fn(async () => true);
    const dropSet: WorkoutSet = {
      ...sets[1],
      setType: 'DROP',
      setVariant: 'DROP',
      segments: [
        { id: 'segment-1', workoutSetId: 'set-2', segmentIndex: 0, weightKg: 100, reps: 8 },
        { id: 'segment-2', workoutSetId: 'set-2', segmentIndex: 1, weightKg: 80, reps: 10 },
      ],
    };
    render(<WorkoutSetList {...props({ sets: [dropSet], onSaveAdvancedSet })} />);

    const stages = screen.getByRole('list', { name: 'Set 2 stages' });
    expect(within(stages).getAllByText('Weight (kg)')).toHaveLength(2);
    expect(within(stages).getAllByText('Reps')).toHaveLength(2);
    expect(screen.getByLabelText('Set 2 stage 1 weight in kg')).toHaveValue(100);
    expect(screen.getByLabelText('Set 2 stage 2 weight in kg')).toHaveValue(80);

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Collapse set 2' }));
    expect(screen.getByRole('button', { name: 'Expand set 2' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Expand set 2' }));

    fireEvent.change(screen.getByLabelText('Set 2 stage 2 weight in kg'), { target: { value: '75' } });
    fireEvent.change(screen.getByLabelText('Set 2 stage 2 reps'), { target: { value: '12' } });
    fireEvent.blur(screen.getByLabelText('Set 2 stage 2 reps'));

    await waitFor(() => expect(onSaveAdvancedSet).toHaveBeenCalledWith('set-2', expect.objectContaining({
      variant: 'DROP',
      segments: [
        expect.objectContaining({ weightKg: 100, reps: 8 }),
        expect.objectContaining({ weightKg: 75, reps: 12 }),
      ],
    })));
  });

  it('persists plain, added-weight, and assisted bodyweight modes separately', async () => {
    const user = userEvent.setup();
    const onSaveSet = vi.fn(async (_id: string, _input: WorkoutSetInput) => true);
    const bodyweightSet: WorkoutSet = {
      id: 'set-bw', workoutExerciseId: 'we-2', setNumber: 1, setType: 'WORKING',
      weightKg: null, reps: 8, bodyweightMode: 'BODYWEIGHT', completed: false, completedAt: null, revision: 0,
    };
    render(<WorkoutSetList {...props({ exercise: bodyweightExercise, sets: [bodyweightSet], onSaveSet })} />);

    expect(screen.queryByLabelText('Set 1 load in kg')).not.toBeInTheDocument();
    await user.click(screen.getByRole('combobox', { name: 'Set 1 bodyweight mode' }));
    await user.click(screen.getByRole('option', { name: 'Added weight' }));

    expect(await screen.findByLabelText('Set 1 load in kg')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Set 1 load in kg'), { target: { value: '20' } });
    fireEvent.blur(screen.getByLabelText('Set 1 load in kg'));

    await waitFor(() => expect(onSaveSet).toHaveBeenCalledWith('set-bw', expect.objectContaining({ bodyweightMode: 'ADDED_WEIGHT', weightKg: 20 })));
  });

  it('converts display pounds back to canonical kilograms before saving', async () => {
    const onSaveSet = vi.fn(async (_id: string, _input: WorkoutSetInput) => true);
    render(<WorkoutSetList {...props({ unit: 'LB', onSaveSet })} />);

    fireEvent.change(screen.getByLabelText('Set 2 weight in lb'), { target: { value: '220.46' } });
    fireEvent.blur(screen.getByLabelText('Set 2 weight in lb'));

    await waitFor(() => expect(onSaveSet).toHaveBeenCalled());
    const lastCall = onSaveSet.mock.calls.at(-1);
    expect(lastCall?.[0]).toBe('set-2');
    expect(lastCall?.[1].weightKg).toBeCloseTo(100, 2);
  });

  it('hydrates an unsaved recovery draft instead of overwriting it with the last server value', () => {
    render(<WorkoutSetList {...props({
      unit: 'LB',
      recoveryDrafts: {
        'set-2': { setType: 'WORKING', weight: '225', reps: '6', bodyweightMode: 'BODYWEIGHT' },
      },
    })} />);

    expect(screen.getByLabelText('Set 2 weight in lb')).toHaveValue(225);
    expect(screen.getByLabelText('Set 2 reps')).toHaveValue(6);
  });

  it('keeps existing set fields and queued completion editable while structural offline actions remain gated', async () => {
    const onSaveSet = vi.fn(async (_id: string, _input: WorkoutSetInput) => true);
    const onDraftChange = vi.fn();
    render(<WorkoutSetList {...props({ serverMutationsEnabled: false, setEditsEnabled: true, onSaveSet, onDraftChange })} />);

    fireEvent.change(screen.getByLabelText('Set 2 weight in kg'), { target: { value: '107.5' } });
    fireEvent.change(screen.getByLabelText('Set 2 reps'), { target: { value: '3' } });
    fireEvent.blur(screen.getByLabelText('Set 2 reps'));

    expect(onDraftChange).toHaveBeenLastCalledWith('set-2', expect.objectContaining({ weight: '107.5', reps: '3' }));
    await waitFor(() => expect(onSaveSet).toHaveBeenCalledWith('set-2', expect.objectContaining({ weightKg: 107.5, reps: 3 })));

    expect(screen.getByRole('button', { name: 'Mark set 2 complete' })).toBeEnabled();
    fireEvent.click(screen.getByRole('button', { name: 'Mark set 2 complete' }));
    await waitFor(() => expect(onSaveSet).toHaveBeenCalledWith('set-2', expect.objectContaining({ completed: true, weightKg: 107.5, reps: 3 })));

    expect(screen.getByRole('button', { name: 'Copy last set' })).toBeDisabled();
  });

  it('freezes set fields while recovery is still reconciling', () => {
    render(<WorkoutSetList {...props({ serverMutationsEnabled: false, setEditsEnabled: false })} />);

    expect(screen.getByLabelText('Set 2 weight in kg')).toBeDisabled();
    expect(screen.getByLabelText('Set 2 reps')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Mark set 2 complete' })).toBeDisabled();
  });

  it('notifies recovery state outside the child state updater', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    function Harness() {
      const [, setLatestDraft] = useState('');
      return (
        <WorkoutSetList
          {...props({
            onDraftChange: (_setId, draft) => setLatestDraft(`${draft.weight}:${draft.reps}`),
          })}
        />
      );
    }

    render(<Harness />);
    fireEvent.change(screen.getByLabelText('Set 2 weight in kg'), { target: { value: '107.5' } });

    expect(
      consoleError.mock.calls.some(([message]) => String(message).includes('Cannot update a component')),
    ).toBe(false);
    consoleError.mockRestore();
  });
});
