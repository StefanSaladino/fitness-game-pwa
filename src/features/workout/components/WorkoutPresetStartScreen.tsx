import { useEffect, useMemo, useState } from 'react';
import dumbbellBanner from '../../../assets/fitness/top-set-dumbbell-grip.jpg';
import { AppShell, DestinationBanner, type AppSection } from '../../../components/layout';
import { Button } from '../../../components/ui';
import type { OnboardingProfile } from '../../onboarding';
import { TrainingTipSurface, trainingTipForDate } from '../../training-content';
import type { ExercisePickerStatus } from '../hooks/useExercisePickerCatalog';
import type { ExercisePickerItem, WorkoutLifecycleAction } from '../model';
import { presetWorkouts, type PresetWorkoutId } from '../presetWorkouts';
import { formatWorkoutDuration } from '../workoutTime';
import styles from './WorkoutPresetStartScreen.module.css';

interface WorkoutPresetStartScreenProps {
  profile: OnboardingProfile;
  onNavigate: (section: AppSection) => void;
  onSignOut: () => void;
  busyAction: WorkoutLifecycleAction;
  error: string;
  exerciseCatalog: ExercisePickerItem[];
  exercisePickerStatus: ExercisePickerStatus;
  exercisePickerError: string;
  onRetryExercisePicker: () => Promise<ExercisePickerItem[]>;
  onStart: (actionAtMs?: number) => Promise<unknown>;
  onStartPreset: (presetId: PresetWorkoutId, actionAtMs?: number) => Promise<unknown>;
}

function useStartingClock(startingAtMs: number | null): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (startingAtMs === null) return undefined;
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(timer);
  }, [startingAtMs]);
  if (startingAtMs === null) return 0;
  return Math.max(0, Math.floor((now - startingAtMs) / 1000));
}

export function WorkoutPresetStartScreen(props: WorkoutPresetStartScreenProps) {
  const [startingAtMs, setStartingAtMs] = useState<number | null>(null);
  const [selectedPresetId, setSelectedPresetId] = useState<PresetWorkoutId | null>(null);
  const startingSeconds = useStartingClock(startingAtMs);
  const tip = useMemo(() => trainingTipForDate(new Date(), props.profile.id, 'WORKOUT'), [props.profile.id]);
  const starting = props.busyAction === 'start' || startingAtMs !== null;
  const catalogNames = useMemo(
    () => new Set(props.exerciseCatalog.map((exercise) => exercise.canonicalName.toLocaleLowerCase('en-CA'))),
    [props.exerciseCatalog],
  );

  useEffect(() => {
    if (startingAtMs !== null && props.busyAction !== 'start' && props.error) {
      setStartingAtMs(null);
      setSelectedPresetId(null);
    }
  }, [props.busyAction, props.error, startingAtMs]);

  const startEmpty = () => {
    const actionAtMs = Date.now();
    setSelectedPresetId(null);
    setStartingAtMs(actionAtMs);
    void props.onStart(actionAtMs);
  };

  const startPreset = (presetId: PresetWorkoutId) => {
    const actionAtMs = Date.now();
    setSelectedPresetId(presetId);
    setStartingAtMs(actionAtMs);
    void props.onStartPreset(presetId, actionAtMs);
  };

  return (
    <AppShell
      activeItem="workouts"
      onNavigate={props.onNavigate}
      onSignOut={props.onSignOut}
      userLabel={props.profile.displayName}
      userMeta={`@${props.profile.username}`}
    >
      <div className={styles.page} data-lift-start>
        <DestinationBanner className={styles.startSurface} imagePosition="center 54%" imageSrc={dumbbellBanner}>
          <div className={styles.startCopy}>
            <p className={styles.kicker}>LIFT</p>
            <h1>Start a lift</h1>
            <p>Start empty and build your own session, or preload a curated exercise list. Presets choose exercises only—sets, reps, weights, and substitutions stay yours.</p>
          </div>
          <div className={styles.headerActions}>
            <Button disabled={starting} fullWidth onClick={startEmpty}>
              {starting && selectedPresetId === null ? 'Starting…' : 'Start empty lift'}
            </Button>
            <Button variant="secondary" disabled={starting} fullWidth onClick={() => props.onNavigate('cardio')}>Log cardio instead</Button>
          </div>
        </DestinationBanner>

        {startingAtMs !== null && (
          <div className={styles.startingClock} role="status">
            <span>{selectedPresetId ? `Starting ${presetWorkouts.find((preset) => preset.id === selectedPresetId)?.name ?? 'preset'}` : 'Starting workout'}</span>
            <time dateTime={`PT${startingSeconds}S`}>{formatWorkoutDuration(startingSeconds)}</time>
          </div>
        )}

        {props.error && <p className={styles.error} role="alert">{props.error}</p>}

        <section className={styles.presets} aria-labelledby="preset-workouts-heading" data-app-surface="category">
          <div className={styles.sectionHeading}>
            <div>
              <p className={styles.kicker}>PRESET WORKOUTS</p>
              <h2 id="preset-workouts-heading">Pick a starting structure</h2>
            </div>
            <span>Editable after start</span>
          </div>

          {props.exercisePickerStatus === 'loading' && <p className={styles.catalogMessage} role="status">Loading preset exercises…</p>}
          {props.exercisePickerStatus === 'error' && (
            <div className={styles.catalogError}>
              <p>{props.exercisePickerError || 'Preset exercises are unavailable right now.'}</p>
              <Button variant="secondary" onClick={() => void props.onRetryExercisePicker()}>Try again</Button>
            </div>
          )}

          <ul className={styles.presetList}>
            {presetWorkouts.map((preset) => {
              const available = props.exercisePickerStatus === 'ready'
                && preset.exerciseNames.every((name) => catalogNames.has(name.toLocaleLowerCase('en-CA')));
              return (
                <li key={preset.id}>
                  <div className={styles.presetCopy}>
                    <strong>{preset.name}</strong>
                    <p>{preset.description}</p>
                    <span>{preset.exerciseNames.length} exercises · {preset.exerciseNames.join(' · ')}</span>
                    {props.exercisePickerStatus === 'ready' && !available && <em>Unavailable because one or more catalogue exercises are inactive.</em>}
                  </div>
                  <Button
                    disabled={starting || !available}
                    fullWidth
                    variant="secondary"
                    onClick={() => startPreset(preset.id)}
                  >
                    {starting && selectedPresetId === preset.id ? 'Starting…' : 'Start preset'}
                  </Button>
                </li>
              );
            })}
          </ul>
        </section>

        <section className={styles.tipRegion} data-app-surface="category">
          <TrainingTipSurface compact tip={tip} />
        </section>
      </div>
    </AppShell>
  );
}
