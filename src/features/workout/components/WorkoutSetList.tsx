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
}

interface SetDraft {
  setType: 'WARMUP' | 'WORKING';
  weight: string;
  reps: string;
  bodyweightMode: BodyweightLoadMode;
}

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

function SetRow({
  exercise,
  set,
  busy,
  unit,
  onCopySet,
  onSaveSet,
  onRemoveSet,
}: Omit<WorkoutSetListProps, 'sets' | 'status' | 'onAddSet'> & { set: WorkoutSet }) {
  const [draft, setDraft] = useState<SetDraft>(() => draftFromSet(set, unit));
  const [validationError, setValidationError] = useState('');
  const previousUnit = useRef(unit);
  const rowBusy = busy?.targetId === set.id;
  const isBodyweight = exercise.measurementType === 'BODYWEIGHT_REPS';
  const usesExternalLoad = isBodyweight && draft.bodyweightMode !== 'BODYWEIGHT';

  useEffect(() => {
    setDraft(draftFromSet(set, previousUnit.current));
    setValidationError('');
  }, [set.id, set.setType, set.weightKg, set.reps, set.bodyweightMode, set.completed]);

  useEffect(() => {
    if (previousUnit.current === unit) return;
    const priorUnit = previousUnit.current;
    setDraft((current) => {
      const canonical = parseWeight(current.weight, priorUnit);
      return {
        ...current,
        weight: canonical === null || canonical === 'invalid' ? current.weight : formatWeightInput(canonical, unit),
      };
    });
    previousUnit.current = unit;
  }, [unit]);

  const buildInput = (completed: boolean, override: Partial<SetDraft> = {}): WorkoutSetInput | null => {
    const next = { ...draft, ...override };
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
    if (!input) return false;
    return onSaveSet(set.id, input);
  };

  const toggleCompleted = async () => {
    const input = buildInput(!set.completed);
    if (!input) return;
    await onSaveSet(set.id, input);
  };

  return (
    <li className={`${styles.setRow}${set.completed ? ` ${styles.completed}` : ''}`}>
      <button
        aria-label={set.completed ? `Reopen set ${set.setNumber}` : `Mark set ${set.setNumber} complete`}
        className={styles.completeButton}
        disabled={Boolean(rowBusy)}
        onClick={() => void toggleCompleted()}
        type="button"
      >
        <span aria-hidden="true">{set.completed ? '✓' : set.setNumber}</span>
      </button>

      <label className={styles.typeField}>
        <span>Type</span>
        <select
          aria-label={`Set ${set.setNumber} type`}
          disabled={Boolean(rowBusy)}
          onChange={(event) => {
            const setType = event.target.value as SetDraft['setType'];
            setDraft((current) => ({ ...current, setType }));
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
          <span>Mode</span>
          <select
            aria-label={`Set ${set.setNumber} bodyweight mode`}
            disabled={Boolean(rowBusy)}
            onChange={(event) => {
              const bodyweightMode = event.target.value as BodyweightLoadMode;
              const nextWeight = bodyweightMode === 'BODYWEIGHT' ? '' : draft.weight;
              setDraft((current) => ({ ...current, bodyweightMode, weight: nextWeight }));
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

      {(exercise.measurementType === 'WEIGHT_REPS' || usesExternalLoad) && (
        <label className={styles.numberField}>
          <span>{usesExternalLoad ? (draft.bodyweightMode === 'ASSISTED' ? 'Assist' : 'Added') : 'Weight'} ({weightUnitLabel(unit)})</span>
          <input
            aria-label={`Set ${set.setNumber} ${usesExternalLoad ? 'load' : 'weight'} in ${weightUnitLabel(unit)}`}
            disabled={Boolean(rowBusy)}
            inputMode="decimal"
            min="0"
            onBlur={() => void saveDraft()}
            onChange={(event) => setDraft((current) => ({ ...current, weight: event.target.value }))}
            placeholder="0"
            step="any"
            type="number"
            value={draft.weight}
          />
        </label>
      )}

      <label className={styles.numberField}>
        <span>Reps</span>
        <input
          aria-label={`Set ${set.setNumber} reps`}
          disabled={Boolean(rowBusy)}
          inputMode="numeric"
          min="1"
          onBlur={() => void saveDraft()}
          onChange={(event) => setDraft((current) => ({ ...current, reps: event.target.value }))}
          placeholder="0"
          step="1"
          type="number"
          value={draft.reps}
        />
      </label>

      <div className={styles.rowActions}>
        <button aria-label={`Copy set ${set.setNumber}`} disabled={Boolean(rowBusy)} onClick={() => void onCopySet(set.id)} type="button">Copy</button>
        <button aria-label={`Delete set ${set.setNumber}`} disabled={Boolean(rowBusy)} onClick={() => void onRemoveSet(set.id)} type="button">Delete</button>
      </div>

      {validationError && <p className={styles.validationError} role="alert">{validationError}</p>}
    </li>
  );
}

export function WorkoutSetList(props: WorkoutSetListProps) {
  const supportsSets = props.exercise.measurementType === 'WEIGHT_REPS' || props.exercise.measurementType === 'BODYWEIGHT_REPS';
  const addBusy = props.busy?.action === 'add' && props.busy.targetId === props.exercise.id;
  const lastSet = props.sets.at(-1);

  if (!supportsSets) {
    return <p className={styles.unsupported}>Set entry for this measurement type is not part of the current weight/reps logging slice.</p>;
  }

  if (props.status === 'loading') return <p className={styles.message} role="status">Loading sets…</p>;

  return (
    <section className={styles.setStage} aria-label={`${props.exercise.canonicalName} sets`}>
      {props.sets.length === 0 ? (
        <p className={styles.message}>No sets yet. Add a working set or warmup when you are ready.</p>
      ) : (
        <ol className={styles.setList}>
          {props.sets.map((set) => (
            <SetRow
              busy={props.busy}
              exercise={props.exercise}
              key={set.id}
              onCopySet={props.onCopySet}
              onRemoveSet={props.onRemoveSet}
              onSaveSet={props.onSaveSet}
              set={set}
              unit={props.unit}
            />
          ))}
        </ol>
      )}

      <div className={styles.addActions}>
        <button disabled={Boolean(props.busy)} onClick={() => void props.onAddSet(props.exercise.id, 'WORKING')} type="button">
          {addBusy ? 'Adding…' : '+ Working set'}
        </button>
        <button disabled={Boolean(props.busy)} onClick={() => void props.onAddSet(props.exercise.id, 'WARMUP')} type="button">+ Warmup</button>
        {lastSet && <button disabled={Boolean(props.busy)} onClick={() => void props.onCopySet(lastSet.id)} type="button">Copy last set</button>}
      </div>
    </section>
  );
}
