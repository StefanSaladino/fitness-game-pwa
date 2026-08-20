import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import { SelectField } from '../../../components/ui';
import {
  filterAndRankExercises,
  groupExercises,
  MUSCLE_GROUP_LABELS,
  MUSCLE_GROUP_ORDER,
  recentExercises,
  WORKOUT_TYPE_LABELS,
  WORKOUT_TYPE_ORDER,
} from '../exerciseSearch';
import type { ExerciseBrowseMode, ExerciseMuscleGroup, ExercisePickerItem, ExerciseWorkoutType } from '../model';
import type { ExercisePickerStatus } from '../hooks/useExercisePickerCatalog';
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

export function ExercisePicker(props: ExercisePickerProps) {
  const closeRef = useRef(props.onClose);
  closeRef.current = props.onClose;
  const [query, setQuery] = useState('');
  const [browseMode, setBrowseMode] = useState<ExerciseBrowseMode>('muscle');
  const [muscleGroup, setMuscleGroup] = useState<ExerciseMuscleGroup | ''>('');
  const [workoutType, setWorkoutType] = useState<ExerciseWorkoutType | ''>('');

  const selected = useMemo(() => new Set(props.selectedExerciseIds), [props.selectedExerciseIds]);
  const filtered = useMemo(
    () => filterAndRankExercises(props.catalog, { query, muscleGroup, workoutType }),
    [props.catalog, query, muscleGroup, workoutType],
  );
  const recents = useMemo(
    () => (!query && !muscleGroup && !workoutType ? recentExercises(props.catalog) : []),
    [props.catalog, query, muscleGroup, workoutType],
  );
  const groups = useMemo(() => {
    const recentIds = new Set(recents.map((exercise) => exercise.id));
    const groupedItems = recentIds.size > 0 ? filtered.filter((exercise) => !recentIds.has(exercise.id)) : filtered;
    return groupExercises(groupedItems, browseMode);
  }, [filtered, browseMode, recents]);

  useEffect(() => {
    if (!props.open) return undefined;
    const previousOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') closeRef.current(); };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.documentElement.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [props.open]);

  if (!props.open) return null;

  return (
    <div className={styles.backdrop}>
      <section aria-labelledby="exercise-picker-title" aria-modal="true" className={styles.picker} role="dialog">
        <header className={styles.header}>
          <div>
            <p>EXERCISE LIBRARY</p>
            <h2 id="exercise-picker-title">Add exercise</h2>
          </div>
          <button aria-label="Close exercise picker" className={styles.close} onClick={props.onClose} type="button">Close</button>
        </header>

        <div className={styles.searchBlock}>
          <label htmlFor="exercise-search">Search exercises</label>
          <input
            autoFocus
            id="exercise-search"
            onChange={(event: ChangeEvent<HTMLInputElement>) => setQuery(event.target.value)}
            placeholder="Bench, RDL, OHP…"
            type="search"
            value={query}
          />
        </div>

        <div aria-label="Browse exercises by" className={styles.browseSwitch} role="group">
          <button aria-pressed={browseMode === 'muscle'} onClick={() => setBrowseMode('muscle')} type="button">Muscle groups</button>
          <button aria-pressed={browseMode === 'type'} onClick={() => setBrowseMode('type')} type="button">Workout types</button>
        </div>

        <div className={styles.filters}>
          <SelectField label="Muscle group" onChange={(event: ChangeEvent<HTMLSelectElement>) => setMuscleGroup(event.target.value as ExerciseMuscleGroup | '')} value={muscleGroup}>
            <option value="">All muscle groups</option>
            {MUSCLE_GROUP_ORDER.map((group) => <option key={group} value={group}>{MUSCLE_GROUP_LABELS[group]}</option>)}
          </SelectField>
          <SelectField label="Workout type" onChange={(event: ChangeEvent<HTMLSelectElement>) => setWorkoutType(event.target.value as ExerciseWorkoutType | '')} value={workoutType}>
            <option value="">All workout types</option>
            {WORKOUT_TYPE_ORDER.map((type) => <option key={type} value={type}>{WORKOUT_TYPE_LABELS[type]}</option>)}
          </SelectField>
        </div>

        <div className={styles.results}>
          {props.status === 'loading' && <p className={styles.message} role="status">Loading exercise library…</p>}
          {props.status === 'error' && (
            <div className={styles.error}>
              <p role="alert">{props.error || 'Unable to load the exercise library.'}</p>
              <button onClick={() => void props.onRetry()} type="button">Try again</button>
            </div>
          )}

          {props.status === 'ready' && recents.length > 0 && (
            <section className={styles.group} aria-labelledby="recent-exercises-heading">
              <h3 id="recent-exercises-heading">Recent</h3>
              <ul>{recents.map((exercise) => <ExerciseRow added={selected.has(exercise.id)} disabled={props.isAdding} exercise={exercise} key={`recent-${exercise.id}`} onAdd={props.onAdd} />)}</ul>
            </section>
          )}

          {props.status === 'ready' && filtered.length === 0 && <p className={styles.message}>No exercises match that search and filter combination.</p>}

          {props.status === 'ready' && groups.map((group) => (
            <section className={styles.group} key={group.key}>
              <div className={styles.groupHeading}><h3>{group.label}</h3><span>{group.exercises.length}</span></div>
              <ul>{group.exercises.map((exercise) => <ExerciseRow added={selected.has(exercise.id)} disabled={props.isAdding} exercise={exercise} key={`${group.key}-${exercise.id}`} onAdd={props.onAdd} />)}</ul>
            </section>
          ))}
        </div>
      </section>
    </div>
  );
}
