import {
  navigateToPath,
  TRAINING_REPORTS_PATH,
} from '../../../lib/appNavigation';
import styles from './TrainingVolumeEntryCard.module.css';

interface TrainingVolumeEntryCardProps {
  onOpen: () => void;
}

export function TrainingVolumeEntryCard({ onOpen }: TrainingVolumeEntryCardProps) {
  return (
    <section
      className={styles.card}
      data-app-surface="category"
      data-progress-surface="volume-targets-entry"
    >
      <div>
        <p>Training tools</p>
        <h2>Volume targets & completed reports</h2>
        <span>
          Check current effective-set targets or review completed weekly and monthly training reports with performance-aware corrective plans.
        </span>
      </div>

      <div className={styles.actions}>
        <button onClick={onOpen} type="button">
          Volume targets
          <span aria-hidden="true">→</span>
        </button>
        <button
          onClick={() => navigateToPath(TRAINING_REPORTS_PATH)}
          type="button"
        >
          Training reports
          <span aria-hidden="true">→</span>
        </button>
      </div>
    </section>
  );
}
