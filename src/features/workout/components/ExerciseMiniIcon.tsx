import backSquatIcon from '../../../assets/fitness/exercise-icons/back-squat.png';
import benchPressIcon from '../../../assets/fitness/exercise-icons/bench-press.png';
import deadliftIcon from '../../../assets/fitness/exercise-icons/deadlift.png';
import dumbbellCurlIcon from '../../../assets/fitness/exercise-icons/dumbbell-curl.png';
import genericWeightIcon from '../../../assets/fitness/exercise-icons/generic-weight.png';
import inclinePressIcon from '../../../assets/fitness/exercise-icons/incline-press.png';
import overheadPressIcon from '../../../assets/fitness/exercise-icons/overhead-press.png';

interface ExerciseMiniIconProps {
  canonicalName: string;
  className?: string;
}

export type ExerciseMiniIconKind =
  | 'bench-press'
  | 'incline-press'
  | 'back-squat'
  | 'overhead-press'
  | 'deadlift'
  | 'dumbbell-curl'
  | 'generic-weight';

export function exerciseMiniIconKind(canonicalName: string): ExerciseMiniIconKind {
  const name = canonicalName.trim().toLocaleLowerCase('en-CA').replace(/\s+/g, ' ');

  if (/^incline (?:barbell |dumbbell )?bench press$/.test(name)) return 'incline-press';
  if (/^(?:flat )?(?:barbell |dumbbell )?bench press$/.test(name)) return 'bench-press';
  if (/^(?:barbell )?back squat$/.test(name)) return 'back-squat';
  if (/^(?:barbell |conventional |sumo )?deadlift$/.test(name)) return 'deadlift';
  if (/^(?:(?:barbell|dumbbell) )?(?:overhead|military) press$/.test(name) || /^(?:seated )?dumbbell shoulder press$/.test(name)) return 'overhead-press';
  if (/^(?:alternating )?dumbbell curl$/.test(name)) return 'dumbbell-curl';
  return 'generic-weight';
}

const ICONS: Record<ExerciseMiniIconKind, string> = {
  'bench-press': benchPressIcon,
  'incline-press': inclinePressIcon,
  'back-squat': backSquatIcon,
  deadlift: deadliftIcon,
  'overhead-press': overheadPressIcon,
  'dumbbell-curl': dumbbellCurlIcon,
  'generic-weight': genericWeightIcon,
};

export function ExerciseMiniIcon({ canonicalName, className }: ExerciseMiniIconProps) {
  const kind = exerciseMiniIconKind(canonicalName);
  return <img alt="" aria-hidden="true" className={className} src={ICONS[kind]} />;
}
