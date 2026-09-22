export type TrainingProgramAccessMode = 'COMMERCIAL_GYM' | 'CUSTOM';

export type TrainingProgramEquipmentKey =
  | 'DUMBBELLS'
  | 'BARBELL'
  | 'RACK'
  | 'BENCH'
  | 'PULL_UP_BAR'
  | 'DIP_STATION'
  | 'CABLE_STATION'
  | 'MACHINES'
  | 'BANDS'
  | 'KETTLEBELLS'
  | 'LANDMINE'
  | 'RINGS'
  | 'PLYOMETRIC_BOX'
  | 'GHD_BACK_EXTENSION'
  | 'MEDICINE_BALL'
  | 'SPECIALTY_BARS'
  | 'STRONGMAN';

export type TrainingProgramEquipmentSupport = 'AVAILABLE' | 'PARTIAL' | 'PROFILE_ONLY';

export interface TrainingProgramEquipmentOption {
  key: TrainingProgramEquipmentKey;
  label: string;
  description: string;
  support: TrainingProgramEquipmentSupport;
  supportNote?: string;
}

export const trainingProgramEquipmentOptions: readonly TrainingProgramEquipmentOption[] = [
  { key: 'DUMBBELLS', label: 'Dumbbells', description: 'Adjustable or fixed dumbbells.', support: 'AVAILABLE' },
  { key: 'BARBELL', label: 'Barbell & plates', description: 'Straight barbell with loadable plates.', support: 'AVAILABLE' },
  { key: 'RACK', label: 'Squat / power rack', description: 'Rack or stands suitable for barbell setup.', support: 'AVAILABLE' },
  { key: 'BENCH', label: 'Bench', description: 'Flat or adjustable lifting bench.', support: 'AVAILABLE' },
  { key: 'PULL_UP_BAR', label: 'Pull-up bar', description: 'Stable overhead bar for hanging and pull-up work.', support: 'AVAILABLE' },
  { key: 'DIP_STATION', label: 'Dip station', description: 'Parallel bars or a stable dip attachment.', support: 'AVAILABLE' },
  { key: 'CABLE_STATION', label: 'Cable station', description: 'Single or dual adjustable cable stack.', support: 'AVAILABLE' },
  {
    key: 'MACHINES',
    label: 'Resistance machines',
    description: 'Selectorized or plate-loaded commercial machines.',
    support: 'PARTIAL',
    supportNote: 'Most machine exercises are program-ready; a small number still use deferred logging types.',
  },
  {
    key: 'BANDS',
    label: 'Resistance bands',
    description: 'Loop or handled resistance bands.',
    support: 'PROFILE_ONLY',
    supportNote: 'Saved to your profile, but band exercises are not used by training-program-v1 yet because all current band catalogue rows use OTHER logging.',
  },
  {
    key: 'KETTLEBELLS',
    label: 'Kettlebells',
    description: 'One or more kettlebells.',
    support: 'PARTIAL',
    supportNote: 'Rep-and-load kettlebell exercises are program-ready; carry/ballistic OTHER rows remain excluded.',
  },
  { key: 'LANDMINE', label: 'Landmine', description: 'Barbell landmine base or secure corner setup.', support: 'AVAILABLE' },
  { key: 'RINGS', label: 'Gymnastic rings', description: 'Suspension rings for rows, push-ups, and dips.', support: 'AVAILABLE' },
  { key: 'PLYOMETRIC_BOX', label: 'Plyometric box', description: 'Stable box or platform suitable for jump work.', support: 'AVAILABLE' },
  { key: 'GHD_BACK_EXTENSION', label: 'GHD / back-extension station', description: 'GHD, Roman chair, or 45-degree back-extension station.', support: 'AVAILABLE' },
  {
    key: 'MEDICINE_BALL',
    label: 'Medicine ball',
    description: 'Medicine or slam ball.',
    support: 'PROFILE_ONLY',
    supportNote: 'Saved to your profile, but current medicine-ball exercises use OTHER logging and are not generated in v1.',
  },
  {
    key: 'SPECIALTY_BARS',
    label: 'Specialty bars',
    description: 'Trap bar, safety bar, Swiss bar, or similar specialty bars.',
    support: 'PARTIAL',
    supportNote: 'Only normally loggable specialty-bar exercises are eligible for v1 programs.',
  },
  {
    key: 'STRONGMAN',
    label: 'Strongman / sled equipment',
    description: 'Sleds, farmer handles, yokes, carries, or similar implements.',
    support: 'PARTIAL',
    supportNote: 'Only currently loggable rep/load movements are eligible for v1 programs.',
  },
] as const;

export const commercialGymAssumedEquipmentKeys: readonly TrainingProgramEquipmentKey[] = [
  'DUMBBELLS',
  'BARBELL',
  'RACK',
  'BENCH',
  'PULL_UP_BAR',
  'DIP_STATION',
  'CABLE_STATION',
  'MACHINES',
  'BANDS',
  'KETTLEBELLS',
  'LANDMINE',
  'PLYOMETRIC_BOX',
  'GHD_BACK_EXTENSION',
  'MEDICINE_BALL',
] as const;

const equipmentOrder = new Map(
  trainingProgramEquipmentOptions.map((option, index) => [option.key, index] as const),
);

const validEquipmentKeys = new Set(
  trainingProgramEquipmentOptions.map((option) => option.key),
);

export function isTrainingProgramEquipmentKey(value: string): value is TrainingProgramEquipmentKey {
  return validEquipmentKeys.has(value as TrainingProgramEquipmentKey);
}

export function normalizeTrainingProgramEquipmentKeys(
  values: readonly string[],
): TrainingProgramEquipmentKey[] {
  const unique = new Set<TrainingProgramEquipmentKey>();

  for (const value of values) {
    const normalized = value.trim().toUpperCase();
    if (!isTrainingProgramEquipmentKey(normalized)) {
      throw new RangeError(`Unsupported training-program equipment key: ${value}`);
    }
    unique.add(normalized);
  }

  return [...unique].sort(
    (left, right) => (equipmentOrder.get(left) ?? Number.MAX_SAFE_INTEGER)
      - (equipmentOrder.get(right) ?? Number.MAX_SAFE_INTEGER),
  );
}

export function validateTrainingProgramAccessSelection(
  accessMode: TrainingProgramAccessMode,
  equipmentKeys: readonly string[],
): TrainingProgramEquipmentKey[] {
  const normalized = normalizeTrainingProgramEquipmentKeys(equipmentKeys);

  if (accessMode === 'COMMERCIAL_GYM' && normalized.length > 0) {
    throw new RangeError('Commercial gym access must not store custom equipment selections.');
  }

  return normalized;
}

export function trainingProgramEquipmentOption(
  key: TrainingProgramEquipmentKey,
): TrainingProgramEquipmentOption {
  const option = trainingProgramEquipmentOptions.find((candidate) => candidate.key === key);
  if (!option) throw new RangeError(`Unknown training-program equipment key: ${key}`);
  return option;
}
