import { useEffect, useMemo, useRef, useState } from 'react';
import type { WorkoutExercise } from '../model';
import styles from './SupersetBuilder.module.css';

interface SupersetBuilderProps {
  exercises: WorkoutExercise[];
  anchorExerciseId: string;
  busy: boolean;
  onClose: () => void;
  onSave: (supersetGroupId: string | null, workoutExerciseIds: string[]) => Promise<boolean>;
  onBreakApart: (supersetGroupId: string) => Promise<boolean>;
}

function orderedGroupMembers(exercises: WorkoutExercise[], groupId: string): WorkoutExercise[] {
  return exercises
    .filter((exercise) => exercise.supersetGroupId === groupId)
    .sort((a, b) => (a.supersetOrder ?? 0) - (b.supersetOrder ?? 0));
}

export function SupersetBuilder({ exercises, anchorExerciseId, busy, onClose, onSave, onBreakApart }: SupersetBuilderProps) {
  const anchor = exercises.find((exercise) => exercise.id === anchorExerciseId) ?? null;
  const groupId = anchor?.supersetGroupId ?? null;
  const existingMembers = useMemo(
    () => groupId ? orderedGroupMembers(exercises, groupId) : [],
    [exercises, groupId],
  );
  const [selectedIds, setSelectedIds] = useState<string[]>(() => existingMembers.length > 0
    ? existingMembers.map((exercise) => exercise.id)
    : anchor ? [anchor.id] : []);
  const [error, setError] = useState('');
  const dialogRef = useRef<HTMLElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    closeButtonRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busy) {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== 'Tab') return;
      const dialog = dialogRef.current;
      if (!dialog) return;
      const focusable = Array.from(dialog.querySelectorAll<HTMLButtonElement | HTMLInputElement>('button:not(:disabled), input:not(:disabled)'));
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
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [busy, onClose]);

  useEffect(() => {
    if (!anchor) onClose();
  }, [anchor, onClose]);

  const selected = selectedIds
    .map((id) => exercises.find((exercise) => exercise.id === id))
    .filter((exercise): exercise is WorkoutExercise => Boolean(exercise));

  const toggle = (exercise: WorkoutExercise) => {
    setError('');
    setSelectedIds((current) => current.includes(exercise.id)
      ? current.filter((id) => id !== exercise.id)
      : [...current, exercise.id]);
  };

  const move = (exerciseId: string, direction: -1 | 1) => {
    setSelectedIds((current) => {
      const index = current.indexOf(exerciseId);
      const nextIndex = index + direction;
      if (index < 0 || nextIndex < 0 || nextIndex >= current.length) return current;
      const next = [...current];
      [next[index], next[nextIndex]] = [next[nextIndex]!, next[index]!];
      return next;
    });
  };

  const save = async () => {
    setError('');
    if (selectedIds.length < 2) {
      setError('Choose at least two exercises for a Superset.');
      return;
    }
    const saved = await onSave(groupId, selectedIds);
    if (saved) onClose();
  };

  const breakApart = async () => {
    if (!groupId) return;
    setError('');
    const cleared = await onBreakApart(groupId);
    if (cleared) onClose();
  };

  if (!anchor) return null;

  return (
    <div className={styles.backdrop} onMouseDown={(event) => {
      if (event.target === event.currentTarget && !busy) onClose();
    }}>
      <section
        ref={dialogRef}
        aria-labelledby="superset-builder-title"
        aria-modal="true"
        className={styles.dialog}
        role="dialog"
      >
        <header className={styles.header}>
          <div>
            <p>Workout structure</p>
            <h2 id="superset-builder-title">{groupId ? 'Manage Superset' : 'Create Superset'}</h2>
          </div>
          <button ref={closeButtonRef} aria-label="Close Superset builder" disabled={busy} onClick={onClose} type="button">×</button>
        </header>

        <p className={styles.intro}>
          Choose two or more exercises. Sets and scoring stay independent; this only links their workout order.
        </p>

        <div className={styles.layout}>
          <section className={styles.choices} aria-labelledby="superset-choices-heading">
            <div className={styles.sectionHeading}>
              <h3 id="superset-choices-heading">Exercises</h3>
              <span>{selectedIds.length} selected</span>
            </div>
            <div className={styles.choiceList}>
              {exercises.map((exercise) => {
                const belongsElsewhere = exercise.supersetGroupId !== null && exercise.supersetGroupId !== groupId;
                const checked = selectedIds.includes(exercise.id);
                return (
                  <label className={`${styles.choice}${belongsElsewhere ? ` ${styles.choiceDisabled}` : ''}`} key={exercise.id}>
                    <input
                      checked={checked}
                      disabled={busy || belongsElsewhere}
                      onChange={() => toggle(exercise)}
                      type="checkbox"
                    />
                    <span>
                      <strong>{exercise.canonicalName}</strong>
                      <small>{belongsElsewhere ? 'Already in another Superset' : checked ? 'Included' : 'Available'}</small>
                    </span>
                  </label>
                );
              })}
            </div>
          </section>

          <section className={styles.order} aria-labelledby="superset-order-heading">
            <div className={styles.sectionHeading}>
              <h3 id="superset-order-heading">Superset order</h3>
              <span>A1 → A{Math.max(1, selected.length)}</span>
            </div>
            {selected.length < 2 ? (
              <p className={styles.emptyOrder}>Select at least one more exercise.</p>
            ) : (
              <ol className={styles.orderList}>
                {selected.map((exercise, index) => (
                  <li key={exercise.id}>
                    <span className={styles.sequence}>A{index + 1}</span>
                    <strong>{exercise.canonicalName}</strong>
                    <div className={styles.orderActions}>
                      <button aria-label={`Move ${exercise.canonicalName} earlier in Superset`} disabled={busy || index === 0} onClick={() => move(exercise.id, -1)} type="button">↑</button>
                      <button aria-label={`Move ${exercise.canonicalName} later in Superset`} disabled={busy || index === selected.length - 1} onClick={() => move(exercise.id, 1)} type="button">↓</button>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>

        {error && <p className={styles.error} role="alert">{error}</p>}

        <footer className={styles.footer}>
          {groupId ? (
            <button className={styles.breakButton} disabled={busy} onClick={() => void breakApart()} type="button">Break Superset apart</button>
          ) : <span />}
          <div>
            <button disabled={busy} onClick={onClose} type="button">Cancel</button>
            <button className={styles.saveButton} disabled={busy || selectedIds.length < 2} onClick={() => void save()} type="button">
              {busy ? 'Saving…' : groupId ? 'Save Superset' : 'Create Superset'}
            </button>
          </div>
        </footer>
      </section>
    </div>
  );
}
