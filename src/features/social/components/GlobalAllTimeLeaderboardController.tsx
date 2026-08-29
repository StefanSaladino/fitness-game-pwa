import { AppShell, type AppSection } from '../../../components/layout';
import { Button } from '../../../components/ui';
import type { OnboardingProfile } from '../../onboarding';
import { useGlobalAllTimeLeaderboard } from '../hooks/useGlobalAllTimeLeaderboard';
import type { GroupSocialService } from '../socialService';
import { GlobalAllTimeLeaderboardScreen } from './GlobalAllTimeLeaderboardScreen';
import styles from './GroupSocialScreen.module.css';

interface Props {
  profile: OnboardingProfile;
  hasGroup: boolean;
  onNavigate: (section: AppSection) => void;
  onSignOut: () => void;
  onShowGroup: () => void;
  service?: GroupSocialService;
}

export function GlobalAllTimeLeaderboardController(props: Props) {
  const global = useGlobalAllTimeLeaderboard(props.service);
  if (global.status === 'loading' || !global.leaderboard) {
    if (global.status === 'error') {
      return <AppShell activeItem="compete" onNavigate={props.onNavigate} onSignOut={props.onSignOut} userLabel={props.profile.displayName} userMeta={`@${props.profile.username}`}><section className={styles.state}><p>{global.error}</p><Button onClick={() => void global.retry()}>Try again</Button></section></AppShell>;
    }
    return <AppShell activeItem="compete" onNavigate={props.onNavigate} onSignOut={props.onSignOut} userLabel={props.profile.displayName} userMeta={`@${props.profile.username}`}><div className={styles.state} role="status">Loading global all-time leaderboard…</div></AppShell>;
  }

  return <GlobalAllTimeLeaderboardScreen hasGroup={props.hasGroup} leaderboard={global.leaderboard} onNavigate={props.onNavigate} onShowGroup={props.onShowGroup} onSignOut={props.onSignOut} profile={props.profile} />;
}
