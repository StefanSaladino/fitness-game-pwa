import chestIcon from '../../../assets/muscle-groups/chest.png';
import backIcon from '../../../assets/muscle-groups/back.png';
import shouldersIcon from '../../../assets/muscle-groups/shoulders.png';
import bicepsIcon from '../../../assets/muscle-groups/biceps.png';
import tricepsIcon from '../../../assets/muscle-groups/triceps.png';
import forearmsGripIcon from '../../../assets/muscle-groups/forearms-grip.png';
import coreIcon from '../../../assets/muscle-groups/core.png';
import obliquesIcon from '../../../assets/muscle-groups/obliques.png';
import quadsIcon from '../../../assets/muscle-groups/quads.png';
import hamstringsIcon from '../../../assets/muscle-groups/hamstrings.png';
import glutesIcon from '../../../assets/muscle-groups/glutes.png';
import calvesIcon from '../../../assets/muscle-groups/calves.png';
import neckIcon from '../../../assets/muscle-groups/neck.png';
import fullBodyIcon from '../../../assets/muscle-groups/full-body.png';
import { MUSCLE_GROUP_LABELS } from '../exerciseSearch';
import type { ExerciseMuscleGroup } from '../model';
import styles from './MuscleGroupFilter.module.css';

interface MuscleGroupSelectorProps {
  disabled?: boolean;
  onSelect: (value: ExerciseMuscleGroup) => void;
}

const ICONS: Partial<Record<ExerciseMuscleGroup, string>> = {
  CHEST: chestIcon,
  BACK: backIcon,
  SHOULDERS: shouldersIcon,
  BICEPS: bicepsIcon,
  TRICEPS: tricepsIcon,
  FOREARMS_GRIP: forearmsGripIcon,
  CORE: coreIcon,
  OBLIQUES: obliquesIcon,
  QUADS: quadsIcon,
  HAMSTRINGS: hamstringsIcon,
  GLUTES: glutesIcon,
  CALVES: calvesIcon,
  NECK: neckIcon,
  FULL_BODY: fullBodyIcon,
};

const TARGETED_GROUPS = Object.keys(ICONS) as ExerciseMuscleGroup[];

export function MuscleGroupSelector({ disabled = false, onSelect }: MuscleGroupSelectorProps) {
  return (
    <section aria-labelledby="muscle-group-selector-title" className={styles.filter}>
      <div className={styles.heading}>
        <h3 id="muscle-group-selector-title">Browse by muscle group</h3>
        <span>Select a group to open its exercise library.</span>
      </div>

      <div className={styles.grid}>
        {TARGETED_GROUPS.map((group) => (
          <button
            aria-label={`Open ${MUSCLE_GROUP_LABELS[group]} exercises`}
            className={styles.option}
            disabled={disabled}
            key={group}
            onClick={() => onSelect(group)}
            type="button"
          >
            <img alt="" aria-hidden="true" src={ICONS[group]} />
            <span className={styles.label}>{MUSCLE_GROUP_LABELS[group]}</span>
            <span aria-hidden="true" className={styles.arrow}>›</span>
          </button>
        ))}
      </div>

      <button
        className={styles.other}
        disabled={disabled}
        onClick={() => onSelect('OTHER')}
        type="button"
      >
        Other / uncategorized
        <span aria-hidden="true">›</span>
      </button>
    </section>
  );
}
