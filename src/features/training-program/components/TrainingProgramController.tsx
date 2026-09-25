/**
 * Maintainer boundary: authenticated Program route/controller.
 * Keep planning UI here, reusable equipment preferences in /settings/training,
 * and actual set execution in /lift. Suggested limitation exercises are review
 * candidates until the user explicitly persists an exclusion.
 */

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';
import { AppShell, type AppSection } from '../../../components/layout';
import { Button, SelectField } from '../../../components/ui';
import {
  type TrainingProgramDefinition,
  type TrainingProgramExercisePrescription,
  type TrainingProgramGoal,
} from '../../../domain/trainingProgram';
import type {
  TrainingProgramGeneratorCandidate,
} from '../../../domain/trainingProgramGenerator';
import {
  TRAINING_PROGRAM_DAYS,
  compatibleTrainingProgramSplits,
  type TrainingProgramDayOfWeek,
  type TrainingProgramDurationWeeks,
  type TrainingProgramRequestedSplit,
} from '../../../domain/trainingProgramSchedule';
import {
  findTrainingProgramSubstitution,
} from '../../../domain/trainingProgramSubstitution';
import type {
  TrainingProgramConstraintReason,
  TrainingProgramConstraintSnapshot,
  TrainingProgramExerciseConstraint,
} from '../../../domain/trainingProgramConstraints';
import {
  defaultTrainingProgramLimitationMovements,
  suggestTrainingProgramExercisesToReview,
  trainingProgramLimitationAreaOptions,
  trainingProgramLimitationContextOptions,
  trainingProgramLimitationMovementOptions,
  type TrainingProgramLimitationArea,
  type TrainingProgramLimitationContext,
  type TrainingProgramLimitationMovement,
} from '../../../domain/trainingProgramLimitations';
import {
  TRAINING_SETTINGS_PATH,
  navigateToPath,
} from '../../../lib/appNavigation';
import type { OnboardingProfile } from '../../onboarding';
import type { ExerciseProgressSummary } from '../../progress/model';
import {
  createMusclePerformanceService,
} from '../../progress/musclePerformanceService';
import {
  buildMuscleVolumeRecommendationPayloads,
} from '../../progress/muscleVolumeRecommendationModel';
import { personalizeMuscleVolumeRows } from '../../progress/personalVolumeBaseline';
import { createPersonalVolumeHistoryService } from '../../progress/personalVolumeHistoryService';
import { createExerciseProgressService } from '../../progress/progressService';
import {
  buildTrainingProgramVolumeAdjustment,
  totalTrainingProgramWorkingSets,
  type TrainingProgramVolumeAdjustment,
  type TrainingProgramVolumeGuidance,
} from '../../../domain/trainingProgramVolume';
import {
  createTrainingProgramAdaptationService,
  type TrainingProgramAdaptationResult,
} from '../trainingProgramAdaptationService';
import {
  createTrainingProgramCandidateService,
} from '../trainingProgramCandidateService';
import {
  createTrainingProgramConstraintService,
} from '../trainingProgramConstraintService';
import {
  createTrainingProgramGeneratorProfileService,
  type TrainingProgramGeneratorProfile,
} from '../trainingProgramGeneratorProfileService';
import {
  createTrainingProgramGeneratorService,
} from '../trainingProgramGeneratorService';
import {
  createTrainingProgramProductService,
  type TrainingProgramSummary,
} from '../trainingProgramProductService';
import type {
  PersistedTrainingProgram,
  PersistedTrainingProgramWorkout,
} from '../trainingProgramPersistenceService';
import { downloadTrainingProgramPdf } from '../trainingProgramPdf';
import styles from './TrainingProgramScreen.module.css';

export interface TrainingProgramControllerServices {
  product: ReturnType<typeof createTrainingProgramProductService>;
  generator: ReturnType<typeof createTrainingProgramGeneratorService>;
  profile: ReturnType<typeof createTrainingProgramGeneratorProfileService>;
  constraints: ReturnType<typeof createTrainingProgramConstraintService>;
  candidates: ReturnType<typeof createTrainingProgramCandidateService>;
  progress: ReturnType<typeof createExerciseProgressService>;
  performance: ReturnType<typeof createMusclePerformanceService>;
  personalVolume: ReturnType<typeof createPersonalVolumeHistoryService>;
  adaptation: ReturnType<typeof createTrainingProgramAdaptationService>;
}

interface TrainingProgramControllerProps {
  profile: OnboardingProfile;
  onNavigate: (section: AppSection) => void;
  onSignOut: () => void;
  services?: TrainingProgramControllerServices;
}

type LoadState = 'loading' | 'ready' | 'error';

const GOAL_LABELS: Record<TrainingProgramGoal, string> = {
  STRENGTH: 'Strength',
  HYPERTROPHY: 'Hypertrophy',
  BALANCED: 'Balanced',
};

const DAY_LABELS: Record<TrainingProgramDayOfWeek, string> = {
  MONDAY: 'Mon',
  TUESDAY: 'Tue',
  WEDNESDAY: 'Wed',
  THURSDAY: 'Thu',
  FRIDAY: 'Fri',
  SATURDAY: 'Sat',
  SUNDAY: 'Sun',
};

const EXECUTION_LABELS: Record<string, string> = {
  PLANNED: 'Planned',
  STARTED_PROGRAMMED: 'Program workout started',
  STARTED_OWN_WORKOUT: 'Own workout started',
  COMPLETED_PROGRAMMED: 'Completed',
  COMPLETED_OWN_WORKOUT: 'Own workout completed',
  MISSED: 'Missed',
};

const MUSCLE_LABELS: Record<string, string> = {
  CHEST: 'Chest',
  LATS: 'Lats',
  UPPER_BACK: 'Upper back',
  TRAPS: 'Traps',
  SPINAL_ERECTORS: 'Spinal erectors',
  ANTERIOR_DELTS: 'Front delts',
  LATERAL_DELTS: 'Side delts',
  POSTERIOR_DELTS: 'Rear delts',
  BICEPS: 'Biceps',
  TRICEPS: 'Triceps',
  QUADS: 'Quads',
  HAMSTRINGS: 'Hamstrings',
  GLUTES: 'Glutes',
  CALVES: 'Calves',
  FOREARMS_GRIP: 'Forearms & grip',
  CORE: 'Core',
  OBLIQUES: 'Obliques',
  NECK: 'Neck',
};

function localCalendarDate(timezone: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const value = Object.fromEntries(
    parts
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, part.value]),
  );
  return `${value.year}-${value.month}-${value.day}`;
}

function defaultTrainingDays(
  sessionsPerWeek: number,
): TrainingProgramDayOfWeek[] {
  const presets: Record<number, TrainingProgramDayOfWeek[]> = {
    1: ['MONDAY'],
    2: ['MONDAY', 'THURSDAY'],
    3: ['MONDAY', 'WEDNESDAY', 'FRIDAY'],
    4: ['MONDAY', 'TUESDAY', 'THURSDAY', 'FRIDAY'],
    5: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'FRIDAY', 'SATURDAY'],
    6: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'],
  };
  return presets[sessionsPerWeek] ?? ['MONDAY'];
}

const SPLIT_LABELS: Record<string, string> = {
  AUTO: 'Auto',
  FULL_BODY: 'Full Body',
  FULL_BODY_AB: 'Full Body A / B',
  UPPER_LOWER: 'Upper / Lower',
  FULL_BODY_ABC: 'Full Body A / B / C',
  PUSH_PULL_LEGS: 'Push / Pull / Legs',
  UPPER_LOWER_FULL_BODY: 'Upper / Lower / Full Body',
  UPPER_LOWER_X2: 'Upper / Lower / Upper / Lower',
  PUSH_PULL_UPPER_LOWER: 'Push / Pull / Upper / Lower',
  PPL_UPPER_LOWER: 'Push / Pull / Legs / Upper / Lower',
  UPPER_LOWER_PPL: 'Upper / Lower / Push / Pull / Legs',
  PPL_X2: 'Push / Pull / Legs / Push / Pull / Legs',
  UPPER_LOWER_X3: 'Upper / Lower / Upper / Lower / Upper / Lower',
};

function splitLabel(value: string): string {
  return SPLIT_LABELS[value]
    ?? value.replaceAll('_', ' ').replace(/\b\w/g, (x) => x.toUpperCase());
}

function startDateAllowed(value: string, timezone: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value)
    && value >= localCalendarDate(timezone);
}

function dateLabel(value: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${value}T12:00:00Z`));
}

function formatTarget(exercise: TrainingProgramExercisePrescription): string {
  const setRep = `${exercise.workingSets} × ${exercise.repsMin}-${exercise.repsMax}`;
  if (exercise.targetWeightKg !== null) {
    return `${setRep} · ${Math.round(exercise.targetWeightKg * 10) / 10} kg`;
  }
  if (exercise.bodyweightMode === 'ADDED_WEIGHT') return `${setRep} · added weight`;
  if (exercise.bodyweightMode === 'ASSISTED') return `${setRep} · assisted`;
  return setRep;
}

function preferredProgram(
  summaries: TrainingProgramSummary[],
): TrainingProgramSummary | null {
  return summaries.find((item) => item.status === 'ACTIVE')
    ?? summaries.find((item) => item.status === 'DRAFT')
    ?? summaries.find((item) => item.status === 'COMPLETED')
    ?? summaries[0]
    ?? null;
}

function isTerminal(workout: PersistedTrainingProgramWorkout): boolean {
  return workout.executionStatus === 'COMPLETED_PROGRAMMED'
    || workout.executionStatus === 'COMPLETED_OWN_WORKOUT'
    || workout.executionStatus === 'MISSED';
}

function canStart(workout: PersistedTrainingProgramWorkout): boolean {
  return workout.executionStatus === 'PLANNED'
    || workout.executionStatus === 'MISSED';
}

function adaptationMessage(result: TrainingProgramAdaptationResult): string {
  if (result.alreadyApplied) {
    return result.outcome === 'APPLIED'
      ? 'This workout was already reviewed and its supported progression is already in the future plan.'
      : 'This workout was already reviewed. No supported future-plan change was found.';
  }

  if (result.outcome === 'NO_CHANGE') {
    return 'Workout reviewed. The completed evidence did not support a future-plan change.';
  }

  return `${result.changeCount ?? 0} future prescription ${
    result.changeCount === 1 ? 'change was' : 'changes were'
  } applied.`;
}

export function TrainingProgramController({
  profile,
  onNavigate,
  onSignOut,
  services: injectedServices,
}: TrainingProgramControllerProps) {
  const services = useMemo<TrainingProgramControllerServices>(
    () => injectedServices ?? ({
      product: createTrainingProgramProductService(),
      generator: createTrainingProgramGeneratorService(),
      profile: createTrainingProgramGeneratorProfileService(),
      constraints: createTrainingProgramConstraintService(),
      candidates: createTrainingProgramCandidateService(),
      progress: createExerciseProgressService(),
      performance: createMusclePerformanceService(),
      personalVolume: createPersonalVolumeHistoryService(),
      adaptation: createTrainingProgramAdaptationService(),
    }),
    [injectedServices],
  );

  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState('');
  const [summaries, setSummaries] = useState<TrainingProgramSummary[]>([]);
  const [program, setProgram] = useState<PersistedTrainingProgram | null>(null);
  const [programProfile, setProgramProfile] =
    useState<TrainingProgramGeneratorProfile | null>(null);
  const [constraints, setConstraints] =
    useState<TrainingProgramConstraintSnapshot | null>(null);
  const [candidates, setCandidates] =
    useState<TrainingProgramGeneratorCandidate[]>([]);
  const [history, setHistory] = useState<ExerciseProgressSummary[]>([]);
  const [preview, setPreview] = useState<TrainingProgramDefinition | null>(null);
  const [volumeGuidance, setVolumeGuidance] =
    useState<TrainingProgramVolumeGuidance[]>([]);
  const [pendingVolume, setPendingVolume] = useState<{
    workoutId: string;
    workoutTitle: string;
    workoutRevision: number;
    adjustment: TrainingProgramVolumeAdjustment;
  } | null>(null);

  const [goal, setGoal] = useState<TrainingProgramGoal>('BALANCED');
  const [sessionsPerWeek, setSessionsPerWeek] = useState(3);
  const [durationWeeks, setDurationWeeks] =
    useState<TrainingProgramDurationWeeks>(4);
  const [startDate, setStartDate] = useState(
    () => localCalendarDate(profile.timezone),
  );
  const [trainingDays, setTrainingDays] = useState<TrainingProgramDayOfWeek[]>(
    () => defaultTrainingDays(3),
  );
  const [requestedSplit, setRequestedSplit] =
    useState<TrainingProgramRequestedSplit>('AUTO');
  const [constraintSearch, setConstraintSearch] = useState('');
  const [limitationSearch, setLimitationSearch] = useState('');

  const load = useCallback(async () => {
    setLoadState('loading');
    setError('');
    try {
      const [
        nextProfile,
        nextConstraints,
        nextCandidates,
        nextHistory,
        nextSummaries,
        nextVolumeRows,
        nextPerformance,
        nextPersonalVolumeHistory,
      ] = await Promise.all([
        services.profile.load(profile.id),
        services.constraints.load(),
        services.candidates.load(),
        services.progress.listOverview(),
        services.product.list(),
        services.progress.loadMuscleVolume(
          localCalendarDate(profile.timezone),
        ),
        services.performance.loadObservations(
          localCalendarDate(profile.timezone),
          126,
        ),
        services.personalVolume.load(
          localCalendarDate(profile.timezone),
          126,
        ),
      ]);

      setProgramProfile(nextProfile);
      setConstraints(nextConstraints);
      setCandidates(nextCandidates);
      setHistory(nextHistory);
      setSummaries(nextSummaries);
      const personalizedVolume = personalizeMuscleVolumeRows(
        nextVolumeRows,
        nextPersonalVolumeHistory,
        nextPerformance,
      );
      setVolumeGuidance(
        buildMuscleVolumeRecommendationPayloads(
          personalizedVolume.rows,
          nextPerformance,
        )
          .filter((payload) => payload.windowDays === 7)
          .flatMap((payload) => {
            if (!(payload.muscleGroup in MUSCLE_LABELS)) return [];

            return [{
              muscleGroup:
                payload.muscleGroup as TrainingProgramVolumeGuidance['muscleGroup'],
              action: payload.recommendation.action,
              effectiveSets:
                payload.recommendation.volumeAssessment.effectiveSets,
              targetMin:
                payload.recommendation.volumeAssessment.targetMin,
              targetMax:
                payload.recommendation.volumeAssessment.targetMax,
              highReviewAbove:
                payload.recommendation.volumeAssessment.highReviewAbove,
              volumeEvidenceLimited:
                payload.recommendation.volumeAssessment.volumeEvidenceLimited,
              performanceTrend: payload.performance.trend,
            }];
          }),
      );

      if (nextProfile?.goal) setGoal(nextProfile.goal);
      if (nextProfile?.sessionsPerWeek) {
        setSessionsPerWeek(nextProfile.sessionsPerWeek);
        setTrainingDays((current) =>
          current.length === nextProfile.sessionsPerWeek
            ? current
            : defaultTrainingDays(nextProfile.sessionsPerWeek!),
        );
      }

      const preferred = preferredProgram(nextSummaries);
      setProgram(preferred ? await services.product.load(preferred.id) : null);
      setLoadState('ready');
    } catch (caught) {
      setError(
        caught instanceof Error && caught.message.trim()
          ? caught.message
          : 'Unable to load personalized programs.',
      );
      setLoadState('error');
    }
  }, [profile.id, services]);

  useEffect(() => {
    void load();
  }, [load]);

  const refreshProgram = async (programId = program?.id) => {
    const nextSummaries = await services.product.list();
    setSummaries(nextSummaries);
    const id = programId ?? preferredProgram(nextSummaries)?.id;
    setProgram(id ? await services.product.load(id) : null);
  };

  const run = async (key: string, action: () => Promise<void>) => {
    setBusy(key);
    setError('');
    setNotice('');
    try {
      await action();
    } catch (caught) {
      setError(
        caught instanceof Error && caught.message.trim()
          ? caught.message
          : 'Unable to update the training program.',
      );
    } finally {
      setBusy('');
    }
  };

  const changeFrequency = (value: number) => {
    setSessionsPerWeek(value);
    setTrainingDays(defaultTrainingDays(value));
    setRequestedSplit('AUTO');
    setPreview(null);
  };

  const toggleDay = (day: TrainingProgramDayOfWeek) => {
    setTrainingDays((current) => {
      if (current.includes(day)) return current.filter((item) => item !== day);
      if (current.length >= sessionsPerWeek) return current;
      return [...current, day].sort(
        (left, right) =>
          TRAINING_PROGRAM_DAYS.indexOf(left)
          - TRAINING_PROGRAM_DAYS.indexOf(right),
      );
    });
    setPreview(null);
  };

  const generate = () => run('generate', async () => {
    if (!programProfile) {
      throw new Error(
        'Set your equipment access in Settings before generating a program.',
      );
    }
    if (trainingDays.length !== sessionsPerWeek) {
      throw new Error(`Select exactly ${sessionsPerWeek} training days.`);
    }
    if (!startDateAllowed(startDate, profile.timezone)) {
      throw new Error('Program start date cannot be in the past.');
    }

    if (
      programProfile.goal !== goal
      || programProfile.sessionsPerWeek !== sessionsPerWeek
    ) {
      const nextProfile = await services.profile.updatePreferences({
        goal,
        sessionsPerWeek,
        expectedRevision: programProfile.revision,
      });
      setProgramProfile(nextProfile);
    }

    const generated = await services.generator.generate({
      userId: profile.id,
      durationWeeks,
      startDate,
      trainingDays,
      requestedSplit,
      generatedAt: new Date().toISOString(),
      historyThroughDate: localCalendarDate(profile.timezone),
    });

    setPreview(generated);
    setNotice(
      `Generated ${generated.workouts.length} planned workouts. Review the preview before saving it.`,
    );
  });

  const savePreview = () => run('save-preview', async () => {
    if (!preview) return;
    const id = await services.product.create(preview);
    await refreshProgram(id);
    setPreview(null);
    setNotice('Program saved as a draft.');
  });

  const activate = () => run('activate', async () => {
    if (!program) return;
    const otherActive = summaries.find(
      (item) => item.status === 'ACTIVE' && item.id !== program.id,
    );
    if (otherActive) {
      throw new Error(
        'Archive or complete your current active program before activating this draft.',
      );
    }
    await services.product.setStatus(program.id, 'ACTIVE', program.revision);
    await refreshProgram(program.id);
    setNotice('Program is active.');
  });

  const complete = () => run('complete', async () => {
    if (!program) return;
    if (!program.workouts.every(isTerminal)) {
      throw new Error(
        'Finish or mark each planned workout missed before completing the program.',
      );
    }
    await services.product.setStatus(
      program.id,
      'COMPLETED',
      program.revision,
    );
    await refreshProgram(program.id);
    setNotice('Program marked complete.');
  });

  const archive = () => run('archive', async () => {
    if (!program) return;
    await services.product.setStatus(program.id, 'ARCHIVED', program.revision);
    await refreshProgram(program.id);
    setNotice('Program archived.');
  });

  const launch = (workout: PersistedTrainingProgramWorkout) =>
    run(`launch:${workout.id}`, async () => {
      await services.product.launchProgrammedWorkout(
        workout.id,
        new Date().toISOString(),
      );
      navigateToPath('/lift');
    });

  const launchOwn = (workout: PersistedTrainingProgramWorkout) =>
    run(`own:${workout.id}`, async () => {
      await services.product.launchOwnWorkout(
        workout.id,
        new Date().toISOString(),
      );
      navigateToPath('/lift');
    });

  const markMissed = (workout: PersistedTrainingProgramWorkout) =>
    run(`miss:${workout.id}`, async () => {
      await services.product.markMissed(workout.id);
      await refreshProgram(program?.id);
      setNotice(`${workout.title} marked missed. No XP penalty was created.`);
    });

  const adapt = (workout: PersistedTrainingProgramWorkout) =>
    run(`adapt:${workout.id}`, async () => {
      if (!program) return;
      const result = await services.adaptation.adapt(program.id, workout.id);
      await refreshProgram(program.id);
      setNotice(adaptationMessage(result));
    });

  const swap = (
    workout: PersistedTrainingProgramWorkout,
    exercise: TrainingProgramExercisePrescription,
  ) => run(`swap:${workout.id}:${exercise.exerciseId}`, async () => {
    if (!program || !constraints || !programProfile) return;

    const replacement = findTrainingProgramSubstitution({
      original: exercise,
      profile: {
        goal: program.definition.goal,
        sessionsPerWeek: program.definition.sessionsPerWeek,
        accessMode: programProfile.accessMode,
        equipmentKeys: programProfile.equipmentKeys,
        revision: programProfile.revision,
      },
      constraints,
      candidates,
      history: history.map((entry) => ({
        exerciseId: entry.exerciseId,
        metricType: entry.metricType,
        bestValue: entry.bestValue,
        referenceWeightKg: entry.bestWeightKg,
        referenceReps: entry.bestReps,
        sessionCount: entry.sessionCount,
        observationCount: entry.observationCount,
        achievedAt: entry.achievedAt,
        lastPerformedAt: entry.lastPerformedAt,
      })),
      occupiedExerciseIds: workout.exercises
        .filter((item) => item.exerciseId !== exercise.exerciseId)
        .map((item) => item.exerciseId),
    });

    if (!replacement) {
      throw new Error(
        'No compatible replacement satisfies the current equipment, exclusions, and program intent.',
      );
    }

    const row = await (
      await import('../../../lib/supabase')
    ).getSupabaseClient()
      .from('training_program_exercises')
      .select('id')
      .eq('program_workout_id', workout.id)
      .eq('exercise_id', exercise.exerciseId)
      .single();

    if (row.error) throw row.error;
    const programExerciseId = (row.data as { id?: unknown } | null)?.id;
    if (typeof programExerciseId !== 'string' || !programExerciseId) {
      throw new Error('Unable to resolve the planned exercise row.');
    }

    await services.product.replaceExercise({
      programExerciseId,
      replacementExerciseId: replacement.replacement.exerciseId,
      expectedProgramRevision: program.revision,
      expectedConstraintRevision: constraints.revision,
      targetWeightKg: replacement.replacement.targetWeightKg,
    });

    await refreshProgram(program.id);
    setNotice(
      `${exercise.canonicalName} replaced with ${replacement.replacement.canonicalName}.`,
    );
  });

  const persistVolumeAdjustment = (
    workout: PersistedTrainingProgramWorkout,
    adjustment: TrainingProgramVolumeAdjustment,
  ) => run(`volume:${workout.id}`, async () => {
    if (!program) return;
    await services.product.updateWorkoutVolume({
      programWorkoutId: workout.id,
      expectedProgramRevision: program.revision,
      expectedWorkoutRevision: workout.revision,
      overrides: adjustment.overrides,
    });
    await refreshProgram(program.id);
    setPendingVolume(null);
    setNotice(
      `${workout.title} now has ${adjustment.nextTotalWorkingSets} planned working sets.`,
    );
  });

  const adjustVolume = (
    workout: PersistedTrainingProgramWorkout,
    direction: 'ADD' | 'REMOVE',
  ) => {
    if (!program) return;

    const adjustment = buildTrainingProgramVolumeAdjustment({
      exercises: workout.exercises,
      candidates,
      guidance: volumeGuidance,
      direction,
    });

    if (!adjustment) {
      setNotice(
        direction === 'ADD'
          ? 'Every exercise in this workout is already at the eight-set planning limit.'
          : 'Every exercise in this workout is already at the one-set planning floor.',
      );
      return;
    }

    if (adjustment.warnings.length > 0) {
      setPendingVolume({
        workoutId: workout.id,
        workoutTitle: workout.title,
        workoutRevision: workout.revision,
        adjustment,
      });
      return;
    }

    void persistVolumeAdjustment(workout, adjustment);
  };

  const confirmPendingVolume = () => {
    if (!pendingVolume || !program) return;
    const workout = program.workouts.find(
      (item) => item.id === pendingVolume.workoutId,
    );
    if (!workout || workout.revision !== pendingVolume.workoutRevision) {
      setPendingVolume(null);
      setError(
        'The planned workout changed. Reload and try the volume edit again.',
      );
      return;
    }
    void persistVolumeAdjustment(workout, pendingVolume.adjustment);
  };

  const restoreRecommendedVolume = (
    workout: PersistedTrainingProgramWorkout,
  ) => run(`volume-restore:${workout.id}`, async () => {
    if (!program) return;
    const result = await services.product.updateWorkoutVolume({
      programWorkoutId: workout.id,
      expectedProgramRevision: program.revision,
      expectedWorkoutRevision: workout.revision,
      restoreRecommended: true,
    });
    await refreshProgram(program.id);
    setPendingVolume(null);
    setNotice(
      result.changed
        ? `${workout.title} restored to ${result.afterTotalWorkingSets} recommended working sets.`
        : `${workout.title} is already using the current recommended volume.`,
    );
  });

  const updateConstraint = (
    exerciseId: string,
    kind: 'EXCLUDE' | 'PREFER' | null,
    reason: TrainingProgramConstraintReason = 'PREFERENCE',
  ) => run(`constraint:${exerciseId}`, async () => {
    if (!constraints) return;
    const others = constraints.entries.filter(
      (entry) => entry.exerciseId !== exerciseId,
    );
    const entries: TrainingProgramExerciseConstraint[] = kind
      ? [...others, { exerciseId, kind, reason }]
      : others;

    const next = await services.constraints.replace({
      entries,
      expectedRevision: constraints.revision,
    });
    setConstraints(next);
    setNotice(kind === null
      ? 'Exercise constraint removed.'
      : kind === 'PREFER'
        ? 'Exercise marked preferred.'
        : reason === 'PHYSICAL_LIMITATION'
          ? 'Exercise added to Injuries & limitations and excluded from program selection.'
          : 'Exercise excluded from future program selection.');
  });

  const applySuggestedLimitations = (
    exerciseIds: readonly string[],
  ) => run('limitations:apply', async () => {
    if (!constraints || exerciseIds.length === 0) return;

    const byExercise = new Map(
      constraints.entries.map((entry) => [entry.exerciseId, entry]),
    );
    for (const exerciseId of new Set(exerciseIds)) {
      byExercise.set(exerciseId, {
        exerciseId,
        kind: 'EXCLUDE',
        reason: 'PHYSICAL_LIMITATION',
      });
    }

    const next = await services.constraints.replace({
      entries: [...byExercise.values()],
      expectedRevision: constraints.revision,
    });
    setConstraints(next);
    setNotice(
      `Saved ${exerciseIds.length} suggested exercise ${
        exerciseIds.length === 1 ? 'exclusion' : 'exclusions'
      } for your physical limitation.`,
    );
  });

  const downloadPdf = () => run('pdf', async () => {
    if (!program) return;
    await downloadTrainingProgramPdf(program, profile.displayName);
  });

  const createAnother = () => {
    setProgram(null);
    setPreview(null);
    setNotice('');
    setError('');
  };

  const loadSelectedProgram = (id: string) =>
    run(`load:${id}`, async () => {
      if (!id) {
        setProgram(null);
        setPreview(null);
        return;
      }
      setProgram(await services.product.load(id));
      setPreview(null);
    });

  const matchingCandidates = useMemo(() => {
    const query = constraintSearch.trim().toLocaleLowerCase('en-CA');
    if (!query) return [];
    return candidates
      .filter((candidate) =>
        candidate.canonicalName.toLocaleLowerCase('en-CA').includes(query))
      .slice(0, 12);
  }, [candidates, constraintSearch]);

  const matchingLimitationCandidates = useMemo(() => {
    const query = limitationSearch.trim().toLocaleLowerCase('en-CA');
    if (!query) return [];
    return candidates
      .filter((candidate) =>
        candidate.canonicalName.toLocaleLowerCase('en-CA').includes(query))
      .slice(0, 12);
  }, [candidates, limitationSearch]);

  if (loadState === 'loading') {
    return (
      <ProgramShell
        onNavigate={onNavigate}
        onSignOut={onSignOut}
        profile={profile}
      >
        <div className={styles.state} role="status">
          Loading personalized programs…
        </div>
      </ProgramShell>
    );
  }

  if (loadState === 'error') {
    return (
      <ProgramShell
        onNavigate={onNavigate}
        onSignOut={onSignOut}
        profile={profile}
      >
        <div className={styles.state}>
          <strong>Programs unavailable</strong>
          <p>{error}</p>
          <Button onClick={() => void load()}>Try again</Button>
        </div>
      </ProgramShell>
    );
  }

  return (
    <ProgramShell
      onNavigate={onNavigate}
      onSignOut={onSignOut}
      profile={profile}
    >
      <div className={styles.page} data-training-program-page>
        <header className={styles.header}>
          <div>
            <p className={styles.kicker}>PERSONALIZED PROGRAM</p>
            <h1>{program ? 'Your training block' : 'Build your training block'}</h1>
            <p>
              Structured around your goal, schedule, equipment, history, and
              current training-volume signals. The normal workout log stays
              authoritative.
            </p>
          </div>
          <div className={styles.headerActions}>
            {program ? (
              <>
                <Button
                  disabled={busy === 'pdf'}
                  onClick={() => void downloadPdf()}
                  variant="secondary"
                >
                  {busy === 'pdf' ? 'Building PDF…' : 'Download PDF'}
                </Button>
                <Button onClick={createAnother} variant="ghost">
                  New program
                </Button>
              </>
            ) : (
              <Button
                onClick={() => navigateToPath(TRAINING_SETTINGS_PATH)}
                variant="secondary"
              >
                Equipment settings
              </Button>
            )}
          </div>
        </header>

        {error ? <p className={styles.error} role="alert">{error}</p> : null}
        {notice ? <p className={styles.notice} role="status">{notice}</p> : null}

        {summaries.length > 0 ? (
          <div className={styles.programSwitcher}>
            <SelectField
              className={styles.programSwitcherSelect}
              compact
              label="Saved programs"
              onChange={(event) =>
                void loadSelectedProgram(event.target.value)
              }
              value={program?.id ?? ''}
            >
              <option value="">New program</option>
              {summaries.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.status.charAt(0)
                    + item.status.slice(1).toLocaleLowerCase('en-CA')}
                  {' · '}
                  {item.durationWeeks} weeks
                  {' · '}
                  {dateLabel(item.startDate)}
                </option>
              ))}
            </SelectField>
          </div>
        ) : null}

        <ProgramInputSummary
          constraints={constraints}
          historyCount={history.length}
          programProfile={programProfile}
        />

        {!program ? (
          <>
            <ProgramBuilder
              busy={busy}
              durationWeeks={durationWeeks}
              goal={goal}
              onDurationWeeks={setDurationWeeks}
              onGenerate={() => void generate()}
              onGoal={(value) => {
                setGoal(value);
                setPreview(null);
              }}
              onRequestedSplit={(value) => {
                setRequestedSplit(value);
                setPreview(null);
              }}
              onSessionsPerWeek={changeFrequency}
              minimumStartDate={localCalendarDate(profile.timezone)}
              onStartDate={(value) => {
                setStartDate(value);
                setPreview(null);
              }}
              onToggleDay={toggleDay}
              preview={preview}
              programProfile={programProfile}
              requestedSplit={requestedSplit}
              sessionsPerWeek={sessionsPerWeek}
              startDate={startDate}
              trainingDays={trainingDays}
            />

            <LimitationsEditor
              allCandidates={candidates}
              busy={busy}
              candidates={matchingLimitationCandidates}
              constraints={constraints}
              onApplySuggested={applySuggestedLimitations}
              onSearch={setLimitationSearch}
              onUpdate={updateConstraint}
              search={limitationSearch}
            />

            {preview ? (
              <ProgramPreview
                onSave={() => void savePreview()}
                preview={preview}
                saving={busy === 'save-preview'}
              />
            ) : null}

            <ConstraintEditor
              allCandidates={candidates}
              busy={busy}
              candidates={matchingCandidates}
              constraints={constraints}
              onSearch={setConstraintSearch}
              onUpdate={updateConstraint}
              search={constraintSearch}
            />
          </>
        ) : (
          <>
            <ProgramOverview
              busy={busy}
              constraints={constraints}
              onActivate={() => void activate()}
              onAdapt={(workout) => void adapt(workout)}
              onArchive={() => void archive()}
              onComplete={() => void complete()}
              onLaunch={(workout) => void launch(workout)}
              onLaunchOwn={(workout) => void launchOwn(workout)}
              onMarkMissed={(workout) => void markMissed(workout)}
              onSwap={(workout, exercise) => void swap(workout, exercise)}
              onAdjustVolume={adjustVolume}
              onRestoreRecommendedVolume={(workout) =>
                void restoreRecommendedVolume(workout)}
              pendingVolume={pendingVolume}
              onConfirmPendingVolume={confirmPendingVolume}
              onCancelPendingVolume={() => setPendingVolume(null)}
              program={program}
            />

            <LimitationsEditor
              allCandidates={candidates}
              busy={busy}
              candidates={matchingLimitationCandidates}
              constraints={constraints}
              onApplySuggested={applySuggestedLimitations}
              onSearch={setLimitationSearch}
              onUpdate={updateConstraint}
              search={limitationSearch}
            />

            <ConstraintEditor
              allCandidates={candidates}
              busy={busy}
              candidates={matchingCandidates}
              constraints={constraints}
              onSearch={setConstraintSearch}
              onUpdate={updateConstraint}
              search={constraintSearch}
            />
          </>
        )}
      </div>
    </ProgramShell>
  );
}

function ProgramShell({
  children,
  profile,
  onNavigate,
  onSignOut,
}: PropsWithChildren<{
  profile: OnboardingProfile;
  onNavigate: (section: AppSection) => void;
  onSignOut: () => void;
}>) {
  return (
    <AppShell
      activeItem="workouts"
      mobileTitle="Program"
      onNavigate={onNavigate}
      onSignOut={onSignOut}
      userLabel={profile.displayName}
      userMeta={`@${profile.username}`}
    >
      {children}
    </AppShell>
  );
}

function ProgramInputSummary({
  constraints,
  historyCount,
  programProfile,
}: {
  constraints: TrainingProgramConstraintSnapshot | null;
  historyCount: number;
  programProfile: TrainingProgramGeneratorProfile | null;
}) {
  const entries = constraints?.entries ?? [];
  const limitationCount = entries.filter(
    (entry) => entry.kind === 'EXCLUDE'
      && entry.reason === 'PHYSICAL_LIMITATION',
  ).length;
  const preferenceCount = entries.filter(
    (entry) => entry.kind === 'PREFER',
  ).length;
  const exclusionCount = entries.filter(
    (entry) => entry.kind === 'EXCLUDE'
      && entry.reason !== 'PHYSICAL_LIMITATION',
  ).length;

  const equipmentLabel = !programProfile
    ? 'Not configured'
    : programProfile.accessMode === 'COMMERCIAL_GYM'
      ? 'Commercial gym'
      : programProfile.equipmentKeys.length === 0
        ? 'Bodyweight only'
        : String(programProfile.equipmentKeys.length) + ' selected';

  const scrollToLimitations = () => {
    document
      .getElementById('program-limitations-heading')
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <section
      className={styles.inputsSummary}
      aria-labelledby="program-inputs-heading"
    >
      <div className={styles.sectionHeading}>
        <div>
          <span>Program inputs</span>
          <h2 id="program-inputs-heading">What Top Set will use</h2>
        </div>
        <p>
          Review these inputs before generation. Equipment and exclusions are
          hard constraints; preferences remain ranking hints.
        </p>
      </div>

      <div className={styles.inputGrid}>
        <div className={styles.inputItem}>
          <span>Equipment</span>
          <strong>{equipmentLabel}</strong>
          <button
            onClick={() => navigateToPath(TRAINING_SETTINGS_PATH)}
            type="button"
          >
            Edit training preferences
          </button>
        </div>

        <div className={styles.inputItem}>
          <span>Injuries & limitations</span>
          <strong>
            {limitationCount} {limitationCount === 1 ? 'exercise' : 'exercises'} avoided
          </strong>
          <button onClick={scrollToLimitations} type="button">
            Manage limitations
          </button>
        </div>

        <div className={styles.inputItem}>
          <span>Exercise choices</span>
          <strong>
            {preferenceCount} preferred · {exclusionCount} excluded
          </strong>
          <small>Preferences do not override hard exclusions.</small>
        </div>

        <div className={styles.inputItem}>
          <span>Training history</span>
          <strong>
            {historyCount > 0
              ? String(historyCount) + ' tracked exercise'
                + (historyCount === 1 ? '' : 's')
              : 'Building your baseline'}
          </strong>
          <small>
            Personal volume targets become more individualized as comparable
            history accumulates.
          </small>
        </div>
      </div>
    </section>
  );
}

function ProgramBuilder({
  busy,
  durationWeeks,
  goal,
  onDurationWeeks,
  onGenerate,
  onGoal,
  onRequestedSplit,
  onSessionsPerWeek,
  minimumStartDate,
  onStartDate,
  onToggleDay,
  preview,
  programProfile,
  requestedSplit,
  sessionsPerWeek,
  startDate,
  trainingDays,
}: {
  busy: string;
  durationWeeks: TrainingProgramDurationWeeks;
  goal: TrainingProgramGoal;
  onDurationWeeks: (value: TrainingProgramDurationWeeks) => void;
  onGenerate: () => void;
  onGoal: (value: TrainingProgramGoal) => void;
  onRequestedSplit: (value: TrainingProgramRequestedSplit) => void;
  onSessionsPerWeek: (value: number) => void;
  minimumStartDate: string;
  onStartDate: (value: string) => void;
  onToggleDay: (value: TrainingProgramDayOfWeek) => void;
  preview: TrainingProgramDefinition | null;
  programProfile: TrainingProgramGeneratorProfile | null;
  requestedSplit: TrainingProgramRequestedSplit;
  sessionsPerWeek: number;
  startDate: string;
  trainingDays: TrainingProgramDayOfWeek[];
}) {
  const splits = compatibleTrainingProgramSplits(sessionsPerWeek);

  return (
    <section className={styles.builder} aria-labelledby="program-builder-heading">
      <div className={styles.sectionHeading}>
        <div>
          <span>Setup</span>
          <h2 id="program-builder-heading">Program configuration</h2>
        </div>
        <p>
          The generator is deterministic. Same inputs and evidence produce the
          same program rather than random swaps.
        </p>
      </div>

      {!programProfile ? (
        <div className={styles.setupRequired}>
          <strong>Equipment access is not configured yet.</strong>
          <p>
            Open Settings → Training and tell Top Set what equipment is actually
            available before generating a program.
          </p>
          <Button onClick={() => navigateToPath(TRAINING_SETTINGS_PATH)}>
            Open training settings
          </Button>
        </div>
      ) : (
        <>
          <div className={styles.configGrid}>
            <SelectField
              label="Goal"
              onChange={(event) =>
                onGoal(event.target.value as TrainingProgramGoal)}
              value={goal}
            >
              <option value="BALANCED">Balanced</option>
              <option value="HYPERTROPHY">Hypertrophy</option>
              <option value="STRENGTH">Strength</option>
            </SelectField>

            <SelectField
              label="Sessions per week"
              onChange={(event) => onSessionsPerWeek(Number(event.target.value))}
              value={String(sessionsPerWeek)}
            >
              {[1, 2, 3, 4, 5, 6].map((value) => (
                <option key={value} value={value}>{value}</option>
              ))}
            </SelectField>

            <SelectField
              label="Program length"
              onChange={(event) =>
                onDurationWeeks(Number(event.target.value) as 4 | 8)}
              value={String(durationWeeks)}
            >
              <option value="4">4 weeks</option>
              <option value="8">8 weeks</option>
            </SelectField>

            <label className={styles.nativeField}>
              <span>Start date</span>
              <input
                aria-invalid={startDate < minimumStartDate ? 'true' : undefined}
                min={minimumStartDate}
                onChange={(event) => onStartDate(event.target.value)}
                type="date"
                value={startDate}
              />
              {startDate < minimumStartDate ? (
                <small className={styles.fieldError}>
                  Start date cannot be in the past.
                </small>
              ) : null}
            </label>

            <SelectField
              label="Split"
              onChange={(event) =>
                onRequestedSplit(
                  event.target.value as TrainingProgramRequestedSplit,
                )}
              value={requestedSplit}
            >
              <option value="AUTO">Auto</option>
              {splits.map((split) => (
                <option key={split} value={split}>
                  {splitLabel(split)}
                </option>
              ))}
            </SelectField>

            <div className={styles.accessReadout}>
              <span>Equipment</span>
              <strong>
                {programProfile.accessMode === 'COMMERCIAL_GYM'
                  ? 'Commercial gym'
                  : `${programProfile.equipmentKeys.length} selected`}
              </strong>
              <button
                onClick={() => navigateToPath(TRAINING_SETTINGS_PATH)}
                type="button"
              >
                Edit
              </button>
            </div>
          </div>

          <fieldset className={styles.days}>
            <legend>Training days · select exactly {sessionsPerWeek}</legend>
            <div>
              {TRAINING_PROGRAM_DAYS.map((day) => (
                <button
                  aria-pressed={trainingDays.includes(day)}
                  key={day}
                  onClick={() => onToggleDay(day)}
                  type="button"
                >
                  {DAY_LABELS[day]}
                </button>
              ))}
            </div>
          </fieldset>

          <div className={styles.builderActions}>
            <Button
              disabled={
                busy === 'generate'
                || trainingDays.length !== sessionsPerWeek
                || startDate < minimumStartDate
              }
              onClick={onGenerate}
            >
              {busy === 'generate'
                ? 'Generating…'
                : preview
                  ? 'Regenerate preview'
                  : 'Generate preview'}
            </Button>
            <span>
              Generation uses your established exercise history and current
              Phase 19 volume/performance signals when evidence exists.
            </span>
          </div>
        </>
      )}
    </section>
  );
}

function ProgramPreview({
  preview,
  onSave,
  saving,
}: {
  preview: TrainingProgramDefinition;
  onSave: () => void;
  saving: boolean;
}) {
  const weeks = Array.from(
    new Set(preview.workouts.map((workout) => workout.weekIndex)),
  );

  return (
    <section className={styles.preview} aria-labelledby="program-preview-heading">
      <div className={styles.sectionHeading}>
        <div>
          <span>Review</span>
          <h2 id="program-preview-heading">Generated preview</h2>
        </div>
        <Button disabled={saving} onClick={onSave}>
          {saving ? 'Saving…' : 'Save draft'}
        </Button>
      </div>

      <div className={styles.previewMeta}>
        <strong>{GOAL_LABELS[preview.goal]}</strong>
        <span>{preview.weeks} weeks</span>
        <span>{preview.sessionsPerWeek} sessions/week</span>
        <span>{splitLabel(preview.source.resolvedSplit)}</span>
      </div>

      {weeks.map((week) => (
        <div className={styles.weekPreview} key={week}>
          <h3>Week {week + 1}</h3>
          <div>
            {preview.workouts
              .filter((workout) => workout.weekIndex === week)
              .map((workout) => (
                <article key={`${workout.weekIndex}:${workout.sessionIndex}`}>
                  <header>
                    <strong>{workout.title}</strong>
                    <time>{dateLabel(workout.scheduledDate)}</time>
                  </header>
                  <ol>
                    {workout.exercises.map((exercise) => (
                      <li key={exercise.exerciseId}>
                        <span>{exercise.canonicalName}</span>
                        <small>{formatTarget(exercise)}</small>
                      </li>
                    ))}
                  </ol>
                </article>
              ))}
          </div>
        </div>
      ))}
    </section>
  );
}

function ProgramOverview({
  busy,
  constraints,
  onActivate,
  onAdapt,
  onArchive,
  onComplete,
  onLaunch,
  onLaunchOwn,
  onMarkMissed,
  onSwap,
  onAdjustVolume,
  onRestoreRecommendedVolume,
  pendingVolume,
  onConfirmPendingVolume,
  onCancelPendingVolume,
  program,
}: {
  busy: string;
  constraints: TrainingProgramConstraintSnapshot | null;
  onActivate: () => void;
  onAdapt: (workout: PersistedTrainingProgramWorkout) => void;
  onArchive: () => void;
  onComplete: () => void;
  onLaunch: (workout: PersistedTrainingProgramWorkout) => void;
  onLaunchOwn: (workout: PersistedTrainingProgramWorkout) => void;
  onMarkMissed: (workout: PersistedTrainingProgramWorkout) => void;
  onSwap: (
    workout: PersistedTrainingProgramWorkout,
    exercise: TrainingProgramExercisePrescription,
  ) => void;
  onAdjustVolume: (
    workout: PersistedTrainingProgramWorkout,
    direction: 'ADD' | 'REMOVE',
  ) => void;
  onRestoreRecommendedVolume: (
    workout: PersistedTrainingProgramWorkout,
  ) => void;
  pendingVolume: {
    workoutId: string;
    workoutTitle: string;
    workoutRevision: number;
    adjustment: TrainingProgramVolumeAdjustment;
  } | null;
  onConfirmPendingVolume: () => void;
  onCancelPendingVolume: () => void;
  program: PersistedTrainingProgram;
}) {
  const excluded = new Set(
    constraints?.entries
      .filter((entry) => entry.kind === 'EXCLUDE')
      .map((entry) => entry.exerciseId) ?? [],
  );
  const weeks = Array.from(
    new Set(program.workouts.map((workout) => workout.weekIndex)),
  );
  const completeReady = program.workouts.every(isTerminal);
  const [openWeeks, setOpenWeeks] = useState<Set<number>>(
    () => new Set(weeks.slice(0, 1)),
  );

  useEffect(() => {
    setOpenWeeks(new Set(weeks.slice(0, 1)));
  }, [program.id]);

  const setWeekOpen = (week: number, open: boolean) => {
    setOpenWeeks((current) => {
      const next = new Set(current);
      if (open) next.add(week);
      else next.delete(week);
      return next;
    });
  };

  return (
    <>
      <section className={styles.summary} data-status={program.status}>
        <div>
          <span>{program.status}</span>
          <h2>{GOAL_LABELS[program.definition.goal]} program</h2>
          <p>
            {program.definition.weeks} weeks · {
              program.definition.sessionsPerWeek
            } sessions/week · {
              splitLabel(program.definition.source.resolvedSplit)
            }
          </p>
          <small>
            {dateLabel(program.definition.source.startDate)} through {
              dateLabel(
                program.workouts.at(-1)?.scheduledDate
                ?? program.definition.source.startDate,
              )
            } · revision {program.revision}
          </small>
        </div>
        <div className={styles.summaryActions}>
          {program.status === 'DRAFT' ? (
            <Button disabled={busy === 'activate'} onClick={onActivate}>
              {busy === 'activate' ? 'Activating…' : 'Activate program'}
            </Button>
          ) : null}
          {program.status === 'ACTIVE' && completeReady ? (
            <Button disabled={busy === 'complete'} onClick={onComplete}>
              Complete program
            </Button>
          ) : null}
          {program.status !== 'ARCHIVED' ? (
            <Button
              disabled={busy === 'archive'}
              onClick={onArchive}
              variant="secondary"
            >
              Archive
            </Button>
          ) : null}
        </div>
      </section>

      {weeks.map((week) => (
        <details
          className={styles.week}
          key={week}
          onToggle={(event) => setWeekOpen(week, event.currentTarget.open)}
          open={openWeeks.has(week)}
        >
          <summary className={styles.weekHeading}>
            <span>Week {week + 1}</span>
            <small>
              {program.workouts.filter((workout) => workout.weekIndex === week).length}
              {' '}workouts
            </small>
          </summary>
          <div className={styles.workoutList}>
            {program.workouts
              .filter((workout) => workout.weekIndex === week)
              .map((workout) => {
                const hasExcludedExercise = workout.exercises.some(
                  (exercise) => excluded.has(exercise.exerciseId),
                );
                return (
                <article
                  className={styles.workout}
                  data-status={workout.executionStatus}
                  key={workout.id}
                >
                  <header>
                    <div>
                      <span>
                        {EXECUTION_LABELS[workout.executionStatus]
                          ?? workout.executionStatus}
                      </span>
                      <h3>{workout.title}</h3>
                    </div>
                    <time>{dateLabel(workout.scheduledDate)}</time>
                  </header>

                  {(program.status === 'ACTIVE' || program.status === 'DRAFT')
                    && canStart(workout) ? (
                      <div className={styles.volumeControl}>
                        <div className={styles.volumeReadout}>
                          <span>Total planned volume</span>
                          <strong>
                            {totalTrainingProgramWorkingSets(workout.exercises)}
                            <small> working sets</small>
                          </strong>
                          {workout.hasUserVolumeOverride ? (
                            <em>
                              Custom · current recommendation {
                                workout.recommendedTotalWorkingSets
                                  ?? totalTrainingProgramWorkingSets(
                                    workout.exercises,
                                  )
                              }
                            </em>
                          ) : (
                            <em>Top Set recommendation</em>
                          )}
                        </div>
                        <div className={styles.volumeButtons}>
                          <button
                            aria-label={`Reduce ${workout.title} total working sets`}
                            disabled={busy.startsWith('volume')}
                            onClick={() => onAdjustVolume(workout, 'REMOVE')}
                            type="button"
                          >
                            −
                          </button>
                          <button
                            aria-label={`Increase ${workout.title} total working sets`}
                            disabled={busy.startsWith('volume')}
                            onClick={() => onAdjustVolume(workout, 'ADD')}
                            type="button"
                          >
                            +
                          </button>
                          {workout.hasUserVolumeOverride ? (
                            <button
                              className={styles.restoreVolume}
                              disabled={busy.startsWith('volume')}
                              onClick={() =>
                                onRestoreRecommendedVolume(workout)}
                              type="button"
                            >
                              Restore recommended
                            </button>
                          ) : null}
                        </div>
                      </div>
                    ) : null}

                  {pendingVolume?.workoutId === workout.id ? (
                    <section
                      aria-label="Volume warning"
                      className={styles.volumeWarning}
                      role="alertdialog"
                    >
                      <div>
                        <span>VOLUME CHECK</span>
                        <h4>
                          {pendingVolume.adjustment.direction === 'ADD'
                            ? `Increase to ${pendingVolume.adjustment.nextTotalWorkingSets} working sets?`
                            : `Reduce to ${pendingVolume.adjustment.nextTotalWorkingSets} working sets?`}
                        </h4>
                        <p>
                          Top Set is checking the edit against your current
                          7-day effective-volume and performance signals. This
                          is guidance, not a restriction.
                        </p>
                      </div>
                      <ul>
                        {pendingVolume.adjustment.warnings.map((warning) => (
                          <li
                            data-tone={warning.tone}
                            key={`${warning.muscleGroup}:${warning.title}`}
                          >
                            <strong>
                              {MUSCLE_LABELS[warning.muscleGroup]
                                ?? warning.muscleGroup}
                              {' · '}
                              {warning.title}
                            </strong>
                            <p>{warning.message}</p>
                            <small>
                              Current {warning.currentEffectiveSets} effective
                              sets · planned estimate {
                                warning.projectedEffectiveSets
                              } · target {warning.targetMin}–{warning.targetMax}
                            </small>
                          </li>
                        ))}
                      </ul>
                      <div className={styles.volumeWarningActions}>
                        <Button
                          disabled={busy.startsWith('volume')}
                          onClick={onConfirmPendingVolume}
                        >
                          Continue with {
                            pendingVolume.adjustment.nextTotalWorkingSets
                          } sets
                        </Button>
                        <Button
                          disabled={busy.startsWith('volume')}
                          onClick={onCancelPendingVolume}
                          variant="secondary"
                        >
                          Keep current volume
                        </Button>
                      </div>
                    </section>
                  ) : null}

                  <ol className={styles.exerciseRows}>
                    {workout.exercises.map((exercise) => {
                      const isExcluded = excluded.has(exercise.exerciseId);
                      return (
                        <li
                          data-excluded={isExcluded ? 'true' : undefined}
                          key={`${workout.id}:${exercise.exerciseId}`}
                        >
                          <div>
                            <strong>{exercise.canonicalName}</strong>
                            <span>
                              {MUSCLE_LABELS[exercise.targetMuscleGroup]
                                ?? exercise.targetMuscleGroup}
                              {' · '}
                              {formatTarget(exercise)}
                            </span>
                            {isExcluded ? (
                              <em>
                                Currently excluded. Swap this planned exercise
                                before starting.
                              </em>
                            ) : null}
                          </div>
                          {canStart(workout)
                            && (program.status === 'ACTIVE'
                              || program.status === 'DRAFT') ? (
                              <button
                                disabled={busy.startsWith('swap:')}
                                onClick={() => onSwap(workout, exercise)}
                                type="button"
                              >
                                Swap
                              </button>
                            ) : null}
                        </li>
                      );
                    })}
                  </ol>

                  {program.status === 'ACTIVE' ? (
                    <div className={styles.workoutActions}>
                      {canStart(workout) && hasExcludedExercise ? (
                        <p className={styles.exclusionBlock}>
                          Swap the excluded exercise before starting the planned workout.
                        </p>
                      ) : null}
                      {canStart(workout) ? (
                        <>
                          <Button
                            disabled={
                              busy === `launch:${workout.id}`
                              || hasExcludedExercise
                            }
                            onClick={() => onLaunch(workout)}
                          >
                            Start planned workout
                          </Button>
                          <Button
                            disabled={busy === `own:${workout.id}`}
                            onClick={() => onLaunchOwn(workout)}
                            variant="secondary"
                          >
                            Do my own workout
                          </Button>
                          {workout.executionStatus === 'PLANNED' ? (
                            <Button
                              disabled={busy === `miss:${workout.id}`}
                              onClick={() => onMarkMissed(workout)}
                              variant="ghost"
                            >
                              Mark missed
                            </Button>
                          ) : null}
                        </>
                      ) : null}

                      {workout.executionStatus === 'COMPLETED_PROGRAMMED'
                        || workout.executionStatus === 'COMPLETED_OWN_WORKOUT' ? (
                          <Button
                            disabled={busy === `adapt:${workout.id}`}
                            onClick={() => onAdapt(workout)}
                            variant="secondary"
                          >
                            Review progression
                          </Button>
                        ) : null}
                    </div>
                  ) : null}
                </article>
                );
              })}
          </div>
        </details>
      ))}

      <p className={styles.authorityNote}>
        Planned prescriptions are guidance. Actual completed workout sets remain
        authoritative for history, XP, PRs, Phase 19 volume, and future
        adaptation.
      </p>
    </>
  );
}

function LimitationsEditor({
  allCandidates,
  busy,
  candidates,
  constraints,
  onApplySuggested,
  onSearch,
  onUpdate,
  search,
}: {
  allCandidates: TrainingProgramGeneratorCandidate[];
  busy: string;
  candidates: TrainingProgramGeneratorCandidate[];
  constraints: TrainingProgramConstraintSnapshot | null;
  onApplySuggested: (exerciseIds: readonly string[]) => void;
  onSearch: (value: string) => void;
  onUpdate: (
    exerciseId: string,
    kind: 'EXCLUDE' | 'PREFER' | null,
    reason?: TrainingProgramConstraintReason,
  ) => void;
  search: string;
}) {
  const [area, setArea] = useState<TrainingProgramLimitationArea | ''>('');
  const [context, setContext] =
    useState<TrainingProgramLimitationContext>('CURRENT_INJURY');
  const [movements, setMovements] =
    useState<TrainingProgramLimitationMovement[]>([]);
  const [selectedSuggestedIds, setSelectedSuggestedIds] =
    useState<string[]>([]);

  const suggestedCandidates = useMemo(
    () => suggestTrainingProgramExercisesToReview(allCandidates, movements),
    [allCandidates, movements],
  );

  if (!constraints) return null;

  const limitationEntries = constraints.entries.filter(
    (entry) => entry.kind === 'EXCLUDE'
      && entry.reason === 'PHYSICAL_LIMITATION',
  );
  const current = new Map(
    constraints.entries.map((entry) => [entry.exerciseId, entry]),
  );
  const names = new Map(
    allCandidates.map((candidate) => [
      candidate.exerciseId,
      candidate.canonicalName,
    ]),
  );

  const changeArea = (next: TrainingProgramLimitationArea | '') => {
    setArea(next);
    setMovements(next ? defaultTrainingProgramLimitationMovements(next) : []);
    setSelectedSuggestedIds([]);
  };

  const toggleMovement = (movement: TrainingProgramLimitationMovement) => {
    setMovements((currentMovements) => currentMovements.includes(movement)
      ? currentMovements.filter((item) => item !== movement)
      : [...currentMovements, movement]);
    setSelectedSuggestedIds([]);
  };

  const selectableSuggested = suggestedCandidates.filter((candidate) => {
    const entry = current.get(candidate.exerciseId);
    return !(entry?.kind === 'EXCLUDE'
      && entry.reason === 'PHYSICAL_LIMITATION');
  });

  const toggleSuggested = (exerciseId: string) => {
    setSelectedSuggestedIds((selected) => selected.includes(exerciseId)
      ? selected.filter((id) => id !== exerciseId)
      : [...selected, exerciseId]);
  };

  const applySuggested = () => {
    if (selectedSuggestedIds.length === 0) return;
    onApplySuggested(selectedSuggestedIds);
    setSelectedSuggestedIds([]);
  };

  return (
    <section
      className={styles.limitations}
      aria-labelledby="program-limitations-heading"
    >
      <div className={styles.sectionHeading}>
        <div>
          <span>Safety input</span>
          <h2 id="program-limitations-heading">Injuries & limitations</h2>
        </div>
        <p>
          Tell Top Set where the issue is and which movements you need to limit.
          We suggest exercises to review; you choose every exclusion that is
          actually saved.
        </p>
      </div>

      <div className={styles.limitationWizard}>
        <div className={styles.limitationSetupGrid}>
          <SelectField
            label="Injury / limitation area"
            onChange={(event) =>
              changeArea(event.target.value as TrainingProgramLimitationArea | '')}
            value={area}
          >
            <option value="">Choose an area</option>
            {trainingProgramLimitationAreaOptions.map((option) => (
              <option key={option.key} value={option.key}>{option.label}</option>
            ))}
          </SelectField>

          <SelectField
            label="Type of issue"
            onChange={(event) =>
              setContext(event.target.value as TrainingProgramLimitationContext)}
            value={context}
          >
            {trainingProgramLimitationContextOptions.map((option) => (
              <option key={option.key} value={option.key}>{option.label}</option>
            ))}
          </SelectField>
        </div>

        {area ? (
          <fieldset className={styles.movementReview}>
            <legend>Movements to review</legend>
            <p>
              These are starting suggestions for the selected area. Adjust them
              to match the movements you already know you need to limit.
            </p>
            <div className={styles.movementOptions}>
              {trainingProgramLimitationMovementOptions.map((option) => (
                <button
                  aria-pressed={movements.includes(option.key)}
                  key={option.key}
                  onClick={() => toggleMovement(option.key)}
                  type="button"
                >
                  {option.label}
                </button>
              ))}
            </div>
          </fieldset>
        ) : null}

        {area && movements.length > 0 ? (
          <div className={styles.suggestedExclusions}>
            <div className={styles.suggestionHeading}>
              <div>
                <strong>Suggested exercises to review</strong>
                <span>
                  Suggestions come from movement-pattern matching, not a medical
                  diagnosis. Confirm only exercises you personally need excluded.
                </span>
              </div>
              {selectableSuggested.length > 0 ? (
                <div>
                  <button
                    onClick={() => setSelectedSuggestedIds(
                      selectableSuggested.map((candidate) => candidate.exerciseId),
                    )}
                    type="button"
                  >
                    Select all
                  </button>
                  <button
                    onClick={() => setSelectedSuggestedIds([])}
                    type="button"
                  >
                    Clear
                  </button>
                </div>
              ) : null}
            </div>

            {suggestedCandidates.length === 0 ? (
              <p className={styles.emptyConstraint}>
                No generator-eligible exercises match the selected movement
                restrictions. You can still add an exercise manually below.
              </p>
            ) : (
              <div className={styles.suggestionRows}>
                {suggestedCandidates.map((candidate) => {
                  const entry = current.get(candidate.exerciseId);
                  const alreadySaved = entry?.kind === 'EXCLUDE'
                    && entry.reason === 'PHYSICAL_LIMITATION';
                  return (
                    <label key={candidate.exerciseId}>
                      <input
                        checked={alreadySaved
                          || selectedSuggestedIds.includes(candidate.exerciseId)}
                        disabled={alreadySaved}
                        onChange={() => toggleSuggested(candidate.exerciseId)}
                        type="checkbox"
                      />
                      <span>
                        <strong>{candidate.canonicalName}</strong>
                        <small>
                          {alreadySaved
                            ? 'Already saved as a physical-limitation exclusion'
                            : candidate.primaryMuscleGroup.replaceAll('_', ' ')}
                        </small>
                      </span>
                    </label>
                  );
                })}
              </div>
            )}

            <div className={styles.suggestionActions}>
              <Button
                disabled={selectedSuggestedIds.length === 0
                  || busy === 'limitations:apply'}
                onClick={applySuggested}
              >
                {busy === 'limitations:apply'
                  ? 'Saving exclusions…'
                  : `Apply ${selectedSuggestedIds.length} selected exclusions`}
              </Button>
            </div>
          </div>
        ) : null}
      </div>

      {limitationEntries.length > 0 ? (
        <ul className={styles.constraintRows}>
          {limitationEntries.map((entry) => (
            <li key={entry.exerciseId}>
              <div>
                <strong>{names.get(entry.exerciseId) ?? 'Saved exercise'}</strong>
                <span>Avoid because of injury / physical limitation</span>
              </div>
              <button
                disabled={busy === 'constraint:' + entry.exerciseId}
                onClick={() => onUpdate(entry.exerciseId, null)}
                type="button"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className={styles.emptyConstraint}>
          No injury or physical-limitation exclusions saved.
        </p>
      )}

      <div className={styles.manualLimitation}>
        <strong>Add another exercise manually</strong>
        <label className={styles.searchField}>
          <span>Find an exercise you need to avoid</span>
          <input
            onChange={(event) => onSearch(event.target.value)}
            placeholder="Search exercises to avoid…"
            type="search"
            value={search}
          />
        </label>
      </div>

      {search.trim() ? (
        <div className={styles.constraintSearchResults}>
          {candidates.length === 0 ? (
            <p>No generator-eligible exercises match that search.</p>
          ) : candidates.map((candidate) => {
            const entry = current.get(candidate.exerciseId);
            const selected = entry?.kind === 'EXCLUDE'
              && entry.reason === 'PHYSICAL_LIMITATION';

            return (
              <div key={candidate.exerciseId}>
                <div>
                  <strong>{candidate.canonicalName}</strong>
                  <span>{candidate.primaryMuscleGroup.replaceAll('_', ' ')}</span>
                </div>
                <div>
                  <button
                    aria-pressed={selected}
                    disabled={busy === 'constraint:' + candidate.exerciseId}
                    onClick={() =>
                      onUpdate(
                        candidate.exerciseId,
                        selected ? null : 'EXCLUDE',
                        'PHYSICAL_LIMITATION',
                      )}
                    type="button"
                  >
                    {selected ? 'Remove limitation' : 'Avoid for injury / limitation'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : null}

      <p className={styles.constraintNote}>
        Top Set does not diagnose injuries, recommend rehabilitation, or decide
        whether an exercise is medically safe. The area and issue type guide the
        review flow; only the exercise exclusions you confirm affect generation.
      </p>
    </section>
  );
}

function ConstraintEditor({
  allCandidates,
  busy,
  candidates,
  constraints,
  onSearch,
  onUpdate,
  search,
}: {
  allCandidates: TrainingProgramGeneratorCandidate[];
  busy: string;
  candidates: TrainingProgramGeneratorCandidate[];
  constraints: TrainingProgramConstraintSnapshot | null;
  onSearch: (value: string) => void;
  onUpdate: (
    exerciseId: string,
    kind: 'EXCLUDE' | 'PREFER' | null,
    reason?: TrainingProgramConstraintReason,
  ) => void;
  search: string;
}) {
  if (!constraints) return null;

  const current = new Map(
    constraints.entries.map((entry) => [entry.exerciseId, entry]),
  );
  const names = new Map(
    allCandidates.map((candidate) => [candidate.exerciseId, candidate.canonicalName]),
  );

  const generalEntries = constraints.entries.filter(
    (entry) => entry.reason !== 'PHYSICAL_LIMITATION',
  );

  return (
    <section className={styles.constraints} aria-labelledby="constraints-heading">
      <div className={styles.sectionHeading}>
        <div>
          <span>Exercise controls</span>
          <h2 id="constraints-heading">Exercise preferences & exclusions</h2>
        </div>
        <p>
          Preferred exercises are ranking hints. Excluded exercises are hard
          constraints. Injury and physical-limitation exclusions are managed in
          the dedicated section above.
        </p>
      </div>

      {generalEntries.length > 0 ? (
        <ul className={styles.constraintRows}>
          {generalEntries.map((entry) => (
            <li key={entry.exerciseId}>
              <div>
                <strong>{names.get(entry.exerciseId) ?? 'Saved exercise'}</strong>
                <span>{entry.kind} · {entry.reason.replaceAll('_', ' ')}</span>
              </div>
              <button
                disabled={busy === `constraint:${entry.exerciseId}`}
                onClick={() => onUpdate(entry.exerciseId, null)}
                type="button"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className={styles.emptyConstraint}>
          No exercise preferences or exclusions saved.
        </p>
      )}

      <label className={styles.searchField}>
        <span>Find an exercise</span>
        <input
          onChange={(event) => onSearch(event.target.value)}
          placeholder="Search exercises…"
          type="search"
          value={search}
        />
      </label>

      {search.trim() ? (
        <div className={styles.constraintSearchResults}>
          {candidates.length === 0 ? (
            <p>No generator-eligible exercises match that search.</p>
          ) : candidates.map((candidate) => {
            const entry = current.get(candidate.exerciseId);
            return (
              <div key={candidate.exerciseId}>
                <div>
                  <strong>{candidate.canonicalName}</strong>
                  <span>{candidate.primaryMuscleGroup.replaceAll('_', ' ')}</span>
                </div>
                <div>
                  <button
                    aria-pressed={entry?.kind === 'PREFER'}
                    disabled={busy === `constraint:${candidate.exerciseId}`}
                    onClick={() =>
                      onUpdate(candidate.exerciseId, 'PREFER', 'PREFERENCE')}
                    type="button"
                  >
                    Prefer
                  </button>
                  <button
                    aria-pressed={entry?.kind === 'EXCLUDE'
                      && entry.reason === 'PREFERENCE'}
                    disabled={busy === `constraint:${candidate.exerciseId}`}
                    onClick={() =>
                      onUpdate(candidate.exerciseId, 'EXCLUDE', 'PREFERENCE')}
                    type="button"
                  >
                    Exclude
                  </button>
                  <button
                    aria-pressed={entry?.kind === 'EXCLUDE'
                      && entry.reason === 'PHYSICAL_LIMITATION'}
                    disabled={busy === `constraint:${candidate.exerciseId}`}
                    onClick={() =>
                      onUpdate(
                        candidate.exerciseId,
                        'EXCLUDE',
                        'PHYSICAL_LIMITATION',
                      )}
                    type="button"
                  >
                    Physical limitation
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : null}

      <p className={styles.constraintNote}>
        These controls affect program selection only. Preferences never override
        equipment requirements or any hard exclusion.
      </p>
    </section>
  );
}
