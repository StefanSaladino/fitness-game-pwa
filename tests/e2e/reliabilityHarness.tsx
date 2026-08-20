import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import type { OnboardingProfile } from '../../src/features/onboarding';
import { ActiveWorkoutScreen } from '../../src/features/workout/components/WorkoutSessionScreen';
import type { ActiveWorkoutSession, WorkoutExercise, WorkoutSet } from '../../src/features/workout/model';
import '../../src/styles/global.css';

const profile: OnboardingProfile = {
  id: '71111111-1111-4111-8111-111111111111',
  username: 'stefan',
  displayName: 'Stefan',
  timezone: 'America/Toronto',
  weeklyWorkoutTarget: 4,
  pendingWeeklyWorkoutTarget: null,
  onboardingCompletedAt: '2026-08-20T20:00:00Z',
  profileCode: 'FG-7111111111',
};

const workout: ActiveWorkoutSession = {
  id: '72222222-2222-4222-8222-222222222222',
  userId: profile.id,
  status: 'IN_PROGRESS',
  startedAt: '2026-08-20T20:00:00Z',
  endedAt: null,
  activeDurationSeconds: 720,
  timezoneAtStart: profile.timezone,
  scoringDate: '2026-08-20',
  pausedAt: null,
  lastResumedAt: '2026-08-20T20:00:00Z',
};

const exercise: WorkoutExercise = {
  id: '73333333-3333-4333-8333-333333333333',
  workoutId: workout.id,
  exerciseId: '74444444-4444-4444-8444-444444444444',
  orderIndex: 0,
  revision: 0,
  canonicalName: 'Barbell Bench Press',
  measurementType: 'WEIGHT_REPS',
};

const set: WorkoutSet = {
  id: '75555555-5555-4555-8555-555555555555',
  workoutExerciseId: exercise.id,
  setNumber: 1,
  setType: 'WORKING',
  weightKg: 100,
  reps: 5,
  bodyweightMode: null,
  completed: true,
  completedAt: '2026-08-20T20:10:00Z',
  revision: 0,
};

function Harness() {
  const requestedState = new URLSearchParams(window.location.search).get('state');
  const [conflictResolved, setConflictResolved] = useState(false);
  const conflict = requestedState === 'conflict' && !conflictResolved;
  const offline = requestedState === 'offline';

  return (
    <ActiveWorkoutScreen
      busyAction={null}
      compositionBusyAction={null}
      compositionError=""
      error=""
      exerciseCatalog={[]}
      exercisePickerError=""
      exercisePickerStatus="ready"
      exerciseStatus="ready"
      exercises={[exercise]}
      initialWeightUnit="KG"
      mutationQueueError={conflict ? 'This set changed on another device.' : ''}
      mutationQueuePendingCount={conflict || offline ? 1 : 0}
      mutationQueueStatus={conflict ? 'conflict' : 'idle'}
      onAddExercise={async () => true}
      onAddSet={async () => true}
      onCancel={async () => undefined}
      onCopySet={async () => true}
      onDiscardMutationConflict={async () => { setConflictResolved(true); }}
      onFinish={async () => undefined}
      onMoveExercise={async () => true}
      onNavigate={() => undefined}
      onPause={async () => undefined}
      onRemoveExercise={async () => true}
      onRemoveSet={async () => true}
      onResume={async () => undefined}
      onRetryExercisePicker={async () => []}
      onRetryExercises={async () => [exercise]}
      onRetryMutationQueue={async () => undefined}
      onRetrySets={async () => [set]}
      onSaveSet={async () => true}
      onSetDraftChange={() => undefined}
      onSetDraftPersisted={() => undefined}
      onSignOut={() => undefined}
      onWeightUnitChange={() => undefined}
      profile={profile}
      recoveryDrafts={offline ? {
        [set.id]: { setType: 'WORKING', weight: '107.5', reps: '5', bodyweightMode: 'BODYWEIGHT' },
      } : undefined}
      recoveryState={offline ? 'offline' : 'synced'}
      setBusy={null}
      setError=""
      setStatus="ready"
      workout={workout}
      workoutSets={[set]}
    />
  );
}

createRoot(document.getElementById('root')!).render(<Harness />);
