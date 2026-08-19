import { useEffect, useState, type ReactNode } from 'react';
import { AppShell, type AppSection } from '../../../components/layout';
import { Button } from '../../../components/ui';
import type { OnboardingProfile } from '../../onboarding';
import type { ActiveWorkoutSession, WorkoutLifecycleAction } from '../model';
import { elapsedWorkoutSeconds, formatWorkoutDuration } from '../workoutTime';
import styles from './WorkoutSessionScreen.module.css';

interface SharedProps {
  profile: OnboardingProfile;
  onNavigate: (section: AppSection) => void;
  onSignOut: () => void;
  error: string;
  busyAction: WorkoutLifecycleAction;
}

interface StartProps extends SharedProps {
  onStart: () => Promise<unknown>;
}

interface ActiveProps extends SharedProps {
  workout: ActiveWorkoutSession;
  onPause: () => Promise<unknown>;
  onResume: () => Promise<unknown>;
  onFinish: () => Promise<unknown>;
  onCancel: () => Promise<unknown>;
}

function WorkoutShell({ profile, onNavigate, onSignOut, children }: SharedProps & { children: ReactNode }) {
  return (
    <AppShell activeItem="workouts" onNavigate={onNavigate} onSignOut={onSignOut} userLabel={profile.displayName} userMeta={`@${profile.username}`}>
      {children}
    </AppShell>
  );
}

function useWorkoutClock(workout: ActiveWorkoutSession): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (workout.pausedAt) return undefined;
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [workout.id, workout.pausedAt, workout.lastResumedAt]);
  return elapsedWorkoutSeconds(workout, now);
}

export function WorkoutStartScreen(props: StartProps) {
  return (
    <WorkoutShell {...props}>
      <main className={styles.start}>
        <p className={styles.kicker}>WORKOUT</p>
        <h1>Start a lift</h1>
        <p>Start the session now. If a workout is already active on your account, this resumes it instead of creating a duplicate.</p>
        {props.error && <p className={styles.error} role="alert">{props.error}</p>}
        <Button disabled={props.busyAction !== null} onClick={() => void props.onStart()}>
          {props.busyAction === 'start' ? 'Starting…' : 'Start Lift'}
        </Button>
      </main>
    </WorkoutShell>
  );
}

export function ActiveWorkoutScreen(props: ActiveProps) {
  const seconds = useWorkoutClock(props.workout);
  const isPaused = props.workout.pausedAt !== null;
  const busy = props.busyAction !== null;

  return (
    <WorkoutShell {...props}>
      <main className={styles.active}>
        <header className={styles.activeHeader}>
          <div>
            <p className={styles.kicker}>ACTIVE LIFT</p>
            <h1>{isPaused ? 'Workout paused' : 'Workout in progress'}</h1>
          </div>
          <time className={styles.timer} dateTime={`PT${seconds}S`}>{formatWorkoutDuration(seconds)}</time>
        </header>

        <section className={styles.sessionMeta} aria-label="Workout session state">
          <div><span>Started</span><strong>{new Intl.DateTimeFormat('en-CA', { hour: 'numeric', minute: '2-digit' }).format(new Date(props.workout.startedAt))}</strong></div>
          <div><span>Scoring date</span><strong>{props.workout.scoringDate}</strong></div>
          <div><span>Timer</span><strong>{isPaused ? 'Paused' : 'Running'}</strong></div>
        </section>

        <section className={styles.exerciseStage}>
          <p className={styles.kicker}>EXERCISES</p>
          <h2>No exercises yet</h2>
          <p>Your exercise list is empty. The workout timer and session state stay saved while you train.</p>
        </section>

        {props.error && <p className={styles.error} role="alert">{props.error}</p>}

        <div className={styles.primaryActions}>
          {isPaused ? (
            <Button disabled={busy} onClick={() => void props.onResume()}>{props.busyAction === 'resume' ? 'Resuming…' : 'Resume timer'}</Button>
          ) : (
            <Button disabled={busy} onClick={() => void props.onPause()} variant="secondary">{props.busyAction === 'pause' ? 'Pausing…' : 'Pause timer'}</Button>
          )}
          <Button disabled={busy} onClick={() => void props.onFinish()}>{props.busyAction === 'finish' ? 'Finishing…' : 'Finish workout'}</Button>
        </div>

        <button className={styles.cancelButton} disabled={busy} onClick={() => void props.onCancel()} type="button">
          {props.busyAction === 'cancel' ? 'Cancelling…' : 'Cancel workout'}
        </button>
      </main>
    </WorkoutShell>
  );
}
