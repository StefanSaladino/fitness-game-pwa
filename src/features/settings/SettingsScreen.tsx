import { signOut } from '../auth/authService';
import type { OnboardingProfile } from '../onboarding';
import { usePlatformAccess } from '../admin/hooks/usePlatformAccess';
import type { PlatformAccessService } from '../admin/platformAccessService';
import { navigateToPath } from '../../lib/appNavigation';
import styles from './SettingsScreen.module.css';

interface SettingsScreenProps {
  profile: OnboardingProfile;
  accessService?: PlatformAccessService;
}

export function SettingsScreen({ profile, accessService }: SettingsScreenProps) {
  const platformAccess = usePlatformAccess(accessService);
  const showAdministration = platformAccess.state === 'ready'
    && platformAccess.access?.accountStatus === 'ACTIVE'
    && platformAccess.access.isPlatformAdmin;

  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <header className={styles.header}>
          <button className={styles.back} onClick={() => navigateToPath('/')} type="button">Back</button>
          <h1>Profile & settings</h1>
          <span aria-hidden="true" />
        </header>

        <section className={styles.section} aria-labelledby="settings-profile-heading">
          <h2 id="settings-profile-heading">Profile</h2>
          <div className={styles.rows}>
            <div className={styles.row}><span>Display name</span><strong>{profile.displayName}</strong></div>
            <div className={styles.row}><span>Username</span><strong>@{profile.username}</strong></div>
            <div className={styles.row}><span>Time zone</span><strong>{profile.timezone}</strong></div>
            <div className={styles.row}><span>Weekly lifting target</span><strong>{profile.weeklyWorkoutTarget} days</strong></div>
          </div>
        </section>

        {showAdministration && (
          <section className={styles.section} aria-labelledby="settings-admin-heading">
            <h2 id="settings-admin-heading">Administration</h2>
            <p className={styles.adminCopy}>Platform administration is available for this account.</p>
            <button className={styles.adminLink} onClick={() => navigateToPath('/platform-admin')} type="button">
              Platform administration
            </button>
          </section>
        )}

        <footer className={styles.footer}>
          <button className={styles.signOut} onClick={() => void signOut()} type="button">Sign out</button>
        </footer>
      </main>
    </div>
  );
}
