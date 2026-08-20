import { AppShell, type AppSection } from '../../../components/layout';
import { Button } from '../../../components/ui';
import type { OnboardingProfile } from '../../onboarding';
import type { WorkoutExerciseService } from '../workoutExerciseService';
import type { ExercisePickerService } from '../exercisePickerService';
import type { WorkoutService } from '../workoutService';
import type { WorkoutSetService } from '../workoutSetService';
import { useActiveWorkout } from '../hooks/useActiveWorkout';
import { useWorkoutExercises } from '../hooks/useWorkoutExercises';
import { useWorkoutSets } from '../hooks/useWorkoutSets';
import { useExercisePickerCatalog } from '../hooks/useExercisePickerCatalog';
import { ActiveWorkoutScreen, WorkoutStartScreen } from './WorkoutSessionScreen';
import styles from './WorkoutSessionScreen.module.css';

interface WorkoutControllerProps {
  profile: OnboardingProfile;
  onNavigate: (section: AppSection) => void;
  onSignOut: () => void;
  service?: WorkoutService;
  exerciseService?: WorkoutExerciseService;
  pickerService?: ExercisePickerService;
  setService?: WorkoutSetService;
}

export function WorkoutController({ profile, onNavigate, onSignOut, service, exerciseService, pickerService, setService }: WorkoutControllerProps) {
  const workout = useActiveWorkout(profile.id, service);
  const composition = useWorkoutExercises(workout.activeWorkout?.id ?? null, exerciseService);
  const picker = useExercisePickerCatalog(Boolean(workout.activeWorkout), pickerService);
  const sets = useWorkoutSets(composition.exercises.map((exercise) => exercise.id), setService);

  if (workout.status === 'loading') {
    return (
      <AppShell activeItem="workouts" onNavigate={onNavigate} onSignOut={onSignOut} userLabel={profile.displayName} userMeta={`@${profile.username}`}>
        <div className={styles.start} role="status">Recovering active workout…</div>
      </AppShell>
    );
  }

  if (workout.status === 'error') {
    return (
      <AppShell activeItem="workouts" onNavigate={onNavigate} onSignOut={onSignOut} userLabel={profile.displayName} userMeta={`@${profile.username}`}>
        <section className={styles.start}>
          <p className={styles.error}>{workout.error}</p>
          <Button onClick={() => void workout.retry()}>Try again</Button>
        </section>
      </AppShell>
    );
  }

  if (!workout.activeWorkout) {
    return <WorkoutStartScreen busyAction={workout.busyAction} error={workout.error} onNavigate={onNavigate} onSignOut={onSignOut} onStart={workout.start} profile={profile} />;
  }

  return (
    <ActiveWorkoutScreen
      busyAction={workout.busyAction}
      compositionBusyAction={composition.busyAction}
      compositionError={composition.error}
      exerciseCatalog={picker.catalog}
      exercisePickerError={picker.error}
      exercisePickerStatus={picker.status}
      exerciseStatus={composition.status}
      exercises={composition.exercises}
      error={workout.error}
      onCancel={async () => { const id = await workout.cancel(); if (id) onNavigate('home'); return id; }}
      onFinish={async () => { const id = await workout.finish(); if (id) onNavigate('home'); return id; }}
      onAddExercise={composition.addExercise}
      onMoveExercise={composition.moveExercise}
      onNavigate={onNavigate}
      onPause={workout.pause}
      onRemoveExercise={composition.removeExercise}
      onResume={workout.resume}
      onRetryExercisePicker={picker.retry}
      onRetryExercises={composition.retry}
      workoutSets={sets.sets}
      setStatus={sets.status}
      setBusy={sets.busy}
      setError={sets.error}
      onRetrySets={sets.retry}
      onAddSet={sets.addSet}
      onCopySet={sets.copySet}
      onSaveSet={sets.saveSet}
      onRemoveSet={sets.removeSet}
      onSignOut={onSignOut}
      profile={profile}
      workout={workout.activeWorkout}
    />
  );
}
