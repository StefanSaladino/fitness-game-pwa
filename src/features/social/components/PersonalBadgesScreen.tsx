import competitionBanner from '../../../assets/fitness/top-set-kettlebell-chalk.jpg';
import { AppShell, DestinationBanner, type AppSection } from '../../../components/layout';
import { Button } from '../../../components/ui';
import type { LiftingBadgeProgressService } from '../../consistency';
import type { OnboardingProfile } from '../../onboarding';
import { PersonalBadgeCollectionPanel } from './PersonalBadgeCollectionPanel';
import styles from './GroupSocialScreen.module.css';

interface Props {
  profile: OnboardingProfile;
  onNavigate: (section: AppSection) => void;
  onSignOut: () => void;
  onShowStandings: () => void;
  badgeProgressService?: LiftingBadgeProgressService;
}

export function PersonalBadgesScreen({
  profile,
  onNavigate,
  onSignOut,
  onShowStandings,
  badgeProgressService,
}: Props) {
  return (
    <AppShell
      activeItem="compete"
      onNavigate={onNavigate}
      onSignOut={onSignOut}
      userLabel={profile.displayName}
      userMeta={`@${profile.username} · ${profile.weeklyWorkoutTarget} lift days`}
    >
      <div className={styles.page} data-personal-badges-composition>
        <DestinationBanner className={styles.headerSurface} imagePosition="center 50%" imageSrc={competitionBanner}>
          <div className={styles.headerCopy}>
            <p className={styles.kicker}>COMPETE</p>
            <h1>Your badges</h1>
            <p>Your personal achievement collection across lifting, progression, consistency, and cardio.</p>
          </div>
          <Button className={styles.manageGroupButton} onClick={onShowStandings} variant="secondary">
            Global standings
          </Button>
        </DestinationBanner>

        <PersonalBadgeCollectionPanel service={badgeProgressService} />
      </div>
    </AppShell>
  );
}
