import type { WorkoutExercise, WorkoutSet } from './model';

export interface SupersetFlowStep {
  exerciseId: string;
  supersetOrder: number;
  setNumber: number;
  completed: boolean;
}

export interface SupersetFlowState {
  completedSets: number;
  totalSets: number;
  currentExerciseId: string | null;
  currentSupersetOrder: number | null;
  currentSetNumber: number | null;
  complete: boolean;
}

export function deriveSupersetFlow(members: WorkoutExercise[], workoutSets: WorkoutSet[]): SupersetFlowState {
  const orderedMembers = [...members]
    .filter((member) => member.supersetOrder !== null)
    .sort((left, right) => (left.supersetOrder ?? 0) - (right.supersetOrder ?? 0));

  if (orderedMembers.length === 0) {
    return {
      completedSets: 0,
      totalSets: 0,
      currentExerciseId: null,
      currentSupersetOrder: null,
      currentSetNumber: null,
      complete: false,
    };
  }

  const memberIds = new Set(orderedMembers.map((member) => member.id));
  const relevantSets = workoutSets.filter((set) => memberIds.has(set.workoutExerciseId));
  const setNumbers = [...new Set(relevantSets.map((set) => set.setNumber))].sort((left, right) => left - right);
  const setsByExerciseAndNumber = new Map(
    relevantSets.map((set) => [`${set.workoutExerciseId}:${set.setNumber}`, set] as const),
  );

  const sequence: SupersetFlowStep[] = [];
  for (const setNumber of setNumbers) {
    for (const member of orderedMembers) {
      const set = setsByExerciseAndNumber.get(`${member.id}:${setNumber}`);
      if (!set) continue;
      sequence.push({
        exerciseId: member.id,
        supersetOrder: member.supersetOrder ?? 0,
        setNumber,
        completed: set.completed,
      });
    }
  }

  const completedSets = sequence.filter((step) => step.completed).length;
  const current = sequence.find((step) => !step.completed) ?? null;
  const complete = sequence.length > 0 && completedSets === sequence.length;

  if (sequence.length === 0) {
    const first = orderedMembers[0];
    return {
      completedSets: 0,
      totalSets: 0,
      currentExerciseId: first.id,
      currentSupersetOrder: first.supersetOrder,
      currentSetNumber: null,
      complete: false,
    };
  }

  return {
    completedSets,
    totalSets: sequence.length,
    currentExerciseId: current?.exerciseId ?? null,
    currentSupersetOrder: current?.supersetOrder ?? null,
    currentSetNumber: current?.setNumber ?? null,
    complete,
  };
}
