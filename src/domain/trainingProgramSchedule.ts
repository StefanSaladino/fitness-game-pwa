/**
 * Maintainer boundary: calendar scheduling and split compatibility.
 * Internal split identifiers are persistence/domain keys; UI labels may change
 * independently. Calendar-date logic deliberately avoids local Date parsing that
 * can move a workout across days because of timezone offsets.
 */

export const TRAINING_PROGRAM_SUPPORTED_DURATION_WEEKS = [4, 8] as const;

export type TrainingProgramDurationWeeks =
  typeof TRAINING_PROGRAM_SUPPORTED_DURATION_WEEKS[number];

export const TRAINING_PROGRAM_DAYS = [
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
  'SUNDAY',
] as const;

export type TrainingProgramDayOfWeek =
  typeof TRAINING_PROGRAM_DAYS[number];

export const TRAINING_PROGRAM_RESOLVED_SPLITS = [
  'FULL_BODY',
  'FULL_BODY_AB',
  'UPPER_LOWER',
  'FULL_BODY_ABC',
  'PUSH_PULL_LEGS',
  'UPPER_LOWER_FULL_BODY',
  'UPPER_LOWER_X2',
  'PUSH_PULL_UPPER_LOWER',
  'PPL_UPPER_LOWER',
  'UPPER_LOWER_PPL',
  'PPL_X2',
  'UPPER_LOWER_X3',
] as const;

export type TrainingProgramResolvedSplit =
  typeof TRAINING_PROGRAM_RESOLVED_SPLITS[number];

export type TrainingProgramRequestedSplit =
  | 'AUTO'
  | TrainingProgramResolvedSplit;

export interface TrainingProgramScheduleSlot {
  weekIndex: number;
  sessionIndex: number;
  scheduledDate: string;
}

const DAY_INDEX = new Map<TrainingProgramDayOfWeek, number>(
  TRAINING_PROGRAM_DAYS.map((day, index) => [day, index]),
);

const JS_UTC_DAY_TO_PROGRAM_DAY: readonly TrainingProgramDayOfWeek[] = [
  'SUNDAY',
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
];

const COMPATIBLE_SPLITS: Record<
  number,
  readonly TrainingProgramResolvedSplit[]
> = {
  1: ['FULL_BODY'],
  2: ['FULL_BODY_AB', 'UPPER_LOWER'],
  3: ['FULL_BODY_ABC', 'PUSH_PULL_LEGS', 'UPPER_LOWER_FULL_BODY'],
  4: ['UPPER_LOWER_X2', 'PUSH_PULL_UPPER_LOWER'],
  5: ['PPL_UPPER_LOWER', 'UPPER_LOWER_PPL'],
  6: ['PPL_X2', 'UPPER_LOWER_X3'],
};

const AUTO_SPLIT: Record<number, TrainingProgramResolvedSplit> = {
  1: 'FULL_BODY',
  2: 'FULL_BODY_AB',
  3: 'FULL_BODY_ABC',
  4: 'UPPER_LOWER_X2',
  5: 'UPPER_LOWER_PPL',
  6: 'PPL_X2',
};

function validFrequency(value: number): boolean {
  return Number.isInteger(value) && value >= 1 && value <= 6;
}

export function isTrainingProgramDurationWeeks(
  value: number,
): value is TrainingProgramDurationWeeks {
  return (
    TRAINING_PROGRAM_SUPPORTED_DURATION_WEEKS as readonly number[]
  ).includes(value);
}

export function isTrainingProgramDayOfWeek(
  value: string,
): value is TrainingProgramDayOfWeek {
  return (TRAINING_PROGRAM_DAYS as readonly string[]).includes(value);
}

export function isTrainingProgramRequestedSplit(
  value: string,
): value is TrainingProgramRequestedSplit {
  return (
    value === 'AUTO'
    || (
      TRAINING_PROGRAM_RESOLVED_SPLITS as readonly string[]
    ).includes(value)
  );
}

export function compatibleTrainingProgramSplits(
  sessionsPerWeek: number,
): readonly TrainingProgramResolvedSplit[] {
  if (!validFrequency(sessionsPerWeek)) {
    throw new RangeError('Training frequency must be between 1 and 6.');
  }

  return COMPATIBLE_SPLITS[sessionsPerWeek]!;
}

export function resolveTrainingProgramSplit(
  sessionsPerWeek: number,
  requestedSplit: TrainingProgramRequestedSplit,
): TrainingProgramResolvedSplit {
  const compatible = compatibleTrainingProgramSplits(sessionsPerWeek);

  if (requestedSplit === 'AUTO') {
    return AUTO_SPLIT[sessionsPerWeek]!;
  }

  if (!compatible.includes(requestedSplit)) {
    throw new Error(
      `${requestedSplit} is not compatible with ${sessionsPerWeek} sessions per week.`,
    );
  }

  return requestedSplit;
}

export function normalizeTrainingProgramDays(
  trainingDays: readonly TrainingProgramDayOfWeek[],
  sessionsPerWeek: number,
): TrainingProgramDayOfWeek[] {
  if (!validFrequency(sessionsPerWeek)) {
    throw new RangeError('Training frequency must be between 1 and 6.');
  }

  if (trainingDays.length !== sessionsPerWeek) {
    throw new Error(
      `Select exactly ${sessionsPerWeek} training weekdays.`,
    );
  }

  const seen = new Set<TrainingProgramDayOfWeek>();

  for (const day of trainingDays) {
    if (!isTrainingProgramDayOfWeek(day)) {
      throw new Error(`Unsupported training weekday: ${day}`);
    }
    if (seen.has(day)) {
      throw new Error('Training weekdays cannot contain duplicates.');
    }
    seen.add(day);
  }

  return [...seen].sort(
    (left, right) => DAY_INDEX.get(left)! - DAY_INDEX.get(right)!,
  );
}

function parseCalendarDate(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    date.getUTCFullYear() !== year
    || date.getUTCMonth() !== month - 1
    || date.getUTCDate() !== day
  ) {
    return null;
  }

  return date;
}

export function isTrainingProgramCalendarDate(value: string): boolean {
  return parseCalendarDate(value) !== null;
}

function formatCalendarDate(date: Date): string {
  const year = String(date.getUTCFullYear()).padStart(4, '0');
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export interface BuildTrainingProgramScheduleInput {
  startDate: string;
  durationWeeks: TrainingProgramDurationWeeks;
  trainingDays: readonly TrainingProgramDayOfWeek[];
  sessionsPerWeek: number;
}

export function buildTrainingProgramSchedule(
  input: BuildTrainingProgramScheduleInput,
): TrainingProgramScheduleSlot[] {
  if (!isTrainingProgramDurationWeeks(input.durationWeeks)) {
    throw new Error('Training program duration must be 4 or 8 weeks.');
  }

  const start = parseCalendarDate(input.startDate);
  if (!start) {
    throw new Error(
      'Training program start date must be a valid YYYY-MM-DD calendar date.',
    );
  }

  const trainingDays = normalizeTrainingProgramDays(
    input.trainingDays,
    input.sessionsPerWeek,
  );
  const selectedDays = new Set(trainingDays);
  const sessionCountByWeek = Array.from(
    { length: input.durationWeeks },
    () => 0,
  );
  const slots: TrainingProgramScheduleSlot[] = [];

  const totalCalendarDays = input.durationWeeks * 7;

  for (let offset = 0; offset < totalCalendarDays; offset += 1) {
    const date = new Date(start.getTime());
    date.setUTCDate(date.getUTCDate() + offset);

    const day = JS_UTC_DAY_TO_PROGRAM_DAY[date.getUTCDay()]!;
    if (!selectedDays.has(day)) continue;

    const weekIndex = Math.floor(offset / 7);
    const sessionIndex = sessionCountByWeek[weekIndex]!;

    slots.push({
      weekIndex,
      sessionIndex,
      scheduledDate: formatCalendarDate(date),
    });

    sessionCountByWeek[weekIndex] = sessionIndex + 1;
  }

  const expectedCount = input.durationWeeks * input.sessionsPerWeek;
  if (
    slots.length !== expectedCount
    || sessionCountByWeek.some(
      (count) => count !== input.sessionsPerWeek,
    )
  ) {
    throw new Error(
      'Training program schedule could not resolve the requested weekly frequency.',
    );
  }

  return slots;
}
