import { useRef } from 'react';
import { Button } from '../../components/ui';
import { navigateToPath } from '../../lib/appNavigation';
import type { PushNotificationService } from '../../pwa/pushNotificationService';
import type { PwaService } from '../../pwa/pwaService';
import { usePlatformAccess } from '../admin/hooks/usePlatformAccess';
import type { PlatformAccessService } from '../admin/platformAccessService';
import { signOut } from '../auth/authService';
import { createGroupService, type GroupService } from '../groups/groupService';
import { useGroups } from '../groups/hooks/useGroups';
import { usePendingGroupInvites } from '../groups/hooks/usePendingGroupInvites';
import type { OnboardingProfile } from '../onboarding';
import type { ProfilePictureService } from '../profile-picture/profilePictureService';
import { ProfilePictureManager } from '../profile-picture/components/ProfilePictureManager';
import { AccountDeletionPanel } from './AccountDeletionPanel';
import type { AccountDeletionService } from './accountDeletionService';
import { AccountSecuritySection } from './AccountSecuritySection';
import type { AccountSecurityService } from './accountSecurityService';
import { AppStatusSection } from './AppStatusSection';
import { NotificationSettingsSection } from './NotificationSettingsSection';
import type { NotificationPreferenceService } from './notificationPreferenceService';
import { ProfileSettingsForm } from './ProfileSettingsForm';
import { useProfileSettings } from './hooks/useProfileSettings';
import type { SettingsService } from './settingsService';
import styles from './SettingsScreen.module.css';

interface SettingsScreenProps {
  profile: OnboardingProfile;
  userEmail?: string;
  memberSince?: string | null;
  accessService?: PlatformAccessService;
  settingsService?: SettingsService;
  accountSecurityService?: AccountSecurityService;
  deletionService?: AccountDeletionService;
  groupService?: GroupService;
  profilePictureService?: ProfilePictureService;
  pwaService?: PwaService;
  notificationPreferenceService?: NotificationPreferenceService;
  pushNotificationService?: PushNotificationService;
  onProfileChanged?: () => Promise<unknown> | unknown;
}

export function SettingsScreen({
  profile,
  userEmail = '',
  memberSince = null,
  accessService,
  settingsService,
  accountSecurityService,
  deletionService,
  groupService: injectedGroupService,
  profilePictureService,
  pwaService,
  notificationPreferenceService,
  pushNotificationService,
  onProfileChanged,
}: SettingsScreenProps) {
  const platformAccess = usePlatformAccess(accessService);
  const profileSettings = useProfileSettings(profile, settingsService, onProfileChanged);
  const groupServiceRef = useRef<GroupService | null>(null);
  if (!groupServiceRef.current) groupServiceRef.current = injectedGroupService ?? createGroupService();
  const groups = useGroups(profile.id, groupServiceRef.current);
  const pendingInvites = usePendingGroupInvites(groupServiceRef.current);
  const showAdministration = platformAccess.state === 'ready'
    && platformAccess.access?.accountStatus === 'ACTIVE'
    && platformAccess.access.isPlatformAdmin;

  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <header className={styles.header}>
          <button className={styles.back} onClick={() => navigateToPath('/')} type="button">Back</button>
          <div>
            <p className={styles.eyebrow}>YOUR ACCOUNT</p>
            <h1>Profile & settings</h1>
          </div>
          <span aria-hidden="true" />
        </header>

        <section className={styles.section} aria-labelledby="settings-picture-heading">
          <div className={styles.sectionHeading}>
            <div>
              <p className={styles.eyebrow}>PHOTO</p>
              <h2 id="settings-picture-heading">Profile picture</h2>
            </div>
          </div>
          <ProfilePictureManager
            displayName={profileSettings.profile.displayName}
            service={profilePictureService}
            userId={profile.id}
          />
        </section>

        <ProfileSettingsForm
          busy={profileSettings.busy}
          error={profileSettings.error}
          notice={profileSettings.notice}
          onSave={profileSettings.save}
          profile={profileSettings.profile}
        />

        <NotificationSettingsSection
          preferenceService={notificationPreferenceService}
          pushService={pushNotificationService}
          userId={profile.id}
        />

        <AccountSecuritySection
          email={userEmail}
          memberSince={memberSince}
          onSignOut={() => void signOut()}
          service={accountSecurityService}
        />

        <section className={styles.section} aria-labelledby="settings-groups-heading">
          <div className={styles.sectionHeading}>
            <div>
              <p className={styles.eyebrow}>CREWS</p>
              <h2 id="settings-groups-heading">Groups</h2>
            </div>
            <Button onClick={() => navigateToPath('/?section=groups')} variant="secondary">Manage groups</Button>
          </div>
          {groups.status === 'loading' || pendingInvites.status === 'loading' ? <p className={styles.supportCopy}>Loading group status…</p> : null}
          {groups.status === 'error' ? <p className={styles.error} role="status">{groups.error}</p> : null}
          {pendingInvites.status === 'error' ? <p className={styles.error} role="status">{pendingInvites.error}</p> : null}
          {groups.status === 'ready' ? (
            groups.groups.length > 0 ? (
              <ul className={styles.groupList}>
                {groups.groups.map((group) => (
                  <li key={group.id}>
                    <span><strong>{group.name}</strong><small>{group.memberCount} {group.memberCount === 1 ? 'member' : 'members'}</small></span>
                    <span className={styles.role}>{group.role}</span>
                  </li>
                ))}
              </ul>
            ) : <p className={styles.supportCopy}>You are not currently in a group. Open Groups to create one or respond to invitations.</p>
          ) : null}
          {pendingInvites.status === 'ready' ? (
            <p className={styles.inviteCount}>{pendingInvites.invites.length} pending {pendingInvites.invites.length === 1 ? 'invitation' : 'invitations'}</p>
          ) : null}
        </section>

        <section className={styles.section} aria-labelledby="settings-privacy-heading">
          <div className={styles.sectionHeading}>
            <div>
              <p className={styles.eyebrow}>CONTROL</p>
              <h2 id="settings-privacy-heading">Privacy & data</h2>
            </div>
          </div>
          <p className={styles.supportCopy}>Your private workout details remain account-owned. Group competition and activity surfaces expose only the bounded data defined by their existing privacy rules.</p>
          <p className={styles.supportCopy}>Data export will appear only after its server lifecycle exists.</p>
          <AccountDeletionPanel service={deletionService} />
        </section>

        <AppStatusSection service={pwaService} />

        {showAdministration ? (
          <section className={styles.section} aria-labelledby="settings-admin-heading">
            <div className={styles.sectionHeading}>
              <div>
                <p className={styles.eyebrow}>AUTHORIZED</p>
                <h2 id="settings-admin-heading">Administration</h2>
              </div>
            </div>
            <p className={styles.supportCopy}>Platform administration is available for this active account. The destination re-checks authorization independently.</p>
            <Button onClick={() => navigateToPath('/platform-admin')}>Platform administration</Button>
          </section>
        ) : null}
      </main>
    </div>
  );
}
