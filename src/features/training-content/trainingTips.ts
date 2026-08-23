export interface TrainingTip {
  id: string;
  title: string;
  body: string;
  context: 'GENERAL' | 'WORKOUT';
}

export const trainingTips: readonly TrainingTip[] = [
  {
    id: 'small-load-jumps',
    title: 'Progress with small jumps',
    body: 'When all working sets are clean and repeatable, a small increase next time is often enough. You do not need a dramatic jump to make progress.',
    context: 'GENERAL',
  },
  {
    id: 'repeatable-technique',
    title: 'Make good reps repeatable',
    body: 'A useful working set looks similar from the first rep to the last. If technique changes sharply, treat that as information instead of forcing extra load.',
    context: 'WORKOUT',
  },
  {
    id: 'rest-for-output',
    title: 'Rest for the next set',
    body: 'Heavy compound sets usually benefit from more recovery than small isolation work. Rest long enough that the next set reflects strength, not rushed fatigue.',
    context: 'WORKOUT',
  },
  {
    id: 'warm-up-with-purpose',
    title: 'Warm up without tiring yourself out',
    body: 'Build toward your working weight in a few controlled steps. Warm-up sets should prepare the movement, not become the hardest part of the session.',
    context: 'WORKOUT',
  },
  {
    id: 'stable-exercise-order',
    title: 'Keep key lifts early',
    body: 'Putting your priority lifts near the start of similar sessions makes their performance easier to compare over time.',
    context: 'GENERAL',
  },
  {
    id: 'compare-similar-sessions',
    title: 'Compare like with like',
    body: 'Progress is easier to read when you compare the same exercise, similar rep ranges, and similar set quality instead of chasing one unusual day.',
    context: 'GENERAL',
  },
  {
    id: 'controlled-range',
    title: 'Control the range you can own',
    body: 'Choose a load that lets you control the movement you intend to train. More weight is only useful when the target movement still looks like itself.',
    context: 'WORKOUT',
  },
  {
    id: 'isolation-smaller-jumps',
    title: 'Use smaller jumps on smaller lifts',
    body: 'Curls, raises, and other smaller movements often progress better with modest load or rep increases than with large weight jumps.',
    context: 'GENERAL',
  },
  {
    id: 'consistency-over-perfect-week',
    title: 'One missed day is not lost progress',
    body: 'Training consistency is built across many weeks. Missing one planned day matters less than returning to a repeatable routine.',
    context: 'GENERAL',
  },
  {
    id: 'log-before-memory-fades',
    title: 'Log the set while it is fresh',
    body: 'Recording weight and reps close to the set keeps your history more useful than reconstructing the session from memory later.',
    context: 'WORKOUT',
  },
  {
    id: 'quality-before-volume',
    title: 'More work is not automatically better',
    body: 'Extra sets are useful only when they still add quality work. Stop adding volume simply because the session feels too short.',
    context: 'GENERAL',
  },
  {
    id: 'progress-is-multiple-signals',
    title: 'Progress is more than one number',
    body: 'A heavier load, more reps at the same load, cleaner execution, or repeating a strong performance can all be useful signs of progress.',
    context: 'GENERAL',
  },
] as const;

function dateKey(value: Date): number {
  const year = value.getUTCFullYear();
  const month = value.getUTCMonth() + 1;
  const day = value.getUTCDate();
  return year * 372 + month * 31 + day;
}

function stringKey(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) hash = ((hash * 31) + value.charCodeAt(index)) >>> 0;
  return hash;
}

export function trainingTipForDate(date: Date, userId: string, context?: TrainingTip['context']): TrainingTip {
  const eligible = context ? trainingTips.filter((tip) => tip.context === context || tip.context === 'GENERAL') : trainingTips;
  const index = (dateKey(date) + stringKey(userId)) % eligible.length;
  return eligible[index];
}
