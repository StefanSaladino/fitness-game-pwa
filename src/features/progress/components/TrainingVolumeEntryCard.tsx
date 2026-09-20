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
        <p>Training volume</p>
        <h2>Check volume targets</h2>
        <span>
          Open the dedicated muscle-volume view for 7-day and 28-day effective-set targets.
        </span>
      </div>

      <button onClick={onOpen} type="button">
        View targets
        <span aria-hidden="true">→</span>
      </button>
    </section>
  );
}
