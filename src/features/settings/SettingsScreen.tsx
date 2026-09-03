import { useRef, useState, type ReactNode } from 'react';
import { Button, Icon } from '../../components/ui';
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
import { ProfilePictureManager } from '../profile-picture/components/ProfilePictureManager';
import type { ProfilePictureService } from '../profile-picture/profilePictureService';
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

type SettingsPanel = 'profile' | 'training' | 'notifications' | 'security' | 'groups' | 'privacy' | 'app' | 'admin';

const panelTitles: Record<SettingsPanel, string> = {
  profile: 'Profile',
  training: 'Training',
  notifications: 'Notifications',
  security: 'Security',
  groups: 'Groups',
  privacy: 'Privacy & data',
  app: 'App status',
  admin: 'Administration',
};

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

function SettingsRow({ label, detail, onClick }: { label: string; detail: string; onClick(): void }) {
  return (
    <button aria-label={label} className={styles.settingsRow} onClick={onClick} type="button">
      <span>
        <strong>{label}</strong>
        <small>{detail}</small>
      </span>
      <span aria-hidden="true" className={styles.rowChevron}>›</span>
    </button>
  );
}

function SettingsGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className={styles.settingsGroup} aria-labelledby={`settings-group-${title.toLowerCase().replaceAll(' ', '-')}`} data-app-surface="category">
      <h2 id={`settings-group-${title.toLowerCase().replaceAll(' ', '-')}`}>{title}</h2>
      <div className={styles.settingsRows}>{children}</div>
    </section>
  );
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
  const [panel, setPanel] = useState<SettingsPanel | null>(null);
  const platformAccess = usePlatformAccess(accessService);
  const profileSettings = useProfileSettings(profile, settingsService, onProfileChanged);
  const groupServiceRef = useRef<GroupService | null>(null);
  if (!groupServiceRef.current) groupServiceRef.current = injectedGroupService ?? createGroupService();
  const groups = useGroups(profile.id, groupServiceRef.current);
  const pendingInvites = usePendingGroupInvites(groupServiceRef.current);
  const showAdministration = platformAccess.state === 'ready'
    && platformAccess.access?.accountStatus === 'ACTIVE'
    && platformAccess.access.isPlatformAdmin;
  const groupSummary = groups.status === 'ready'
    ? `${groups.groups.length} ${groups.groups.length === 1 ? 'group' : 'groups'}`
    : 'Checking membership';

  const openPanel = (nextPanel: SettingsPanel) => {
    setPanel(nextPanel);
  };

  const goBack = () => {
    if (panel) {
      setPanel(null);
      return;
    }
    navigateToPath('/');
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <button aria-label="Back" className={styles.back} onClick={goBack} type="button">
          <Icon name="chevron-left" size={26} />
        </button>
        <div className={styles.headerTitle}>
          <p className={styles.eyebrow}>{panel ? 'SETTINGS' : 'YOUR ACCOUNT'}</p>
          <h1>{panel ? panelTitles[panel] : 'Settings'}</h1>
        </div>
        <div className={styles.headerActions}>
          <span className={styles.messageSlot} data-app-message-slot="settings" />
          <button aria-label="Sign out" className={styles.headerSignOut} onClick={() => void signOut()} type="button">
            <Icon name="logout" size={19} />
          </button>
        </div>
      </header>

      <main className={styles.main} data-settings-view={panel ?? 'index'}>
        {!panel ? (
          <div className={styles.index}>
            <div className={styles.accountSummary} data-app-surface="primary">
              <div>
                <strong>{profileSettings.profile.displayName}</strong>
                <span>@{profileSettings.profile.username}{userEmail ? ` · ${userEmail}` : ''}</span>
              </div>
              <button onClick={() => void signOut()} type="button">Sign out</button>
            </div>

            <SettingsGroup title="Account">
              <SettingsRow detail="Photo, name, username, and invite ID" label="Profile" onClick={() => openPanel('profile')} />
              <SettingsRow detail={userEmail || 'Password and sign-out controls'} label="Security" onClick={() => openPanel('security')} />
            </SettingsGroup>

            <SettingsGroup title="Training & preferences">
              <SettingsRow detail={`${profileSettings.profile.weeklyWorkoutTarget} lift days · ${profileSettings.profile.preferredWeightUnit}`} label="Training" onClick={() => openPanel('training')} />
              <SettingsRow detail="Optional push and device permissions" label="Notifications" onClick={() => openPanel('notifications')} />
              <SettingsRow detail={groupSummary} label="Groups" onClick={() => openPanel('groups')} />
            </SettingsGroup>

            <SettingsGroup title="App & control">
              <SettingsRow detail="Install, offline storage, and updates" label="App status" onClick={() => openPanel('app')} />
              <SettingsRow detail="Account-owned data and deletion" label="Privacy & data" onClick={() => openPanel('privacy')} />
              {showAdministration ? <SettingsRow detail="Authorized platform controls" label="Administration" onClick={() => openPanel('admin')} /> : null}
            </SettingsGroup>
          </div>
        ) : null}

        {panel === 'profile' ? (
          <div className={styles.panelStack}>
            <section className={styles.section} aria-labelledby="settings-picture-heading" data-app-surface="category">
              <div className={styles.sectionHeading}>
                <div>
                  <p className={styles.eyebrow}>PHOTO</p>
                  <h2 id="settings-picture-heading">Profile picture</h2>
                </div>
              </div>
              <ProfilePictureManager displayName={profileSettings.profile.displayName} service={profilePictureService} userId={profile.id} />
            </section>
            <ProfileSettingsForm
              busy={profileSettings.busy}
              error={profileSettings.error}
              mode="profile"
              notice={profileSettings.notice}
              onSave={profileSettings.save}
              profile={profileSettings.profile}
            />
          </div>
        ) : null}

        {panel === 'training' ? (
          <ProfileSettingsForm
            busy={profileSettings.busy}
            error={profileSettings.error}
            mode="training"
            notice={profileSettings.notice}
            onSave={profileSettings.save}
            profile={profileSettings.profile}
          />
        ) : null}

        {panel === 'notifications' ? (
          <NotificationSettingsSection preferenceService={notificationPreferenceService} pushService={pushNotificationService} userId={profile.id} />
        ) : null}

        {panel === 'security' ? (
          <AccountSecuritySection email={userEmail} memberSince={memberSince} onSignOut={() => void signOut()} service={accountSecurityService} />
        ) : null}

        {panel === 'groups' ? (
          <section className={styles.section} aria-labelledby="settings-groups-heading" data-app-surface="category">
            <div className={styles.sectionHeading}>
              <div><p className={styles.eyebrow}>CREWS</p><h2 id="settings-groups-heading">Groups</h2></div>
              <Button onClick={() => navigateToPath('/groups')} variant="secondary">Manage groups</Button>
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
            {pendingInvites.status === 'ready' ? <p className={styles.inviteCount}>{pendingInvites.invites.length} pending {pendingInvites.invites.length === 1 ? 'invitation' : 'invitations'}</p> : null}
          </section>
        ) : null}

        {panel === 'privacy' ? (
          <section className={styles.section} aria-labelledby="settings-privacy-heading" data-app-surface="category">
            <div className={styles.sectionHeading}>
              <div><p className={styles.eyebrow}>CONTROL</p><h2 id="settings-privacy-heading">Privacy & data</h2></div>
            </div>
            <p className={styles.supportCopy}>Your private workout details remain account-owned. Group competition and activity surfaces expose only the bounded data defined by their existing privacy rules.</p>
            <p className={styles.supportCopy}>Data export will appear only after its server lifecycle exists.</p>
            <AccountDeletionPanel service={deletionService} />
          </section>
        ) : null}

        {panel === 'app' ? <AppStatusSection service={pwaService} /> : null}

        {panel === 'admin' && showAdministration ? (
          <section className={styles.section} aria-labelledby="settings-admin-heading" data-app-surface="category">
            <div className={styles.sectionHeading}>
              <div><p className={styles.eyebrow}>AUTHORIZED</p><h2 id="settings-admin-heading">Administration</h2></div>
            </div>
            <p className={styles.supportCopy}>Platform administration is available for this active account. The destination re-checks authorization independently.</p>
            <Button onClick={() => navigateToPath('/platform-admin')}>Platform administration</Button>
          </section>
        ) : null}
      </main>
    </div>
  );
}
