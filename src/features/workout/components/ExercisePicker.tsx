import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import { SelectField } from '../../../components/ui';
import {
  filterAndRankExercises,
  groupExercises,
  MUSCLE_GROUP_LABELS,
  recentExercises,
  WORKOUT_TYPE_LABELS,
  WORKOUT_TYPE_ORDER,
} from '../exerciseSearch';
import type { ExerciseMuscleGroup, ExercisePickerItem, ExerciseWorkoutType } from '../model';
import type { ExercisePickerStatus } from '../hooks/useExercisePickerCatalog';
import { MuscleGroupSelector } from './MuscleGroupFilter';
import styles from './ExercisePicker.module.css';

interface ExercisePickerProps {
  open: boolean;
  status: ExercisePickerStatus;
  catalog: ExercisePickerItem[];
  selectedExerciseIds: string[];
  isAdding: boolean;
  error: string;
  onAdd: (exerciseId: string) => Promise<boolean>;
  onClose: () => void;
  onRetry: () => Promise<ExercisePickerItem[]>;
}

type PickerView = 'home' | 'all' | 'muscle';

function ExerciseRow({ exercise, added, disabled, onAdd }: {
  exercise: ExercisePickerItem;
  added: boolean;
  disabled: boolean;
  onAdd: (exerciseId: string) => Promise<boolean>;
}) {
  return (
    <li className={styles.resultRow}>
      <div>
        <strong>{exercise.canonicalName}</strong>
        <span>{MUSCLE_GROUP_LABELS[exercise.primaryMuscleGroup]} · {WORKOUT_TYPE_LABELS[exercise.workoutType]}</span>
      </div>
      <button
        aria-label={added ? `${exercise.canonicalName} already added` : `Add ${exercise.canonicalName}`}
        disabled={added || disabled}
        onClick={() => void onAdd(exercise.id)}
        type="button"
      >
        {added ? 'Added' : 'Add'}
      </button>
    </li>
  );
}

function PickerHeader({ title, eyebrow, canGoBack, onBack, onClose }: {
  title: string;
  eyebrow: string;
  canGoBack: boolean;
  onBack: () => void;
  onClose: () => void;
}) {
  return (
    <header className={styles.header}>
      <div className={styles.headerIdentity}>
        {canGoBack && (
          <button aria-label="Back to exercise library" className={styles.back} onClick={onBack} type="button">
            <span aria-hidden="true">←</span>
          </button>
        )}
        <div>
          <p>{eyebrow}</p>
          <h2 id="exercise-picker-title">{title}</h2>
        </div>
      </div>
      <button aria-label="Close exercise picker" className={styles.close} onClick={onClose} type="button">Close</button>
    </header>
  );
}

function ExerciseResults({ items, selected, isAdding, onAdd, emptyMessage }: {
  items: ExercisePickerItem[];
  selected: Set<string>;
  isAdding: boolean;
  onAdd: (exerciseId: string) => Promise<boolean>;
  emptyMessage: string;
}) {
  if (items.length === 0) return <p className={styles.message}>{emptyMessage}</p>;
  return (
    <ul className={styles.flatResults}>
      {items.map((exercise) => (
        <ExerciseRow
          added={selected.has(exercise.id)}
          disabled={isAdding}
          exercise={exercise}
          key={exercise.id}
          onAdd={onAdd}
        />
      ))}
    </ul>
  );
}

export function ExercisePicker(props: ExercisePickerProps) {
  const closeRef = useRef(props.onClose);
  closeRef.current = props.onClose;
  const [view, setView] = useState<PickerView>('home');
  const [query, setQuery] = useState('');
  const [muscleGroup, setMuscleGroup] = useState<ExerciseMuscleGroup | null>(null);
  const [workoutType, setWorkoutType] = useState<ExerciseWorkoutType | ''>('');

  const selected = useMemo(() => new Set(props.selectedExerciseIds), [props.selectedExerciseIds]);
  const recents = useMemo(() => recentExercises(props.catalog), [props.catalog]);
  const filtered = useMemo(
    () => filterAndRankExercises(props.catalog, {
      query,
      muscleGroup: view === 'muscle' ? muscleGroup ?? '' : '',
      workoutType,
    }),
    [props.catalog, query, muscleGroup, workoutType, view],
  );
  const allGroups = useMemo(() => groupExercises(filtered, 'muscle'), [filtered]);

  const goHome = () => {
    setView('home');
    setMuscleGroup(null);
    setWorkoutType('');
    setQuery('');
  };

  const openAll = () => {
    setView('all');
    setMuscleGroup(null);
    setWorkoutType('');
    setQuery('');
  };

  const openMuscle = (group: ExerciseMuscleGroup) => {
    setView('muscle');
    setMuscleGroup(group);
    setWorkoutType('');
    setQuery('');
  };

  useEffect(() => {
    if (!props.open) {
      goHome();
      return undefined;
    }
    const previousOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (view === 'home') closeRef.current();
      else goHome();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.documentElement.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [props.open, view]);

  if (!props.open) return null;

  const title = view === 'muscle' && muscleGroup
    ? `${MUSCLE_GROUP_LABELS[muscleGroup]} exercises`
    : view === 'all'
      ? 'All exercises'
      : 'Add exercise';

  return (
    <div className={styles.backdrop}>
      <section aria-labelledby="exercise-picker-title" aria-modal="true" className={styles.picker} role="dialog">
        <PickerHeader
          canGoBack={view !== 'home'}
          eyebrow={view === 'home' ? 'EXERCISE LIBRARY' : 'BROWSE EXERCISES'}
          onBack={goHome}
          onClose={props.onClose}
          title={title}
        />

        {props.status === 'loading' && <p className={styles.messageStandalone} role="status">Loading exercise library…</p>}
        {props.status === 'error' && (
          <div className={styles.errorStandalone}>
            <p role="alert">{props.error || 'Unable to load the exercise library.'}</p>
            <button onClick={() => void props.onRetry()} type="button">Try again</button>
          </div>
        )}

        {props.status === 'ready' && view === 'home' && (
          <div className={styles.home}>
            <button aria-label="Search all exercises" className={styles.searchAllButton} onClick={openAll} type="button">
              <span>
                <strong>Search all exercises</strong>
                <small>Search the full canonical exercise library.</small>
              </span>
              <span aria-hidden="true">→</span>
            </button>

            <MuscleGroupSelector onSelect={openMuscle} />

            {recents.length > 0 && (
              <section className={styles.homeRecents} aria-labelledby="recent-exercises-heading">
                <div className={styles.groupHeading}>
                  <h3 id="recent-exercises-heading">Recent</h3>
                  <span>{recents.length}</span>
                </div>
                <ExerciseResults
                  emptyMessage="No recent exercises yet."
                  isAdding={props.isAdding}
                  items={recents}
                  onAdd={props.onAdd}
                  selected={selected}
                />
              </section>
            )}
          </div>
        )}

        {props.status === 'ready' && view !== 'home' && (
          <>
            <div className={styles.detailToolbar}>
              <div className={styles.searchBlock}>
                <label htmlFor="exercise-search">{view === 'muscle' && muscleGroup ? `Search ${MUSCLE_GROUP_LABELS[muscleGroup]} exercises` : 'Search all exercises'}</label>
                <input
                  autoFocus
                  id="exercise-search"
                  onChange={(event: ChangeEvent<HTMLInputElement>) => setQuery(event.target.value)}
                  placeholder="Bench, RDL, OHP…"
                  type="search"
                  value={query}
                />
              </div>

              <div className={styles.typeFilter}>
                <SelectField label="Workout type" onChange={(event: ChangeEvent<HTMLSelectElement>) => setWorkoutType(event.target.value as ExerciseWorkoutType | '')} value={workoutType}>
                  <option value="">All workout types</option>
                  {WORKOUT_TYPE_ORDER.map((type) => <option key={type} value={type}>{WORKOUT_TYPE_LABELS[type]}</option>)}
                </SelectField>
              </div>
            </div>

            <div className={styles.results}>
              {view === 'muscle' && muscleGroup ? (
                <section className={styles.group} aria-labelledby="muscle-results-heading">
                  <div className={styles.groupHeading}>
                    <h3 id="muscle-results-heading">{MUSCLE_GROUP_LABELS[muscleGroup]}</h3>
                    <span>{filtered.length}</span>
                  </div>
                  <ExerciseResults
                    emptyMessage="No exercises match that muscle group, search, and workout type."
                    isAdding={props.isAdding}
                    items={filtered}
                    onAdd={props.onAdd}
                    selected={selected}
                  />
                </section>
              ) : (
                <>
                  {filtered.length === 0 && <p className={styles.message}>No exercises match that search and workout type.</p>}
                  {allGroups.map((group) => (
                    <section className={styles.group} key={group.key}>
                      <div className={styles.groupHeading}><h3>{group.label}</h3><span>{group.exercises.length}</span></div>
                      <ExerciseResults
                        emptyMessage=""
                        isAdding={props.isAdding}
                        items={group.exercises}
                        onAdd={props.onAdd}
                        selected={selected}
                      />
                    </section>
                  ))}
                </>
              )}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
