import { useEffect, useRef, useState } from 'react';
import type { WorkoutSetBusyState, WorkoutSetStatus } from '../hooks/useWorkoutSets';
import type {
  BodyweightLoadMode,
  WeightDisplayUnit,
  WorkoutExercise,
  WorkoutSet,
  WorkoutSetInput,
  WorkoutSetType,
} from '../model';
import type { WorkoutRecoverySetDraft } from '../recovery/workoutRecoveryModel';
import { displayWeightToKg, formatWeightInput, weightUnitLabel } from '../weightUnits';
import styles from './WorkoutSetList.module.css';

interface WorkoutSetListProps {
  exercise: WorkoutExercise;
  sets: WorkoutSet[];
  status: WorkoutSetStatus;
  busy: WorkoutSetBusyState | null;
  unit: WeightDisplayUnit;
  onAddSet: (workoutExerciseId: string, setType?: WorkoutSetType) => Promise<boolean>;
  onCopySet: (workoutSetId: string) => Promise<boolean>;
  onSaveSet: (workoutSetId: string, input: WorkoutSetInput) => Promise<boolean>;
  onRemoveSet: (workoutSetId: string) => Promise<boolean>;
  recoveryDrafts?: Record<string, WorkoutRecoverySetDraft>;
  serverMutationsEnabled?: boolean;
  setEditsEnabled?: boolean;
  onDraftChange?: (workoutSetId: string, draft: WorkoutRecoverySetDraft) => void;
  onDraftPersisted?: (workoutSetId: string) => void;
}

type SetDraft = WorkoutRecoverySetDraft;

function editableSetType(setType: WorkoutSetType): 'WARMUP' | 'WORKING' {
  return setType === 'WARMUP' ? 'WARMUP' : 'WORKING';
}

function draftFromSet(set: WorkoutSet, unit: WeightDisplayUnit): SetDraft {
  return {
    setType: editableSetType(set.setType),
    weight: formatWeightInput(set.weightKg, unit),
    reps: set.reps === null ? '' : String(set.reps),
    bodyweightMode: set.bodyweightMode ?? 'BODYWEIGHT',
  };
}

function parsePositiveInteger(value: string): number | null | 'invalid' {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 999) return 'invalid';
  return parsed;
}

function parseWeight(value: string, unit: WeightDisplayUnit): number | null | 'invalid' {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed) || parsed < 0) return 'invalid';
  return displayWeightToKg(parsed, unit);
}

function TrashIcon() {
  return (
    <svg aria-hidden="true" className={styles.actionIcon} viewBox="0 0 24 24">
      <path d="M4 7h16M9 7V4h6v3m-8 0 1 13h8l1-13M10 11v5m4-5v5" />
    </svg>
  );
}

function SetRow({
  exercise,
  set,
  busy,
  unit,
  onCopySet,
  onSaveSet,
  onRemoveSet,
  recoveryDraft,
  serverMutationsEnabled = true,
  setEditsEnabled = true,
  onDraftChange,
  onDraftPersisted,
}: Omit<WorkoutSetListProps, 'sets' | 'status' | 'onAddSet' | 'recoveryDrafts'> & { set: WorkoutSet; recoveryDraft?: WorkoutRecoverySetDraft }) {
  const [draft, setDraft] = useState<SetDraft>(() => recoveryDraft ?? draftFromSet(set, unit));
  const draftRef = useRef(draft);
  const [validationError, setValidationError] = useState('');
  const previousUnit = useRef(unit);
  const rowBusy = busy?.targetId === set.id;
  const isBodyweight = exercise.measurementType === 'BODYWEIGHT_REPS';
  const usesExternalLoad = isBodyweight && draft.bodyweightMode !== 'BODYWEIGHT';

  useEffect(() => {
    const next = recoveryDraft ?? draftFromSet(set, previousUnit.current);
    draftRef.current = next;
    setDraft(next);
    setValidationError('');
  }, [recoveryDraft, set.id, set.setType, set.weightKg, set.reps, set.bodyweightMode, set.completed]);

  useEffect(() => {
    if (previousUnit.current === unit) return;
    const priorUnit = previousUnit.current;
    const current = draftRef.current;
    const canonical = parseWeight(current.weight, priorUnit);
    const next = {
      ...current,
      weight: canonical === null || canonical === 'invalid' ? current.weight : formatWeightInput(canonical, unit),
    };
    draftRef.current = next;
    setDraft(next);
    onDraftChange?.(set.id, next);
    previousUnit.current = unit;
  }, [onDraftChange, set.id, unit]);

  const updateDraft = (update: (current: SetDraft) => SetDraft) => {
    const next = update(draftRef.current);
    draftRef.current = next;
    setDraft(next);
    onDraftChange?.(set.id, next);
  };

  const buildInput = (completed: boolean, override: Partial<SetDraft> = {}): WorkoutSetInput | null => {
    const next = { ...draftRef.current, ...override };
    const reps = parsePositiveInteger(next.reps);
    if (reps === 'invalid') {
      setValidationError('Reps must be a whole number from 1 to 999.');
      return null;
    }

    const weight = parseWeight(next.weight, unit);
    if (weight === 'invalid') {
      setValidationError(`Enter a valid ${weightUnitLabel(unit)} value.`);
      return null;
    }

    const bodyweightMode = isBodyweight ? next.bodyweightMode : null;
    const canonicalWeight = isBodyweight && bodyweightMode === 'BODYWEIGHT' ? null : weight;

    if (completed) {
      if (reps === null) {
        setValidationError('Enter reps before completing the set.');
        return null;
      }
      if (exercise.measurementType === 'WEIGHT_REPS' && (canonicalWeight === null || canonicalWeight <= 0)) {
        setValidationError('Enter weight before completing the set.');
        return null;
      }
      if (isBodyweight && bodyweightMode !== 'BODYWEIGHT' && (canonicalWeight === null || canonicalWeight <= 0)) {
        setValidationError('Enter the added or assisted load before completing the set.');
        return null;
      }
    }

    setValidationError('');
    return {
      setType: next.setType,
      weightKg: canonicalWeight,
      reps,
      bodyweightMode,
      completed,
    };
  };

  const saveDraft = async (override: Partial<SetDraft> = {}) => {
    const input = buildInput(set.completed, override);
    if (!input || !setEditsEnabled) return false;
    const saved = await onSaveSet(set.id, input);
    if (saved) onDraftPersisted?.(set.id);
    return saved;
  };

  const toggleCompleted = async () => {
    const input = buildInput(!set.completed);
    if (!input || !setEditsEnabled) return;
    const saved = await onSaveSet(set.id, input);
    if (saved) onDraftPersisted?.(set.id);
  };

  return (
    <li className={`${styles.setRow} ${isBodyweight ? styles.bodyweightRow : styles.weightedRow}${set.completed ? ` ${styles.completed}` : ''}`}>
      <span className={styles.setNumber} aria-hidden="true">{set.setNumber}</span>

      <label className={styles.typeField}>
        <span className={styles.visuallyHidden}>Type</span>
        <select
          aria-label={`Set ${set.setNumber} type`}
          disabled={Boolean(rowBusy) || !setEditsEnabled}
          onChange={(event) => {
            const setType = event.target.value as SetDraft['setType'];
            updateDraft((current) => ({ ...current, setType }));
            void saveDraft({ setType });
          }}
          value={draft.setType}
        >
          <option value="WORKING">Working</option>
          <option value="WARMUP">Warmup</option>
        </select>
      </label>

      {isBodyweight && (
        <label className={styles.modeField}>
          <span className={styles.visuallyHidden}>Mode</span>
          <select
            aria-label={`Set ${set.setNumber} bodyweight mode`}
            disabled={Boolean(rowBusy) || !setEditsEnabled}
            onChange={(event) => {
              const bodyweightMode = event.target.value as BodyweightLoadMode;
              const nextWeight = bodyweightMode === 'BODYWEIGHT' ? '' : draftRef.current.weight;
              updateDraft((current) => ({ ...current, bodyweightMode, weight: nextWeight }));
              void saveDraft({ bodyweightMode, weight: nextWeight });
            }}
            value={draft.bodyweightMode}
          >
            <option value="BODYWEIGHT">Bodyweight</option>
            <option value="ADDED_WEIGHT">Added weight</option>
            <option value="ASSISTED">Assisted</option>
          </select>
        </label>
      )}

      {(exercise.measurementType === 'WEIGHT_REPS' || usesExternalLoad) ? (
        <label className={`${styles.numberField} ${styles.loadField}`}>
          <span className={styles.visuallyHidden}>{usesExternalLoad ? (draft.bodyweightMode === 'ASSISTED' ? 'Assist' : 'Added') : 'Weight'} ({weightUnitLabel(unit)})</span>
          <input
            aria-label={`Set ${set.setNumber} ${usesExternalLoad ? 'load' : 'weight'} in ${weightUnitLabel(unit)}`}
            disabled={Boolean(rowBusy) || !setEditsEnabled}
            inputMode="decimal"
            min="0"
            onBlur={() => void saveDraft()}
            onChange={(event) => updateDraft((current) => ({ ...current, weight: event.target.value }))}
            placeholder="0"
            step="any"
            type="number"
            value={draft.weight}
          />
        </label>
      ) : (
        <span className={styles.noLoad} aria-label={`Set ${set.setNumber} uses bodyweight only`}>—</span>
      )}

      <label className={`${styles.numberField} ${styles.repsField}`}>
        <span className={styles.visuallyHidden}>Reps</span>
        <input
          aria-label={`Set ${set.setNumber} reps`}
          disabled={Boolean(rowBusy) || !setEditsEnabled}
          inputMode="numeric"
          min="1"
          onBlur={() => void saveDraft()}
          onChange={(event) => updateDraft((current) => ({ ...current, reps: event.target.value }))}
          placeholder="0"
          step="1"
          type="number"
          value={draft.reps}
        />
      </label>

      <div className={styles.rowActions}>
        <button aria-label={`Copy set ${set.setNumber}`} disabled={Boolean(rowBusy) || !serverMutationsEnabled} onClick={() => void onCopySet(set.id)} type="button">
          <span aria-hidden="true">⧉</span>
          <span className={styles.actionLabel}>Copy</span>
        </button>
        <button aria-label={`Delete set ${set.setNumber}`} disabled={Boolean(rowBusy) || !serverMutationsEnabled} onClick={() => void onRemoveSet(set.id)} type="button">
          <TrashIcon />
          <span className={styles.actionLabel}>Delete</span>
        </button>
      </div>

      <button
        aria-label={set.completed ? `Reopen set ${set.setNumber}` : `Mark set ${set.setNumber} complete`}
        className={styles.completeButton}
        disabled={Boolean(rowBusy) || !setEditsEnabled}
        onClick={() => void toggleCompleted()}
        type="button"
      >
        <span aria-hidden="true">{set.completed ? '✓' : ''}</span>
        <span className={styles.completeLabel}>Done</span>
      </button>

      {validationError && <p className={styles.validationError} role="alert">{validationError}</p>}
    </li>
  );
}

export function WorkoutSetList(props: WorkoutSetListProps) {
  const supportsSets = props.exercise.measurementType === 'WEIGHT_REPS' || props.exercise.measurementType === 'BODYWEIGHT_REPS';
  const isBodyweight = props.exercise.measurementType === 'BODYWEIGHT_REPS';
  const addBusy = props.busy?.action === 'add' && props.busy.targetId === props.exercise.id;
  const lastSet = props.sets.at(-1);
  const serverMutationsEnabled = props.serverMutationsEnabled ?? true;
  const actionsDisabled = Boolean(props.busy) || !serverMutationsEnabled;

  if (!supportsSets) {
    const trackingLabel = props.exercise.measurementType === 'DURATION' ? 'Duration' : 'Alternative tracking';
    return (
      <section className={styles.unsupported} aria-label={`${props.exercise.canonicalName} tracking`}>
        <div className={styles.unsupportedHeading}>
          <span>Tracking type</span>
          <strong>{trackingLabel}</strong>
        </div>
        <p>This exercise does not use weight-and-rep set entry in the current logger.</p>
      </section>
    );
  }

  if (props.status === 'loading') return <p className={styles.message} role="status">Loading sets…</p>;

  return (
    <section className={styles.setStage} aria-label={`${props.exercise.canonicalName} sets`}>
      {props.sets.length === 0 ? (
        <p className={styles.message}>No sets yet. Add a working set or warmup when you are ready.</p>
      ) : (
        <>
          <div className={`${styles.setHeader} ${isBodyweight ? styles.bodyweightHeader : styles.weightedHeader}`} aria-hidden="true">
            <span>Set</span>
            <span>Type</span>
            {isBodyweight && <span>Mode</span>}
            <span>{isBodyweight ? 'Load' : `Weight (${weightUnitLabel(props.unit)})`}</span>
            <span>Reps</span>
            <span>Actions</span>
            <span>Done</span>
          </div>
          <ol className={styles.setList}>
            {props.sets.map((set) => (
              <SetRow
                busy={props.busy}
                exercise={props.exercise}
                key={set.id}
                onCopySet={props.onCopySet}
                onDraftChange={props.onDraftChange}
                onDraftPersisted={props.onDraftPersisted}
                onRemoveSet={props.onRemoveSet}
                onSaveSet={props.onSaveSet}
                recoveryDraft={props.recoveryDrafts?.[set.id]}
                serverMutationsEnabled={props.serverMutationsEnabled}
                setEditsEnabled={props.setEditsEnabled}
                set={set}
                unit={props.unit}
              />
            ))}
          </ol>
        </>
      )}

      <div className={styles.addActions}>
        <button className={styles.primarySetAction} disabled={actionsDisabled} onClick={() => void props.onAddSet(props.exercise.id, 'WORKING')} type="button">
          {addBusy ? 'Adding…' : '+ Working set'}
        </button>
        <button disabled={actionsDisabled} onClick={() => void props.onAddSet(props.exercise.id, 'WARMUP')} type="button">+ Warmup</button>
        {lastSet && <button disabled={actionsDisabled} onClick={() => void props.onCopySet(lastSet.id)} type="button">Copy last set</button>}
      </div>
    </section>
  );
}
