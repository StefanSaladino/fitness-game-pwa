import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import type { OnboardingProfile } from '../../src/features/onboarding';
import { ActiveWorkoutScreen } from '../../src/features/workout/components/WorkoutSessionScreen';
import type { ActiveWorkoutSession, ExercisePickerItem, WorkoutExercise, WorkoutSet } from '../../src/features/workout/model';
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
  supersetGroupId: null, supersetOrder: null,
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
  completed: false,
  completedAt: null,
  revision: 0,
};

const supersetGroupId = '76666666-6666-4666-8666-666666666666';

const pyramidExercise: WorkoutExercise = {
  id: '77777777-7777-4777-8777-777777777777',
  workoutId: workout.id,
  exerciseId: '78888888-8888-4888-8888-888888888888',
  orderIndex: 0,
  supersetGroupId,
  supersetOrder: 0,
  revision: 0,
  canonicalName: 'Incline Dumbbell Bench Press With Controlled Tempo',
  measurementType: 'WEIGHT_REPS',
};

const flyExercise: WorkoutExercise = {
  id: '79999999-9999-4999-8999-999999999999',
  workoutId: workout.id,
  exerciseId: '7aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  orderIndex: 1,
  supersetGroupId,
  supersetOrder: 1,
  revision: 0,
  canonicalName: 'Standing Cable Fly',
  measurementType: 'WEIGHT_REPS',
};

const pyramidSet: WorkoutSet = {
  id: '7bbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  workoutExerciseId: pyramidExercise.id,
  setNumber: 1,
  setType: 'WORKING',
  weightKg: 32,
  reps: 8,
  bodyweightMode: null,
  completed: false,
  completedAt: null,
  revision: 0,
  setVariant: 'FULL_PYRAMID',
  segments: [
    {
      id: '7ccccccc-cccc-4ccc-8ccc-ccccccccccc1',
      workoutSetId: '7bbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      segmentIndex: 0,
      weightKg: 24,
      reps: 12,
    },
    {
      id: '7ccccccc-cccc-4ccc-8ccc-ccccccccccc2',
      workoutSetId: '7bbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      segmentIndex: 1,
      weightKg: 28,
      reps: 10,
    },
    {
      id: '7ccccccc-cccc-4ccc-8ccc-ccccccccccc3',
      workoutSetId: '7bbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      segmentIndex: 2,
      weightKg: 32,
      reps: 8,
    },
  ],
};

const flySet: WorkoutSet = {
  id: '7ddddddd-dddd-4ddd-8ddd-dddddddddddd',
  workoutExerciseId: flyExercise.id,
  setNumber: 1,
  setType: 'WORKING',
  weightKg: 18,
  reps: 12,
  bodyweightMode: null,
  completed: false,
  completedAt: null,
  revision: 0,
};


const pickerCatalog: ExercisePickerItem[] = [
  {
    id: '7eeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
    canonicalName: 'Single Arm Incline Cable Chest Press With Controlled Eccentric Tempo',
    measurementType: 'WEIGHT_REPS',
    primaryMuscleGroup: 'CHEST',
    workoutType: 'CABLE',
    aliases: ['Controlled cable press'],
    lastUsedAt: '2026-09-08T18:00:00.000Z',
  },
  {
    id: '7fffffff-ffff-4fff-8fff-ffffffffffff',
    canonicalName: 'Romanian Deadlift',
    measurementType: 'WEIGHT_REPS',
    primaryMuscleGroup: 'HAMSTRINGS',
    workoutType: 'BARBELL',
    aliases: ['RDL'],
    lastUsedAt: null,
  },
  {
    id: '70000000-0000-4000-8000-000000000001',
    canonicalName: 'Standing Cable Lateral Raise',
    measurementType: 'WEIGHT_REPS',
    primaryMuscleGroup: 'SHOULDERS',
    workoutType: 'CABLE',
    aliases: [],
    lastUsedAt: null,
  },
];

function Harness() {
  const requestedState = new URLSearchParams(window.location.search).get('state');
  const [conflictResolved, setConflictResolved] = useState(false);
  const conflict = requestedState === 'conflict' && !conflictResolved;
  const offline = requestedState === 'offline';
  const advancedSuperset = requestedState === 'advanced-superset';
  const activeExercises = advancedSuperset
    ? [pyramidExercise, flyExercise]
    : [exercise];
  const activeSets = advancedSuperset
    ? [pyramidSet, flySet]
    : [set];

  return (
    <ActiveWorkoutScreen
      busyAction={null}
      compositionBusyAction={null}
      compositionError=""
      error=""
      exerciseCatalog={pickerCatalog}
      exercisePickerError=""
      exercisePickerStatus="ready"
      exerciseStatus="ready"
      analyticsTrackingStatus="ready"
      analyticsTrackingBusyExerciseId={null}
      analyticsTrackingError=""
      trackedExerciseIds={[]}
      onSetExerciseAnalyticsTracked={async () => true}
      exercises={activeExercises}
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
      onSaveSuperset={async () => true}
      onClearSuperset={async () => true}
      onRemoveSet={async () => true}
      onResume={async () => undefined}
      onRetryExercisePicker={async () => pickerCatalog}
      onRetryExercises={async () => activeExercises}
      onRetryMutationQueue={async () => undefined}
      onRetrySets={async () => activeSets}
      onAddAdvancedSet={async () => true}
      onSaveAdvancedSet={async () => true}
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
      workoutSets={activeSets}
    />
  );
}

createRoot(document.getElementById('root')!).render(<Harness />);
