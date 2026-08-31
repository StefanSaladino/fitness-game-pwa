import { useCallback, useEffect, useMemo, useState } from 'react';
import { AppShell, type AppSection } from '../../../components/layout';
import { Button } from '../../../components/ui';
import { navigateToPath, productPathForSection } from '../../../lib/appNavigation';
import { signOut } from '../../auth/authService';
import {
  createLiftingConsistencyService,
  type EarnedLiftingBadge,
  type LiftingConsistencyService,
} from '../../consistency';
import type { OnboardingProfile } from '../../onboarding';
import { BADGE_CATALOG } from '../badgeCatalog';
import { BadgeCoin } from './BadgeCoin';
import styles from './BadgeGalleryRoute.module.css';

type GalleryFilter = 'ALL' | 'EARNED' | 'LOCKED';
type LoadState =
  | { status: 'loading'; badges: EarnedLiftingBadge[]; error: '' }
  | { status: 'ready'; badges: EarnedLiftingBadge[]; error: '' }
  | { status: 'error'; badges: EarnedLiftingBadge[]; error: string };

interface BadgeGalleryRouteProps {
  profile: OnboardingProfile;
  service?: LiftingConsistencyService;
}

interface BadgeGalleryScreenProps {
  profile: OnboardingProfile;
  badges: EarnedLiftingBadge[];
  onNavigate: (section: AppSection) => void;
  onSignOut: () => void;
}

function GalleryShell({ profile, earnedCount, children, onNavigate, onSignOut }: BadgeGalleryScreenProps & { earnedCount: number; children: React.ReactNode }) {
  return (
    <AppShell
      activeItem="progress"
      mobileTitle="Badges"
      onNavigate={onNavigate}
      onSignOut={onSignOut}
      userLabel={profile.displayName}
      userMeta={`@${profile.username} · ${earnedCount}/${BADGE_CATALOG.length} badges`}
    >
      {children}
    </AppShell>
  );
}

export function BadgeGalleryScreen({ profile, badges, onNavigate, onSignOut }: BadgeGalleryScreenProps) {
  const [filter, setFilter] = useState<GalleryFilter>('ALL');
  const earnedByKey = useMemo(
    () => new Map(badges.map((badge) => [badge.badgeKey, badge.earnedAt])),
    [badges],
  );
  const visibleBadges = BADGE_CATALOG.filter((definition) => {
    if (filter === 'ALL') return true;
    const earned = earnedByKey.has(definition.key);
    return filter === 'EARNED' ? earned : !earned;
  });
  const earnedCount = earnedByKey.size;
  const progress = Math.round((earnedCount / BADGE_CATALOG.length) * 100);

  return (
    <GalleryShell
      badges={badges}
      earnedCount={earnedCount}
      onNavigate={onNavigate}
      onSignOut={onSignOut}
      profile={profile}
    >
      <div className={styles.page} data-badge-gallery>
        <header className={styles.hero}>
          <div>
            <p className={styles.kicker}>COLLECTION</p>
            <h1>Badge gallery</h1>
            <p className={styles.intro}>Every badge uses the same Top Set emblem. Tap to flip it, or drag horizontally to spin between the icon and achievement faces.</p>
          </div>
          <div className={styles.collectionStat} aria-label={`${earnedCount} of ${BADGE_CATALOG.length} badges earned`}>
            <strong>{earnedCount}</strong>
            <span>/ {BADGE_CATALOG.length} earned</span>
          </div>
          <div className={styles.progressTrack} aria-hidden="true">
            <span style={{ width: `${progress}%` }} />
          </div>
          <div className={styles.heroActions}>
            <Button onClick={() => onNavigate('progress')} variant="secondary">Back to progress</Button>
          </div>
        </header>

        <section className={styles.collection} aria-labelledby="badge-collection-heading">
          <div className={styles.collectionHeader}>
            <div>
              <p className={styles.kicker}>YOUR BADGES</p>
              <h2 id="badge-collection-heading">Collect the full set</h2>
            </div>
            <div className={styles.filters} role="group" aria-label="Filter badge collection">
              {(['ALL', 'EARNED', 'LOCKED'] as const).map((value) => (
                <button
                  aria-pressed={filter === value}
                  className={filter === value ? styles.filterActive : styles.filter}
                  key={value}
                  onClick={() => setFilter(value)}
                  type="button"
                >
                  {value === 'ALL' ? 'All' : value === 'EARNED' ? `Earned ${earnedCount}` : `Locked ${BADGE_CATALOG.length - earnedCount}`}
                </button>
              ))}
            </div>
          </div>

          {visibleBadges.length === 0 ? (
            <p className={styles.empty}>No badges match this filter yet.</p>
          ) : (
            <ul className={styles.grid}>
              {visibleBadges.map((definition) => {
                const earnedAt = earnedByKey.get(definition.key) ?? null;
                return (
                  <li data-badge-gallery-item={definition.key} key={definition.key}>
                    <BadgeCoin definition={definition} earnedAt={earnedAt} size="md" />
                    <div className={styles.badgeCaption}>
                      <strong>{definition.title}</strong>
                      <span>{earnedAt ? 'Earned' : 'Locked'} · {definition.category}</span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </GalleryShell>
  );
}

export function BadgeGalleryRoute({ profile, service }: BadgeGalleryRouteProps) {
  const resolvedService = useMemo(() => service ?? createLiftingConsistencyService(), [service]);
  const [state, setState] = useState<LoadState>({ status: 'loading', badges: [], error: '' });

  const load = useCallback(async () => {
    setState((current) => ({ status: 'loading', badges: current.badges, error: '' }));
    try {
      const summary = await resolvedService.load();
      setState({ status: 'ready', badges: summary.badges, error: '' });
    } catch (error) {
      setState((current) => ({
        status: 'error',
        badges: current.badges,
        error: error instanceof Error ? error.message : 'Badge collection was unavailable.',
      }));
    }
  }, [resolvedService]);

  useEffect(() => { void load(); }, [load]);

  const onNavigate = (section: AppSection) => {
    if (section === 'profile') {
      navigateToPath('/settings');
      return;
    }
    navigateToPath(productPathForSection(section));
  };
  const onSignOut = () => { void signOut(); };

  if (state.status === 'loading' && state.badges.length === 0) {
    return (
      <GalleryShell badges={[]} earnedCount={0} onNavigate={onNavigate} onSignOut={onSignOut} profile={profile}>
        <div className={styles.state} role="status">Loading your badge collection…</div>
      </GalleryShell>
    );
  }

  if (state.status === 'error' && state.badges.length === 0) {
    return (
      <GalleryShell badges={[]} earnedCount={0} onNavigate={onNavigate} onSignOut={onSignOut} profile={profile}>
        <section className={styles.state}>
          <p className={styles.kicker}>BADGES</p>
          <h1>Badge collection unavailable</h1>
          <p>{state.error}</p>
          <Button onClick={() => void load()}>Try again</Button>
        </section>
      </GalleryShell>
    );
  }

  return <BadgeGalleryScreen badges={state.badges} onNavigate={onNavigate} onSignOut={onSignOut} profile={profile} />;
}
