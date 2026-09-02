import { liftingBadgeArtwork } from '../badgeArtwork';
import { liftingBadgeProgressEntries } from '../badgeProgress';
import { liftingBadgeDefinitions } from '../badges';
import type { LiftingBadgeDefinition, LiftingBadgeProgressSnapshot } from '../model';
import styles from './BadgeCollection.module.css';

interface BadgeCollectionProps {
  snapshot: LiftingBadgeProgressSnapshot;
}

function formatEarnedDate(value: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value));
}

function categoryLabel(definition: LiftingBadgeDefinition): string {
  if (definition.category === 'PR') return 'Personal record';
  if (definition.category === 'LIFTING') return 'Lift days';
  if (definition.category === 'CONSISTENCY') return 'Consistency';
  return 'Cardio bonus';
}

export function BadgeCollection({ snapshot }: BadgeCollectionProps) {
  const earnedByKey = new Map(snapshot.badges.map((badge) => [badge.badgeKey, badge]));
  const progressByKey = new Map(liftingBadgeProgressEntries(snapshot).map((progress) => [progress.badgeKey, progress]));
  const definitions = [...liftingBadgeDefinitions()].sort((left, right) => {
    const earnedDifference = Number(earnedByKey.has(right.key)) - Number(earnedByKey.has(left.key));
    return earnedDifference;
  });

  return (
    <section
      className={styles.collection}
      aria-labelledby="badge-collection-heading"
      data-app-surface="category"
      data-badge-collection
    >
      <header className={styles.header}>
        <div>
          <p className={styles.kicker}>Achievements</p>
          <h2 id="badge-collection-heading">Badge collection</h2>
          <p className={styles.intro}>
            Recognition for personal records, lift days, weekly consistency, and accessory cardio.
          </p>
        </div>
        <strong className={styles.total}>{earnedByKey.size} / {definitions.length} earned</strong>
      </header>

      <div className={styles.grid}>
        {definitions.map((definition) => {
          const earned = earnedByKey.get(definition.key);
          const progress = progressByKey.get(definition.key)!;
          const status = earned ? 'earned' : 'locked';

          return (
            <article
              className={styles.badge}
              data-badge-category={definition.category}
              data-badge-key={definition.key}
              data-badge-progress-current={progress.current}
              data-badge-progress-required={progress.required}
              data-badge-status={status}
              key={definition.key}
            >
              <div className={styles.artwork}>
                <img
                  alt={`${definition.title} badge`}
                  className={earned ? styles.earnedArtwork : styles.lockedArtwork}
                  src={liftingBadgeArtwork(definition.key)}
                />
              </div>
              <div className={styles.copy}>
                <span className={styles.status}>
                  {earned ? 'Earned' : 'Locked'} · {categoryLabel(definition)}
                </span>
                <strong>{definition.title}</strong>
                <p>{definition.description}</p>

                <div className={styles.progressCopy}>
                  <span>{progress.label}</span>
                  {!earned && progress.remaining > 0 && <small>{progress.remaining} to go</small>}
                </div>

                {progress.showBar && (
                  <div
                    aria-label={`${definition.title} progress`}
                    aria-valuemax={progress.required}
                    aria-valuemin={0}
                    aria-valuenow={progress.current}
                    className={styles.progressTrack}
                    role="progressbar"
                  >
                    <span className={styles.progressFill} style={{ width: `${progress.percent}%` }} />
                  </div>
                )}

                {earned ? (
                  <time dateTime={earned.earnedAt}>Earned {formatEarnedDate(earned.earnedAt)}</time>
                ) : (
                  <span className={styles.lockedText}>Not earned yet</span>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
