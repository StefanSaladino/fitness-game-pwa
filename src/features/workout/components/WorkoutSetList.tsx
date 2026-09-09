import { useEffect, useRef, useState } from 'react';
import { SelectField } from '../../../components/ui';
import type { WorkoutSetBusyState, WorkoutSetStatus } from '../hooks/useWorkoutSets';
import type {
  BodyweightLoadMode,
  WeightDisplayUnit,
  WorkoutAdvancedSetInput,
  WorkoutAdvancedSetVariant,
  WorkoutExercise,
  WorkoutSet,
  WorkoutSetInput,
  WorkoutSetType,
  WorkoutSetVariant,
} from '../model';
import type { WorkoutRecoverySetDraft, WorkoutRecoverySetSegmentDraft } from '../recovery/workoutRecoveryModel';
import { displayWeightToKg, formatWeightInput, weightUnitLabel } from '../weightUnits';
import styles from './WorkoutSetList.module.css';

interface WorkoutSetListProps {
  exercise: WorkoutExercise;
  sets: WorkoutSet[];
  status: WorkoutSetStatus;
  busy: WorkoutSetBusyState | null;
  unit: WeightDisplayUnit;
  onAddSet: (workoutExerciseId: string, setType?: WorkoutSetType) => Promise<boolean>;
  onAddAdvancedSet: (workoutExerciseId: string, variant: WorkoutAdvancedSetVariant) => Promise<boolean>;
  onSaveAdvancedSet: (workoutSetId: string, input: WorkoutAdvancedSetInput) => Promise<boolean>;
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

function collapsedSetSummary(exercise: WorkoutExercise, draft: SetDraft, unit: WeightDisplayUnit): string {
  const reps = draft.reps.trim();
  const repLabel = reps === '1' ? 'rep' : 'reps';
  const repSummary = reps ? `${reps} ${repLabel}` : 'Reps not set';

  if (exercise.measurementType === 'BODYWEIGHT_REPS') {
    if (draft.bodyweightMode === 'BODYWEIGHT') return `${repSummary} • Bodyweight`;
    const load = draft.weight.trim() || '0';
    const suffix = draft.bodyweightMode === 'ASSISTED' ? 'assisted' : 'added';
    return `${repSummary} • ${load} ${weightUnitLabel(unit)} ${suffix}`;
  }

  const weight = draft.weight.trim() || '0';
  return `${repSummary} • ${weight} ${weightUnitLabel(unit)}`;
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
}: Omit<WorkoutSetListProps, 'sets' | 'status' | 'onAddSet' | 'onAddAdvancedSet' | 'onSaveAdvancedSet' | 'recoveryDrafts'> & { set: WorkoutSet; recoveryDraft?: WorkoutRecoverySetDraft }) {
  const [draft, setDraft] = useState<SetDraft>(() => recoveryDraft ?? draftFromSet(set, unit));
  const draftRef = useRef(draft);
  const [collapsed, setCollapsed] = useState(set.completed);
  const previousCompleted = useRef(set.completed);
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
    if (previousCompleted.current === set.completed) return;
    setCollapsed(set.completed);
    previousCompleted.current = set.completed;
  }, [set.completed]);

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
    if (saved) {
      setCollapsed(!set.completed);
      onDraftPersisted?.(set.id);
    }
  };

  if (collapsed) {
    return (
      <li className={`${styles.collapsedSetRow}${set.completed ? ` ${styles.completed}` : ''}`}>
        <button
          aria-expanded="false"
          aria-label={`Expand set ${set.setNumber}`}
          className={styles.collapsedSetButton}
          onClick={() => setCollapsed(false)}
          type="button"
        >
          <span className={styles.collapsedSetSummary}>
            <strong>Set {set.setNumber}:</strong>
            <span>{collapsedSetSummary(exercise, draft, unit)}</span>
          </span>
          <span className={styles.collapsedSetChevron} aria-hidden="true">⌄</span>
        </button>
      </li>
    );
  }

  return (
    <li className={`${styles.setRow} ${isBodyweight ? styles.bodyweightRow : styles.weightedRow}${set.completed ? ` ${styles.completed}` : ''}`}>
      <span className={styles.setNumber} aria-hidden="true">{set.setNumber}</span>

      <SelectField
          className={styles.typeField}
          compact
          disabled={Boolean(rowBusy) || !setEditsEnabled}
          label={`Set ${set.setNumber} type`}
          labelHidden
          onChange={(event) => {
            const setType = event.target.value as SetDraft['setType'];
            updateDraft((current) => ({ ...current, setType }));
            void saveDraft({ setType });
          }}
          value={draft.setType}
        >
          <option value="WORKING">Working</option>
          <option value="WARMUP">Warmup</option>
      </SelectField>

      {isBodyweight && (
        <SelectField
            className={styles.modeField}
            compact
            disabled={Boolean(rowBusy) || !setEditsEnabled}
            label={`Set ${set.setNumber} bodyweight mode`}
            labelHidden
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
        </SelectField>
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

      <div className={styles.completionControls}>
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
        <button
          aria-expanded="true"
          aria-label={`Collapse set ${set.setNumber}`}
          className={styles.setCollapseButton}
          onClick={() => setCollapsed(true)}
          type="button"
        >
          <span className={styles.setNumberChevron} aria-hidden="true">⌃</span>
        </button>
      </div>

      {validationError && <p className={styles.validationError} role="alert">{validationError}</p>}
    </li>
  );
}

function effectiveSetVariant(set: WorkoutSet): WorkoutSetVariant {
  return set.setVariant ?? (set.setType === 'DROP' ? 'DROP' : 'STANDARD');
}

function advancedVariantLabel(variant: WorkoutAdvancedSetVariant): string {
  if (variant === 'DROP') return 'Drop set';
  if (variant === 'ASCENDING_PYRAMID') return 'Ascending pyramid';
  return 'Full pyramid';
}

function minimumAdvancedSegments(variant: WorkoutAdvancedSetVariant): number {
  return variant === 'FULL_PYRAMID' ? 3 : 2;
}

function emptyAdvancedSegments(variant: WorkoutAdvancedSetVariant): WorkoutRecoverySetSegmentDraft[] {
  return Array.from({ length: minimumAdvancedSegments(variant) }, () => ({ weight: '', reps: '' }));
}

function AdvancedSetRow({
  set,
  busy,
  unit,
  onCopySet,
  onSaveAdvancedSet,
  onRemoveSet,
  recoveryDraft,
  serverMutationsEnabled = true,
  setEditsEnabled = true,
  onDraftChange,
  onDraftPersisted,
}: Omit<WorkoutSetListProps, 'exercise' | 'sets' | 'status' | 'onAddSet' | 'onAddAdvancedSet' | 'onSaveSet' | 'recoveryDrafts'> & {
  set: WorkoutSet;
  recoveryDraft?: WorkoutRecoverySetDraft;
}) {
  const initialVariant = effectiveSetVariant(set) === 'STANDARD' ? 'DROP' : effectiveSetVariant(set) as WorkoutAdvancedSetVariant;
  const persistedSegments = set.segments ?? [];
  const initialSegments = recoveryDraft?.segments?.length
    ? recoveryDraft.segments
    : persistedSegments.length
      ? persistedSegments.map((segment) => ({
          weight: formatWeightInput(segment.weightKg, unit),
          reps: segment.reps === null ? '' : String(segment.reps),
        }))
      : emptyAdvancedSegments(initialVariant);

  const recoveryInitialVariant = recoveryDraft?.setVariant;
  const [variant, setVariant] = useState<WorkoutAdvancedSetVariant>(
    recoveryInitialVariant && recoveryInitialVariant !== 'STANDARD' ? recoveryInitialVariant : initialVariant,
  );
  const [segments, setSegments] = useState<WorkoutRecoverySetSegmentDraft[]>(initialSegments);
  const variantRef = useRef(variant);
  const segmentsRef = useRef(segments);
  const previousUnit = useRef(unit);
  const previousCompleted = useRef(set.completed);
  const [collapsed, setCollapsed] = useState(set.completed);
  const [validationError, setValidationError] = useState('');
  const rowBusy = busy?.targetId === set.id;

  const recoveryValue = (nextVariant: WorkoutAdvancedSetVariant, nextSegments: WorkoutRecoverySetSegmentDraft[]): WorkoutRecoverySetDraft => ({
    setType: nextVariant === 'DROP' ? 'DROP' : 'WORKING',
    weight: '',
    reps: '',
    bodyweightMode: 'BODYWEIGHT',
    setVariant: nextVariant,
    segments: nextSegments,
  });

  const updateDraft = (nextVariant: WorkoutAdvancedSetVariant, nextSegments: WorkoutRecoverySetSegmentDraft[]) => {
    variantRef.current = nextVariant;
    segmentsRef.current = nextSegments;
    setVariant(nextVariant);
    setSegments(nextSegments);
    onDraftChange?.(set.id, recoveryValue(nextVariant, nextSegments));
  };

  useEffect(() => {
    const persistedVariant = effectiveSetVariant(set);
    const recoveryVariant = recoveryDraft?.setVariant;
    const nextVariant: WorkoutAdvancedSetVariant = recoveryVariant && recoveryVariant !== 'STANDARD'
      ? recoveryVariant
      : persistedVariant === 'STANDARD' ? 'DROP' : persistedVariant;
    const nextSegments = recoveryDraft?.segments?.length
      ? recoveryDraft.segments
      : (set.segments ?? []).length
        ? (set.segments ?? []).map((segment) => ({
            weight: formatWeightInput(segment.weightKg, previousUnit.current),
            reps: segment.reps === null ? '' : String(segment.reps),
          }))
        : emptyAdvancedSegments(nextVariant);
    variantRef.current = nextVariant;
    segmentsRef.current = nextSegments;
    setVariant(nextVariant);
    setSegments(nextSegments);
    setValidationError('');
  }, [recoveryDraft, set.id, set.setType, set.setVariant, set.segments, set.completed]);

  useEffect(() => {
    if (previousCompleted.current === set.completed) return;
    setCollapsed(set.completed);
    previousCompleted.current = set.completed;
  }, [set.completed]);

  useEffect(() => {
    if (previousUnit.current === unit) return;
    const priorUnit = previousUnit.current;
    const nextSegments = segmentsRef.current.map((segment) => {
      const canonical = parseWeight(segment.weight, priorUnit);
      return {
        ...segment,
        weight: canonical === null || canonical === 'invalid' ? segment.weight : formatWeightInput(canonical, unit),
      };
    });
    previousUnit.current = unit;
    updateDraft(variantRef.current, nextSegments);
  }, [unit]);

  const buildInput = (
    completed: boolean,
    nextVariant: WorkoutAdvancedSetVariant = variantRef.current,
    nextSegments: WorkoutRecoverySetSegmentDraft[] = segmentsRef.current,
  ): WorkoutAdvancedSetInput | null => {
    const minimum = minimumAdvancedSegments(nextVariant);
    if (nextSegments.length < minimum || nextSegments.length > 8) {
      setValidationError(`${advancedVariantLabel(nextVariant)} requires ${minimum}–8 stages.`);
      return null;
    }

    const parsed = nextSegments.map((segment) => ({
      weightKg: parseWeight(segment.weight, unit),
      reps: parsePositiveInteger(segment.reps),
    }));

    if (parsed.some((segment) => segment.weightKg === 'invalid')) {
      setValidationError(`Enter a valid ${weightUnitLabel(unit)} value for every stage.`);
      return null;
    }
    if (parsed.some((segment) => segment.reps === 'invalid')) {
      setValidationError('Stage reps must be whole numbers from 1 to 999.');
      return null;
    }
    if (completed && parsed.some((segment) =>
      typeof segment.weightKg !== 'number' || typeof segment.reps !== 'number' || segment.weightKg <= 0
    )) {
      setValidationError('Enter weight and reps for every stage before completing the set.');
      return null;
    }

    setValidationError('');
    return {
      variant: nextVariant,
      segments: parsed.map((segment) => ({
        weightKg: segment.weightKg === 'invalid' ? null : segment.weightKg,
        reps: segment.reps === 'invalid' ? null : segment.reps,
      })),
      completed,
    };
  };

  const persist = async (
    completed: boolean = set.completed,
    nextVariant: WorkoutAdvancedSetVariant = variantRef.current,
    nextSegments: WorkoutRecoverySetSegmentDraft[] = segmentsRef.current,
  ) => {
    const input = buildInput(completed, nextVariant, nextSegments);
    if (!input || !setEditsEnabled) return false;
    const saved = await onSaveAdvancedSet(set.id, input);
    if (saved) onDraftPersisted?.(set.id);
    return saved;
  };

  const changeVariant = (nextVariant: WorkoutAdvancedSetVariant) => {
    let nextSegments = segmentsRef.current;
    const minimum = minimumAdvancedSegments(nextVariant);
    if (nextSegments.length < minimum) {
      nextSegments = [
        ...nextSegments,
        ...Array.from({ length: minimum - nextSegments.length }, () => ({ weight: '', reps: '' })),
      ];
    }
    updateDraft(nextVariant, nextSegments);
    void persist(set.completed, nextVariant, nextSegments);
  };

  const updateSegment = (index: number, field: 'weight' | 'reps', value: string) => {
    const nextSegments = segmentsRef.current.map((segment, segmentIndex) =>
      segmentIndex === index ? { ...segment, [field]: value } : segment,
    );
    updateDraft(variantRef.current, nextSegments);
  };

  const addSegment = () => {
    if (set.completed || segmentsRef.current.length >= 8) return;
    const nextSegments = [...segmentsRef.current, { weight: '', reps: '' }];
    updateDraft(variantRef.current, nextSegments);
    void persist(false, variantRef.current, nextSegments);
  };

  const removeSegment = (index: number) => {
    const minimum = minimumAdvancedSegments(variantRef.current);
    if (set.completed || segmentsRef.current.length <= minimum) return;
    const nextSegments = segmentsRef.current.filter((_, segmentIndex) => segmentIndex !== index);
    updateDraft(variantRef.current, nextSegments);
    void persist(false, variantRef.current, nextSegments);
  };

  const toggleCompleted = async () => {
    const saved = await persist(!set.completed);
    if (saved) setCollapsed(!set.completed);
  };

  const stageSummary = segmentsRef.current
    .map((segment) => `${segment.weight.trim() || '—'} ${weightUnitLabel(unit)} × ${segment.reps.trim() || '—'}`)
    .join(' → ');

  if (collapsed) {
    return (
      <li className={`${styles.collapsedSetRow}${set.completed ? ` ${styles.completed}` : ''}`}>
        <button
          aria-expanded="false"
          aria-label={`Expand set ${set.setNumber}`}
          className={styles.collapsedSetButton}
          onClick={() => setCollapsed(false)}
          type="button"
        >
          <span className={styles.collapsedSetSummary}>
            <strong>Set {set.setNumber} · {advancedVariantLabel(variantRef.current)}:</strong>
            <span>{stageSummary}</span>
          </span>
          <span className={styles.collapsedSetChevron} aria-hidden="true">⌄</span>
        </button>
      </li>
    );
  }

  return (
    <li className={`${styles.advancedSetRow}${set.completed ? ` ${styles.completed}` : ''}`}>
      <div className={styles.advancedSetHeading}>
        <span className={styles.setNumber}>Set {set.setNumber}</span>
        <SelectField
          className={styles.advancedVariantField}
          compact
          disabled={Boolean(rowBusy) || !setEditsEnabled || set.completed}
          label={`Set ${set.setNumber} advanced pattern`}
          labelHidden
          onChange={(event) => changeVariant(event.target.value as WorkoutAdvancedSetVariant)}
          value={variant}
        >
          <option value="DROP">Drop set</option>
          <option value="ASCENDING_PYRAMID">Ascending pyramid</option>
          <option value="FULL_PYRAMID">Full pyramid</option>
        </SelectField>
        <div className={styles.completionControls}>
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
          <button
            aria-expanded="true"
            aria-label={`Collapse set ${set.setNumber}`}
            className={styles.setCollapseButton}
            onClick={() => setCollapsed(true)}
            type="button"
          >
            <span className={styles.setNumberChevron} aria-hidden="true">⌃</span>
          </button>
        </div>
      </div>

      <ol className={styles.segmentList} aria-label={`Set ${set.setNumber} stages`}>
        {segments.map((segment, index) => (
          <li className={styles.segmentRow} key={`${set.id}-segment-${index}`}>
            <span className={styles.segmentIndex}>Stage {index + 1}</span>
            <label className={`${styles.numberField} ${styles.loadField}`}>
              <span className={styles.segmentFieldLabel}>Weight ({weightUnitLabel(unit)})</span>
              <input
                aria-label={`Set ${set.setNumber} stage ${index + 1} weight in ${weightUnitLabel(unit)}`}
                disabled={Boolean(rowBusy) || !setEditsEnabled}
                inputMode="decimal"
                min="0"
                onBlur={() => void persist()}
                onChange={(event) => updateSegment(index, 'weight', event.target.value)}
                placeholder="0"
                step="any"
                type="number"
                value={segment.weight}
              />
            </label>
            <label className={`${styles.numberField} ${styles.repsField}`}>
              <span className={styles.segmentFieldLabel}>Reps</span>
              <input
                aria-label={`Set ${set.setNumber} stage ${index + 1} reps`}
                disabled={Boolean(rowBusy) || !setEditsEnabled}
                inputMode="numeric"
                min="1"
                onBlur={() => void persist()}
                onChange={(event) => updateSegment(index, 'reps', event.target.value)}
                placeholder="0"
                step="1"
                type="number"
                value={segment.reps}
              />
            </label>
            <button
              aria-label={`Remove set ${set.setNumber} stage ${index + 1}`}
              className={styles.segmentRemoveButton}
              disabled={Boolean(rowBusy) || !setEditsEnabled || set.completed || segments.length <= minimumAdvancedSegments(variant)}
              onClick={() => removeSegment(index)}
              type="button"
            >Remove</button>
          </li>
        ))}
      </ol>

      <div className={styles.advancedSetActions}>
        <button
          disabled={Boolean(rowBusy) || !setEditsEnabled || set.completed || segments.length >= 8}
          onClick={addSegment}
          type="button"
        >+ Stage</button>
        <button aria-label={`Copy set ${set.setNumber}`} disabled={Boolean(rowBusy) || !serverMutationsEnabled} onClick={() => void onCopySet(set.id)} type="button">Copy set</button>
        <button aria-label={`Delete set ${set.setNumber}`} disabled={Boolean(rowBusy) || !serverMutationsEnabled} onClick={() => void onRemoveSet(set.id)} type="button">Delete set</button>
      </div>

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
            {props.sets.map((set) => effectiveSetVariant(set) === 'STANDARD' ? (
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
            ) : (
              <AdvancedSetRow
                busy={props.busy}
                key={set.id}
                onCopySet={props.onCopySet}
                onDraftChange={props.onDraftChange}
                onDraftPersisted={props.onDraftPersisted}
                onRemoveSet={props.onRemoveSet}
                onSaveAdvancedSet={props.onSaveAdvancedSet}
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
        {!isBodyweight && (
          <div className={styles.patternActions} aria-label="Advanced set patterns">
            <span className={styles.patternLabel}>Advanced set</span>
            <button disabled={actionsDisabled} onClick={() => void props.onAddAdvancedSet(props.exercise.id, 'DROP')} type="button">+ Drop set</button>
            <button disabled={actionsDisabled} onClick={() => void props.onAddAdvancedSet(props.exercise.id, 'ASCENDING_PYRAMID')} type="button">+ Ascending pyramid</button>
            <button disabled={actionsDisabled} onClick={() => void props.onAddAdvancedSet(props.exercise.id, 'FULL_PYRAMID')} type="button">+ Full pyramid</button>
          </div>
        )}
      </div>
    </section>
  );
}
