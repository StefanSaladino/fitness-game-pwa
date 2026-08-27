import { useState, type FormEvent } from 'react';
import battleRopeBanner from '../../../assets/fitness/top-set-battle-rope-banner.jpg';
import { AppShell, DestinationBanner, type AppSection } from '../../../components/layout';
import { Button } from '../../../components/ui';
import type { OnboardingProfile } from '../../onboarding';
import {
  CARDIO_CATEGORIES,
  CARDIO_CATEGORY_LABELS,
  cardioDurationTierXp,
  cardioMinimumMinutes,
  validateCardioLogInput,
  type CardioCategory,
  type CardioLogInput,
  type CardioSnapshot,
} from '../model';
import styles from './CardioScreen.module.css';

function duration(seconds: number) {
  const minutes = Math.round(seconds / 60);
  return minutes >= 60
    ? `${Math.floor(minutes / 60)}h ${minutes % 60}m`
    : `${minutes} min`;
}

function dateLabel(value: string) {
  return new Intl.DateTimeFormat('en-CA', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(`${value}T12:00:00Z`));
}

function tierGuide(category: CardioCategory): string {
  const minimum = cardioMinimumMinutes(category);
  if (minimum >= 30) {
    return `${minimum}–44 min +10 XP · 45+ min +15 XP`;
  }
  return `${minimum}–29 min +5 XP · 30–44 min +10 XP · 45+ min +15 XP`;
}

interface Props {
  profile: OnboardingProfile;
  onNavigate: (section: AppSection) => void;
  onSignOut: () => void;
  status: 'loading' | 'ready' | 'error';
  snapshot: CardioSnapshot | null;
  error: string;
  busy: boolean;
  retry: () => Promise<unknown>;
  log: (input: CardioLogInput) => Promise<boolean>;
  remove: (id: string) => Promise<boolean>;
}

export function CardioScreen({
  profile,
  onNavigate,
  onSignOut,
  status,
  snapshot,
  error,
  busy,
  retry,
  log,
  remove,
}: Props) {
  const [category, setCategory] = useState<CardioCategory>('RUNNING');
  const [minutes, setMinutes] = useState('20');
  const [notes, setNotes] = useState('');
  const [localError, setLocalError] = useState('');

  const parsed = Number(minutes);
  const tier = cardioDurationTierXp(category, parsed);
  const minimum = cardioMinimumMinutes(category);

  const submit = async (event: FormEvent) => {
    event.preventDefault();

    const input: CardioLogInput = {
      category,
      activeDurationMinutes: parsed,
      notes,
    };

    const validation = validateCardioLogInput(input);
    if (validation) {
      setLocalError(validation);
      return;
    }

    setLocalError('');
    if (await log(input)) {
      setMinutes('20');
      setNotes('');
    }
  };

  return (
    <AppShell
      activeItem="workouts"
      mobileTitle="Cardio"
      onNavigate={onNavigate}
      onSignOut={onSignOut}
      userLabel={profile.displayName}
      userMeta={`@${profile.username}`}
    >
      <div className={styles.page} data-cardio-page>
        <DestinationBanner className={styles.header} data-cardio-surface="identity" imagePosition="center 40%" imageSrc={battleRopeBanner}>
          <div>
            <p className={styles.kicker}>CARDIO ACCESSORY</p>
            <h1>Log cardio</h1>
            <p>A small daily bonus. Cardio never counts as a lifting day.</p>
          </div>
          <button
            className={styles.backToLift}
            onClick={() => onNavigate('workouts')}
            type="button"
          >
            Back to Lift
          </button>
        </DestinationBanner>

        <div className={styles.desktopGrid}>
          <section
            className={styles.logSection}
            aria-labelledby="cardio-log-heading"
            data-app-surface="primary"
            data-cardio-surface="quick-log"
          >
            <div className={styles.sectionHeading}>
              <p className={styles.sectionLabel}>NEW ACTIVITY</p>
              <h2 id="cardio-log-heading">Completed cardio</h2>
              <p>Log active duration only. The day’s best eligible cardio activity owns the bonus.</p>
            </div>

            <form className={styles.form} onSubmit={submit}>
              <fieldset className={styles.activityFieldset}>
                <legend>Activity</legend>
                <div className={styles.activityRail} role="group" aria-label="Cardio activity">
                  {CARDIO_CATEGORIES.map((item) => (
                    <button
                      aria-pressed={category === item}
                      key={item}
                      onClick={() => setCategory(item)}
                      type="button"
                    >
                      {CARDIO_CATEGORY_LABELS[item]}
                    </button>
                  ))}
                </div>
              </fieldset>

              <label className={styles.durationField}>
                <span>Active minutes</span>
                <span className={styles.durationInput}>
                  <input
                    aria-label="Active minutes"
                    inputMode="numeric"
                    max="360"
                    min="1"
                    onChange={(event) => setMinutes(event.target.value)}
                    step="1"
                    type="number"
                    value={minutes}
                  />
                  <small>min</small>
                </span>
              </label>

              <div className={styles.tier} aria-live="polite" data-cardio-tier>
                <span>Bonus preview</span>
                <div className={styles.tierHeadline}>
                  <strong>{tier > 0 ? `+${tier} XP` : 'Below bonus minimum'}</strong>
                  <b>{CARDIO_CATEGORY_LABELS[category]}</b>
                </div>
                <p>
                  {tier === 0
                    ? `${CARDIO_CATEGORY_LABELS[category]} needs at least ${minimum} active minutes.`
                    : `Only the day’s best eligible cardio bonus is awarded.`}
                </p>
                <small>{tierGuide(category)}</small>
              </div>

              <details className={styles.notes}>
                <summary>
                  <span>Add a note</span>
                  <small>Optional</small>
                </summary>
                <label>
                  <span className={styles.visuallyHidden}>Notes</span>
                  <textarea
                    maxLength={5000}
                    onChange={(event) => setNotes(event.target.value)}
                    placeholder="Easy run, pickup hockey, intervals…"
                    rows={3}
                    value={notes}
                  />
                </label>
              </details>

              {(localError || error) && (
                <p className={styles.error} role="alert">{localError || error}</p>
              )}

              <Button disabled={busy} type="submit">
                {busy ? 'Saving…' : 'Log cardio'}
              </Button>
            </form>
          </section>

          <div className={styles.activityHistory}>
            {status === 'loading' && !snapshot ? (
              <div className={styles.state} data-app-surface="category" data-cardio-surface="history-state" role="status">Loading cardio history…</div>
            ) : status === 'error' && !snapshot ? (
              <div className={styles.state} data-app-surface="category" data-cardio-surface="history-state">
                <p>{error}</p>
                <Button onClick={() => void retry()}>Try again</Button>
              </div>
            ) : snapshot ? (
              <>
                <section className={styles.summary} aria-label="Cardio summary" data-app-surface="category" data-cardio-surface="summary">
                  <p className={styles.sectionLabel}>LAST 30 DAYS</p>
                  <div className={styles.summaryPrimary}>
                    <strong>
                      {snapshot.summary.last30DaysActivities}{' '}
                      {snapshot.summary.last30DaysActivities === 1 ? 'activity' : 'activities'}
                    </strong>
                    <strong>{snapshot.summary.last30DaysActiveMinutes} min</strong>
                    <b>{snapshot.summary.last30DaysBonusXp} XP bonus</b>
                  </div>
                  <p>
                    All time · {snapshot.summary.totalActivities}{' '}
                    {snapshot.summary.totalActivities === 1 ? 'activity' : 'activities'} ·{' '}
                    {snapshot.summary.totalActiveMinutes} min
                  </p>
                  <small>Accessory summary — weekly lifting consistency is unchanged.</small>
                </section>

                <section
                  className={styles.history}
                  aria-labelledby="cardio-history-heading"
                  data-app-surface="category"
                  data-cardio-surface="history"
                >
                  <div className={styles.sectionHeading}>
                    <p className={styles.sectionLabel}>HISTORY</p>
                    <h2 id="cardio-history-heading">Recent cardio</h2>
                    <p>Accessory history only—these sessions do not increase weekly lifting-day consistency.</p>
                  </div>

                  {snapshot.history.length === 0 ? (
                    <p className={styles.empty}>No cardio logged yet.</p>
                  ) : (
                    <ul>
                      {snapshot.history.map((entry) => (
                        <li key={entry.workoutId}>
                          <div className={styles.historyMain}>
                            <strong>{CARDIO_CATEGORY_LABELS[entry.category]}</strong>
                            <span>{dateLabel(entry.scoringDate)} · {duration(entry.activeDurationSeconds)}</span>
                            {entry.notes && <small>{entry.notes}</small>}
                          </div>

                          <div className={styles.historyRight}>
                            <span className={entry.dailyBonusXp > 0 ? styles.bonus : styles.noBonus}>
                              {entry.dailyBonusXp > 0
                                ? `+${entry.dailyBonusXp} XP`
                                : entry.qualifiesCardioBonus
                                  ? 'Eligible · another activity owns today’s bonus'
                                  : 'No bonus'}
                            </span>
                            <button
                              aria-label={`Delete ${CARDIO_CATEGORY_LABELS[entry.category]} from ${entry.scoringDate}`}
                              className={styles.deleteButton}
                              disabled={busy}
                              onClick={() => void remove(entry.workoutId)}
                              type="button"
                            >
                              Delete
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              </>
            ) : null}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
