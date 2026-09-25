/**
 * Maintainer boundary: non-diagnostic limitation suggestion helper.
 * Body-area/movement selections generate exercises to REVIEW only. Persistence
 * occurs only after the user explicitly confirms an exercise exclusion through
 * the existing PHYSICAL_LIMITATION constraint boundary.
 */

import type { TrainingProgramGeneratorCandidate } from './trainingProgramGenerator';

export const TRAINING_PROGRAM_LIMITATION_AREAS = [
  'SHOULDER',
  'ELBOW',
  'WRIST_HAND',
  'LOWER_BACK',
  'HIP',
  'KNEE',
  'ANKLE_FOOT',
  'NECK',
  'OTHER',
] as const;

export type TrainingProgramLimitationArea =
  typeof TRAINING_PROGRAM_LIMITATION_AREAS[number];

export const TRAINING_PROGRAM_LIMITATION_CONTEXTS = [
  'CURRENT_INJURY',
  'PREVIOUS_RECURRING',
  'PAIN_DISCOMFORT',
  'RANGE_OF_MOTION',
  'CLINICIAN_RESTRICTION',
  'OTHER',
] as const;

export type TrainingProgramLimitationContext =
  typeof TRAINING_PROGRAM_LIMITATION_CONTEXTS[number];

export const TRAINING_PROGRAM_LIMITATION_MOVEMENTS = [
  'OVERHEAD_PRESS',
  'HORIZONTAL_PRESS',
  'DIPS',
  'PULLING',
  'GRIP_WRIST_LOADING',
  'HIP_HINGE',
  'DEEP_KNEE_FLEXION',
  'LUNGE_SPLIT_STANCE',
  'IMPACT_JUMPING',
  'CALF_ANKLE_LOADING',
  'LOADED_TRUNK',
  'NECK_SHOULDER_LOADING',
] as const;

export type TrainingProgramLimitationMovement =
  typeof TRAINING_PROGRAM_LIMITATION_MOVEMENTS[number];

export const trainingProgramLimitationAreaOptions: readonly {
  key: TrainingProgramLimitationArea;
  label: string;
}[] = [
  { key: 'SHOULDER', label: 'Shoulder' },
  { key: 'ELBOW', label: 'Elbow' },
  { key: 'WRIST_HAND', label: 'Wrist / hand' },
  { key: 'LOWER_BACK', label: 'Lower back' },
  { key: 'HIP', label: 'Hip' },
  { key: 'KNEE', label: 'Knee' },
  { key: 'ANKLE_FOOT', label: 'Ankle / foot' },
  { key: 'NECK', label: 'Neck' },
  { key: 'OTHER', label: 'Other / custom' },
];

export const trainingProgramLimitationContextOptions: readonly {
  key: TrainingProgramLimitationContext;
  label: string;
}[] = [
  { key: 'CURRENT_INJURY', label: 'Current injury' },
  { key: 'PREVIOUS_RECURRING', label: 'Previous / recurring issue' },
  { key: 'PAIN_DISCOMFORT', label: 'Pain or discomfort with some movements' },
  { key: 'RANGE_OF_MOTION', label: 'Restricted range of motion' },
  { key: 'CLINICIAN_RESTRICTION', label: 'Clinician-advised restriction' },
  { key: 'OTHER', label: 'Other' },
];

export const trainingProgramLimitationMovementOptions: readonly {
  key: TrainingProgramLimitationMovement;
  label: string;
}[] = [
  { key: 'OVERHEAD_PRESS', label: 'Overhead pressing' },
  { key: 'HORIZONTAL_PRESS', label: 'Horizontal pressing / push-ups' },
  { key: 'DIPS', label: 'Dips' },
  { key: 'PULLING', label: 'Rows / pull-ups / pulldowns' },
  { key: 'GRIP_WRIST_LOADING', label: 'Heavy gripping / wrist loading' },
  { key: 'HIP_HINGE', label: 'Hip hinging / deadlift patterns' },
  { key: 'DEEP_KNEE_FLEXION', label: 'Squatting / deep knee flexion' },
  { key: 'LUNGE_SPLIT_STANCE', label: 'Lunges / split-stance work' },
  { key: 'IMPACT_JUMPING', label: 'Jumping / impact' },
  { key: 'CALF_ANKLE_LOADING', label: 'Calf / ankle loading' },
  { key: 'LOADED_TRUNK', label: 'Loaded trunk / back extension work' },
  { key: 'NECK_SHOULDER_LOADING', label: 'Neck / shoulder loading' },
];

const DEFAULT_MOVEMENTS: Record<
  TrainingProgramLimitationArea,
  readonly TrainingProgramLimitationMovement[]
> = {
  SHOULDER: ['OVERHEAD_PRESS', 'HORIZONTAL_PRESS', 'DIPS'],
  ELBOW: ['HORIZONTAL_PRESS', 'DIPS', 'PULLING', 'GRIP_WRIST_LOADING'],
  WRIST_HAND: ['GRIP_WRIST_LOADING', 'HORIZONTAL_PRESS'],
  LOWER_BACK: ['HIP_HINGE', 'LOADED_TRUNK'],
  HIP: ['HIP_HINGE', 'DEEP_KNEE_FLEXION', 'LUNGE_SPLIT_STANCE'],
  KNEE: ['DEEP_KNEE_FLEXION', 'LUNGE_SPLIT_STANCE', 'IMPACT_JUMPING'],
  ANKLE_FOOT: ['IMPACT_JUMPING', 'CALF_ANKLE_LOADING'],
  NECK: ['NECK_SHOULDER_LOADING', 'OVERHEAD_PRESS'],
  OTHER: [],
};

const MOVEMENT_KEYWORDS: Record<
  TrainingProgramLimitationMovement,
  readonly string[]
> = {
  OVERHEAD_PRESS: [
    'overhead press', 'shoulder press', 'military press', 'arnold press',
    'push press', 'handstand push', 'thruster', 'jerk',
  ],
  HORIZONTAL_PRESS: [
    'bench press', 'chest press', 'floor press', 'push-up', 'push up',
    'chest fly', 'chest flye', 'pec deck',
  ],
  DIPS: ['dip'],
  PULLING: [
    'row', 'pull-up', 'pull up', 'chin-up', 'chin up', 'pulldown',
    'lat pull',
  ],
  GRIP_WRIST_LOADING: [
    'wrist', 'grip', 'curl', 'carry', 'farmer', 'deadlift', 'row', 'pull-up',
    'pull up', 'chin-up', 'chin up', 'clean', 'snatch',
  ],
  HIP_HINGE: [
    'deadlift', 'romanian', 'rdl', 'good morning', 'hip hinge',
    'kettlebell swing', 'back extension', 'stiff-leg', 'stiff leg',
  ],
  DEEP_KNEE_FLEXION: [
    'squat', 'leg press', 'hack squat', 'step-up', 'step up',
  ],
  LUNGE_SPLIT_STANCE: [
    'lunge', 'split squat', 'bulgarian', 'step-up', 'step up', 'curtsy',
  ],
  IMPACT_JUMPING: [
    'jump', 'hop', 'bound', 'plyometric', 'box jump',
  ],
  CALF_ANKLE_LOADING: [
    'calf', 'jump', 'hop', 'bound', 'step-up', 'step up', 'lunge',
  ],
  LOADED_TRUNK: [
    'deadlift', 'good morning', 'back extension', 'hyperextension',
    'bent-over', 'bent over', 'squat', 'carry',
  ],
  NECK_SHOULDER_LOADING: [
    'neck', 'shrug', 'carry', 'overhead press', 'shoulder press',
    'military press', 'push press',
  ],
};

export function defaultTrainingProgramLimitationMovements(
  area: TrainingProgramLimitationArea,
): TrainingProgramLimitationMovement[] {
  return [...DEFAULT_MOVEMENTS[area]];
}

function candidateMatchesMovement(
  candidate: TrainingProgramGeneratorCandidate,
  movement: TrainingProgramLimitationMovement,
): boolean {
  const name = candidate.canonicalName.toLocaleLowerCase('en-CA');
  return MOVEMENT_KEYWORDS[movement].some((keyword) => name.includes(keyword));
}

export function suggestTrainingProgramExercisesToReview(
  candidates: readonly TrainingProgramGeneratorCandidate[],
  movements: readonly TrainingProgramLimitationMovement[],
  limit = 24,
): TrainingProgramGeneratorCandidate[] {
  if (movements.length === 0) return [];

  const movementSet = new Set(movements);
  return candidates
    .filter((candidate) =>
      [...movementSet].some((movement) =>
        candidateMatchesMovement(candidate, movement)))
    .sort((left, right) => left.canonicalName.localeCompare(right.canonicalName))
    .slice(0, Math.max(0, limit));
}
