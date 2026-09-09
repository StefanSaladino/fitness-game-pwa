import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
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
import { ExerciseMiniIcon } from './ExerciseMiniIcon';
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
      <ExerciseMiniIcon canonicalName={exercise.canonicalName} className={styles.resultIcon} />
      <div className={styles.resultIdentity}>
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
      <button aria-label="Close exercise picker" className={styles.close} data-picker-close onClick={onClose} type="button">Close</button>
    </header>
  );
}

function WorkoutTypeFilter({ value, onChange }: {
  value: ExerciseWorkoutType | '';
  onChange: (value: ExerciseWorkoutType | '') => void;
}) {
  return (
    <div aria-label="Filter by workout type" className={styles.typeFilter} role="group">
      <button aria-pressed={value === ''} onClick={() => onChange('')} type="button">All</button>
      {WORKOUT_TYPE_ORDER.map((type) => (
        <button
          aria-pressed={value === type}
          key={type}
          onClick={() => onChange(type)}
          type="button"
        >
          {WORKOUT_TYPE_LABELS[type]}
        </button>
      ))}
    </div>
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
  const dialogRef = useRef<HTMLElement | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const viewRef = useRef<PickerView>('home');
  closeRef.current = props.onClose;
  const [view, setView] = useState<PickerView>('home');
  const [query, setQuery] = useState('');
  const [muscleGroup, setMuscleGroup] = useState<ExerciseMuscleGroup | null>(null);
  const [workoutType, setWorkoutType] = useState<ExerciseWorkoutType | ''>('');
  const [recentExpanded, setRecentExpanded] = useState(false);
  viewRef.current = view;

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
    if (!props.open) return undefined;
    const previousOverflow = document.documentElement.style.overflow;
    previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    document.documentElement.style.overflow = 'hidden';
    window.requestAnimationFrame(() => dialogRef.current?.querySelector<HTMLButtonElement>('[data-picker-close]')?.focus());

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        if (viewRef.current === 'home') closeRef.current();
        else goHome();
        return;
      }

      if (event.key !== 'Tab' || !dialogRef.current) return;
      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(
        'button:not(:disabled), input:not(:disabled), [tabindex]:not([tabindex="-1"])',
      ));
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.documentElement.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
      window.requestAnimationFrame(() => previousFocusRef.current?.focus());
    };
  }, [props.open]);

  useEffect(() => {
    if (!props.open) {
      goHome();
      setRecentExpanded(false);
    }
  }, [props.open]);

  if (!props.open) return null;

  const title = view === 'muscle' && muscleGroup
    ? `${MUSCLE_GROUP_LABELS[muscleGroup]} exercises`
    : view === 'all'
      ? 'All exercises'
      : 'Add exercise';

  return (
    <div
      className={styles.backdrop}
      onMouseDown={(event) => {
        if (event.currentTarget === event.target) props.onClose();
      }}
    >
      <section ref={dialogRef} aria-labelledby="exercise-picker-title" aria-modal="true" className={styles.picker} role="dialog" tabIndex={-1}>
        <div className={styles.chrome}>
          <PickerHeader
            canGoBack={view !== 'home'}
            eyebrow={view === 'home' ? 'EXERCISE LIBRARY' : 'BROWSE EXERCISES'}
            onBack={goHome}
            onClose={props.onClose}
            title={title}
          />

          {props.status === 'ready' && view !== 'home' && (
            <div className={styles.detailToolbar}>
              <div className={styles.searchBlock}>
                <label htmlFor="exercise-search">
                  {view === 'muscle' && muscleGroup ? `Search ${MUSCLE_GROUP_LABELS[muscleGroup]} exercises` : 'Search all exercises'}
                </label>
                <input
                  autoFocus
                  id="exercise-search"
                  onChange={(event: ChangeEvent<HTMLInputElement>) => setQuery(event.target.value)}
                  placeholder="Bench, RDL, OHP…"
                  type="search"
                  value={query}
                />
              </div>
              <WorkoutTypeFilter onChange={setWorkoutType} value={workoutType} />
            </div>
          )}
        </div>

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
              <span aria-hidden="true" className={styles.searchGlyph} />
              <span className={styles.searchAllIdentity}>
                <strong>Search all exercises</strong>
                <small>Bench, RDL, OHP…</small>
              </span>
              <span aria-hidden="true" className={styles.searchArrow}>→</span>
            </button>

            <div className={styles.browseSurface}>
              <MuscleGroupSelector onSelect={openMuscle} />
            </div>

            {recents.length > 0 && (
              <section className={styles.homeRecents} aria-labelledby="recent-exercises-heading">
                <div className={styles.groupHeading}>
                  <h3 id="recent-exercises-heading">Recent</h3>
                  <button
                    aria-controls="recent-exercises-list"
                    aria-expanded={recentExpanded}
                    className={styles.recentToggle}
                    onClick={() => setRecentExpanded((current) => !current)}
                    type="button"
                  >{recentExpanded ? 'Hide' : `Show ${recents.length}`}</button>
                </div>
                {recentExpanded && (
                  <div id="recent-exercises-list">
                    <ExerciseResults
                      emptyMessage="No recent exercises yet."
                      isAdding={props.isAdding}
                      items={recents}
                      onAdd={props.onAdd}
                      selected={selected}
                    />
                  </div>
                )}
              </section>
            )}
          </div>
        )}

        {props.status === 'ready' && view !== 'home' && (
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
        )}
      </section>
    </div>
  );
}
