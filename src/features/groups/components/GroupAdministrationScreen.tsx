import { useEffect, useState } from 'react';
import { AppShell, type AppSection } from '../../../components/layout';
import { Button, SelectField, TextField } from '../../../components/ui';
import type { OnboardingProfile } from '../../onboarding';
import { ProfilePicture } from '../../profile-picture';
import type { GroupMember, GroupSummary, ManagedGroupInvite } from '../model';
import styles from './GroupAdministrationScreen.module.css';

interface GroupAdministrationScreenProps {
  profile: OnboardingProfile;
  groups: GroupSummary[];
  group: GroupSummary;
  members: GroupMember[];
  invites: ManagedGroupInvite[];
  error: string;
  busyAction: string | null;
  onNavigate: (section: AppSection) => void;
  onSignOut: () => void;
  onSelectGroup: (groupId: string) => void;
  onRename: (name: string) => Promise<unknown>;
  onCreateInvite: () => Promise<unknown>;
  onRevokeInvite: (inviteId: string) => Promise<unknown>;
  onSetMemberRole: (userId: string, role: 'ADMIN' | 'MEMBER') => Promise<unknown>;
  onRemoveMember: (userId: string) => Promise<unknown>;
  onTransferOwnership: (userId: string) => Promise<unknown>;
  onLeaveGroup: () => Promise<unknown>;
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('en-CA', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value));
}

function canRemove(actor: GroupSummary['role'], target: GroupMember): boolean {
  if (target.role === 'OWNER') return false;
  if (actor === 'OWNER') return true;
  return actor === 'ADMIN' && target.role === 'MEMBER';
}

export function GroupAdministrationScreen(props: GroupAdministrationScreenProps) {
  const {
    profile, groups, group, members, invites, error, busyAction,
    onNavigate, onSignOut, onSelectGroup, onRename, onCreateInvite,
    onRevokeInvite, onSetMemberRole, onRemoveMember, onTransferOwnership, onLeaveGroup,
  } = props;
  const [name, setName] = useState(group.name);
  const [copiedInviteId, setCopiedInviteId] = useState<string | null>(null);
  useEffect(() => setName(group.name), [group.id, group.name]);

  const canManage = group.role === 'OWNER' || group.role === 'ADMIN';
  const isOwner = group.role === 'OWNER';

  const copyInvite = async (invite: ManagedGroupInvite) => {
    try {
      await navigator.clipboard.writeText(invite.token);
      setCopiedInviteId(invite.id);
      window.setTimeout(() => setCopiedInviteId((current) => current === invite.id ? null : current), 1400);
    } catch {
      setCopiedInviteId(null);
    }
  };

  return (
    <AppShell
      activeItem="groups"
      onNavigate={onNavigate}
      onSignOut={onSignOut}
      userLabel={profile.displayName}
      userMeta={`@${profile.username} · ${profile.weeklyWorkoutTarget} lift days`}
    >
      <div className={styles.page}>
        <header className={styles.header}>
          <div>
            <p className={styles.kicker}>GROUPS</p>
            <h1>{group.name}</h1>
            <p>Manage the people you train with, invitation access, and the permissions that keep the group organized.</p>
          </div>
          {groups.length > 1 && (
            <SelectField label="Group" value={group.id} onChange={(event) => onSelectGroup(event.target.value)}>
              {groups.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </SelectField>
          )}
        </header>

        {error && <p className={styles.error} role="alert">{error}</p>}

        <section className={styles.section} aria-labelledby="members-heading">
          <div className={styles.sectionHeader}>
            <div>
              <p className={styles.sectionLabel}>Crew</p>
              <h2 id="members-heading">Members</h2>
            </div>
            <p>{members.length} active {members.length === 1 ? 'member' : 'members'}</p>
          </div>

          <ul className={styles.memberList}>
            {members.map((member) => {
              const isSelf = member.userId === profile.id;
              const memberBusy = busyAction?.includes(member.userId) ?? false;
              return (
                <li className={styles.memberRow} key={member.userId}>
                  <ProfilePicture displayName={member.displayName} size="sm" src={member.profilePictureUrl} />
                  <div className={styles.identity}>
                    <strong>{member.displayName}{isSelf ? ' (You)' : ''}</strong>
                    <span>@{member.username}</span>
                  </div>
                  <span className={styles.role}>{member.role}</span>
                  {!isSelf && (isOwner || canRemove(group.role, member)) && (
                    <div className={styles.actions}>
                      {isOwner && member.role !== 'OWNER' && (
                        <button
                          className={styles.actionButton}
                          disabled={memberBusy}
                          onClick={() => void onSetMemberRole(member.userId, member.role === 'ADMIN' ? 'MEMBER' : 'ADMIN')}
                          type="button"
                        >
                          {member.role === 'ADMIN' ? 'Make member' : 'Make admin'}
                        </button>
                      )}
                      {isOwner && member.role !== 'OWNER' && (
                        <button className={styles.actionButton} disabled={memberBusy} onClick={() => void onTransferOwnership(member.userId)} type="button">
                          Transfer ownership
                        </button>
                      )}
                      {canRemove(group.role, member) && (
                        <button className={styles.dangerButton} disabled={memberBusy} onClick={() => void onRemoveMember(member.userId)} type="button">Remove</button>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </section>

        {canManage && (
          <section className={styles.section} aria-labelledby="invites-heading">
            <div className={styles.sectionHeader}>
              <div>
                <p className={styles.sectionLabel}>Access</p>
                <h2 id="invites-heading">Invites</h2>
              </div>
              <Button disabled={busyAction === 'invite:create'} onClick={() => void onCreateInvite()} variant="secondary">
                {busyAction === 'invite:create' ? 'Creating…' : 'New invite'}
              </Button>
            </div>

            {invites.length === 0 ? (
              <p className={styles.empty}>No invites yet. Create a code when you want someone to join this group.</p>
            ) : (
              <ul className={styles.inviteList}>
                {invites.map((invite) => {
                  const active = invite.revokedAt === null && new Date(invite.expiresAt).getTime() > Date.now() && invite.useCount < invite.maxUses;
                  return (
                    <li className={styles.inviteRow} key={invite.id}>
                      <div className={styles.inviteMeta}>
                        <strong className={active ? '' : styles.revoked}>{active ? 'Active invite' : 'Inactive invite'}</strong>
                        <span>{invite.useCount}/{invite.maxUses} uses · expires {formatDate(invite.expiresAt)}</span>
                        <span className={styles.inviteCode}>{invite.token}</span>
                      </div>
                      <div className={styles.actions}>
                        <button className={styles.codeButton} onClick={() => void copyInvite(invite)} type="button">{copiedInviteId === invite.id ? 'Copied' : 'Copy code'}</button>
                        {active && <button className={styles.dangerButton} disabled={busyAction === `invite:${invite.id}`} onClick={() => void onRevokeInvite(invite.id)} type="button">Revoke</button>}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        )}

        {canManage && (
          <section className={styles.section} aria-labelledby="group-settings-heading">
            <div className={styles.sectionHeader}>
              <div>
                <p className={styles.sectionLabel}>Settings</p>
                <h2 id="group-settings-heading">Group name</h2>
              </div>
            </div>
            <form className={styles.renameForm} onSubmit={(event) => { event.preventDefault(); void onRename(name); }}>
              <TextField label="Name" maxLength={80} onChange={(event) => setName(event.target.value)} value={name} />
              <Button disabled={busyAction === 'rename' || name.trim() === group.name} type="submit" variant="secondary">Save name</Button>
            </form>
          </section>
        )}

        <section className={styles.settings} aria-labelledby="membership-heading">
          <p className={styles.sectionLabel}>Membership</p>
          <h2 id="membership-heading">Your place in this group</h2>
          <p className={styles.settingsText}>
            {isOwner ? 'Owners must transfer ownership to another active member before leaving.' : 'Leaving removes your active membership. You can join again later with a valid invite.'}
          </p>
          <div className={styles.leaveRow}>
            {!isOwner && <Button disabled={busyAction === 'leave'} onClick={() => void onLeaveGroup()} variant="ghost">Leave group</Button>}
            <span className={styles.leaveHint}>Role: {group.role}</span>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
