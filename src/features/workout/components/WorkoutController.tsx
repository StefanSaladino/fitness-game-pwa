import { AppShell, type AppSection } from '../../../components/layout';
import { Button } from '../../../components/ui';
import type { OnboardingProfile } from '../../onboarding';
import type { WorkoutService } from '../workoutService';
import { useActiveWorkout } from '../hooks/useActiveWorkout';
import { ActiveWorkoutScreen, WorkoutStartScreen } from './WorkoutSessionScreen';
import styles from './WorkoutSessionScreen.module.css';

interface WorkoutControllerProps {
  profile: OnboardingProfile;
  onNavigate: (section: AppSection) => void;
  onSignOut: () => void;
  service?: WorkoutService;
}

export function WorkoutController({ profile, onNavigate, onSignOut, service }: WorkoutControllerProps) {
  const workout = useActiveWorkout(profile.id, service);

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
      error={workout.error}
      onCancel={async () => { const id = await workout.cancel(); if (id) onNavigate('home'); return id; }}
      onFinish={async () => { const id = await workout.finish(); if (id) onNavigate('home'); return id; }}
      onNavigate={onNavigate}
      onPause={workout.pause}
      onResume={workout.resume}
      onSignOut={onSignOut}
      profile={profile}
      workout={workout.activeWorkout}
    />
  );
}
