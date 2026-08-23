import type { TrainingTip } from './trainingTips';
import styles from './TrainingTipSurface.module.css';

interface TrainingTipSurfaceProps {
  tip: TrainingTip;
  compact?: boolean;
}

export function TrainingTipSurface({ tip, compact = false }: TrainingTipSurfaceProps) {
  return (
    <aside className={`${styles.tip}${compact ? ` ${styles.compact}` : ''}`} aria-label="Training tip">
      <div className={styles.icon} aria-hidden="true">↗</div>
      <div className={styles.copy}>
        <span>Training tip</span>
        <strong>{tip.title}</strong>
        <p>{tip.body}</p>
      </div>
    </aside>
  );
}
