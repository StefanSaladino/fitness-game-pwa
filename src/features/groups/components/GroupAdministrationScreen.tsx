import { useEffect, useRef, useState } from 'react';
import { AppShell, type AppSection } from '../../../components/layout';
import { Button, TextField } from '../../../components/ui';
import type { OnboardingProfile } from '../../onboarding';
import { ProfilePicture } from '../../profile-picture';
import type { CreateGroupInput, GroupMember, GroupSummary, ManagedGroupInvite, PendingGroupInvite } from '../model';
import { CreateGroupForm } from './CreateGroupForm';
import styles from './GroupAdministrationScreen.module.css';

interface Props {
  profile: OnboardingProfile;
  groups: GroupSummary[];
  group: GroupSummary;
  members: GroupMember[];
  invites: ManagedGroupInvite[];
  pendingInvites: PendingGroupInvite[];
  error: string;
  busyAction: string | null;
  creatingGroup: boolean;
  createGroupError: string;
  onCreateGroup: (input: CreateGroupInput) => Promise<unknown> | unknown;
  onNavigate: (section: AppSection) => void;
  onSignOut: () => void;
  onSelectGroup: (id: string) => void;
  onRename: (name: string) => Promise<unknown>;
  onCreateInvite: (recipient: string) => Promise<unknown>;
  onRevokeInvite: (id: string) => Promise<unknown>;
  onAcceptInvite: (id: string) => Promise<unknown>;
  onDeclineInvite: (id: string) => Promise<unknown>;
  onSetMemberRole: (id: string, role: 'ADMIN' | 'MEMBER') => Promise<unknown>;
  onRemoveMember: (id: string) => Promise<unknown>;
  onTransferOwnership: (id: string) => Promise<unknown>;
  onLeaveGroup: () => Promise<unknown>;
}

type ConfirmAction = 'remove' | 'transfer' | null;

function canRemove(actor: GroupSummary['role'], target: GroupMember) {
  if (target.role === 'OWNER') return false;
  if (actor === 'OWNER') return true;
  return actor === 'ADMIN' && target.role === 'MEMBER';
}

function initials(value: string) {
  return value
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('') || 'G';
}

export function GroupAdministrationScreen(props: Props) {
  const {
    profile,
    groups,
    group,
    members,
    invites,
    pendingInvites,
    error,
    busyAction,
    creatingGroup,
    createGroupError,
    onCreateGroup,
    onNavigate,
    onSignOut,
    onSelectGroup,
    onRename,
    onCreateInvite,
    onRevokeInvite,
    onAcceptInvite,
    onDeclineInvite,
    onSetMemberRole,
    onRemoveMember,
    onTransferOwnership,
    onLeaveGroup,
  } = props;

  const [name, setName] = useState(group.name);
  const [recipient, setRecipient] = useState('');
  const [managedMemberId, setManagedMemberId] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);
  const pageContentRef = useRef<HTMLDivElement | null>(null);
  const manageDialogRef = useRef<HTMLElement | null>(null);
  const manageTriggerRef = useRef<HTMLButtonElement | null>(null);
  const closeManageRef = useRef<HTMLButtonElement | null>(null);
  const busyRef = useRef(false);

  useEffect(() => setName(group.name), [group.id, group.name]);

  const canManage = group.role === 'OWNER' || group.role === 'ADMIN';
  const isOwner = group.role === 'OWNER';
  const inviteCode = profile.profileCode;
  const managedMember = members.find((member) => member.userId === managedMemberId) ?? null;
  const manageOpen = managedMember !== null;
  busyRef.current = busyAction !== null;

  useEffect(() => {
    if (!manageOpen) return undefined;

    const content = pageContentRef.current;
    const dialog = manageDialogRef.current;
    const previousBodyOverflow = document.body.style.overflow;
    content?.setAttribute('inert', '');
    document.body.style.overflow = 'hidden';
    closeManageRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busyRef.current) {
        event.preventDefault();
        setConfirmAction(null);
        setManagedMemberId(null);
        return;
      }

      if (event.key !== 'Tab' || !dialog) return;
      const focusable = Array.from(dialog.querySelectorAll('button:not(:disabled), input:not(:disabled)')) as HTMLElement[];
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      content?.removeAttribute('inert');
      document.body.style.overflow = previousBodyOverflow;
      manageTriggerRef.current?.focus();
    };
  }, [manageOpen]);

  useEffect(() => {
    if (!managedMemberId) return;
    if (members.some((member) => member.userId === managedMemberId)) return;
    setConfirmAction(null);
    setManagedMemberId(null);
  }, [managedMemberId, members]);

  function openMemberManagement(member: GroupMember, trigger: HTMLButtonElement) {
    manageTriggerRef.current = trigger;
    setConfirmAction(null);
    setManagedMemberId(member.userId);
  }

  function closeMemberManagement() {
    if (busyAction !== null) return;
    setConfirmAction(null);
    setManagedMemberId(null);
  }

  async function changeManagedRole() {
    if (!managedMember || !isOwner || managedMember.role === 'OWNER') return;
    const nextRole = managedMember.role === 'ADMIN' ? 'MEMBER' : 'ADMIN';
    const result = await onSetMemberRole(managedMember.userId, nextRole);
    if (result !== null) closeMemberManagement();
  }

  async function confirmManagedAction() {
    if (!managedMember || !confirmAction) return;
    const result = confirmAction === 'transfer'
      ? await onTransferOwnership(managedMember.userId)
      : await onRemoveMember(managedMember.userId);
    if (result !== null) closeMemberManagement();
  }

  const dialogTitle = managedMember?.displayName ?? 'Manage member';
  const confirmationTitle = confirmAction === 'transfer'
    ? `Transfer ownership to ${managedMember?.displayName ?? 'this member'}?`
    : `Remove ${managedMember?.displayName ?? 'this member'} from ${group.name}?`;

  return (
    <AppShell
      activeItem="groups"
      mobileTitle="Groups"
      onNavigate={onNavigate}
      onSignOut={onSignOut}
      userLabel={profile.displayName}
      userMeta={`@${profile.username} · ${profile.weeklyWorkoutTarget} lift days`}
    >
      <div className={styles.page}>
        <div ref={pageContentRef} aria-hidden={manageOpen || undefined} className={styles.pageContent}>
          <header className={styles.header}>
            <div>
              <p className={styles.kicker}>GROUPS</p>
              <h1>{group.name}</h1>
              <p className={styles.groupMeta}>{members.length} active member{members.length === 1 ? '' : 's'} · {group.role.toLowerCase()}</p>
            </div>
            <button className={styles.competitionLink} onClick={() => onNavigate('compete')} type="button">Competition</button>
          </header>

          <section className={styles.groupIdentity} aria-label={`${group.name} identity`}>
            <span className={styles.groupMonogram} aria-hidden="true">{initials(group.name)}</span>
            <div className={styles.groupIdentityCopy}>
              <strong>{group.name}</strong>
              <span>Selected group</span>
            </div>
            <div className={styles.memberPreview} aria-label={`${members.length} active members`}>
              <div className={styles.memberAvatarStack}>
                {members.slice(0, 3).map((member) => (
                  <ProfilePicture
                    displayName={member.displayName}
                    key={member.userId}
                    size="sm"
                    src={member.profilePictureUrl}
                  />
                ))}
              </div>
              <span>{members.length} active</span>
            </div>
          </section>

          {groups.length > 1 && (
            <section className={styles.groupSwitcher} aria-labelledby="your-groups-heading">
              <div className={styles.sectionHeadingCompact}>
                <p className={styles.sectionLabel} id="your-groups-heading">Your groups</p>
              </div>
              <div aria-label="Select group" className={styles.groupRail} role="group">
                {groups.map((item) => {
                  const selected = item.id === group.id;
                  return (
                    <button
                      aria-pressed={selected}
                      className={styles.groupRailButton}
                      key={item.id}
                      onClick={() => onSelectGroup(item.id)}
                      type="button"
                    >
                      <strong>{item.name}</strong>
                      <span>{item.memberCount} · {item.role.toLowerCase()}</span>
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          {error && <p className={styles.error} role="alert">{error}</p>}

          {pendingInvites.length > 0 && (
            <section className={styles.section} aria-labelledby="incoming-heading">
              <div className={styles.sectionHeadingCompact}>
                <p className={styles.sectionLabel}>Pending invitation{pendingInvites.length === 1 ? '' : 's'}</p>
                <h2 id="incoming-heading">For you</h2>
              </div>
              <ul className={styles.inviteList}>
                {pendingInvites.map((invite) => (
                  <li className={styles.inviteRow} key={invite.id}>
                    <div className={styles.inviteMeta}>
                      <strong>{invite.groupName}</strong>
                      <span>From {invite.invitedByDisplayName} (@{invite.invitedByUsername})</span>
                    </div>
                    <div className={styles.inviteActions}>
                      <button disabled={busyAction !== null} onClick={() => void onDeclineInvite(invite.id)} type="button">Decline</button>
                      <button className={styles.primaryTextAction} disabled={busyAction !== null} onClick={() => void onAcceptInvite(invite.id)} type="button">Accept</button>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className={styles.section} aria-labelledby="members-heading">
            <div className={styles.sectionHeadingRow}>
              <div>
                <p className={styles.sectionLabel}>Members</p>
                <h2 id="members-heading">Your crew</h2>
              </div>
              <span>{members.length}</span>
            </div>
            <ul className={styles.memberList}>
              {members.map((member) => {
                const self = member.userId === profile.id;
                const manageable = !self && (isOwner || canRemove(group.role, member));
                const busy = busyAction?.includes(member.userId) ?? false;
                return (
                  <li className={styles.memberRow} key={member.userId}>
                    <ProfilePicture displayName={member.displayName} size="sm" src={member.profilePictureUrl} />
                    <div className={styles.identity}>
                      <strong>{member.displayName}{self ? ' · You' : ''}</strong>
                      <span>@{member.username}</span>
                    </div>
                    <span className={styles.role}>{member.role}</span>
                    {manageable && (
                      <button
                        aria-label={`Manage ${member.displayName}`}
                        className={styles.manageButton}
                        disabled={busy}
                        onClick={(event) => openMemberManagement(member, event.currentTarget)}
                        type="button"
                      >
                        <span>Manage</span><span aria-hidden="true">›</span>
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>

          {canManage && (
            <section className={styles.section} aria-labelledby="invites-heading">
              <div className={styles.sectionHeadingCompact}>
                <p className={styles.sectionLabel}>Invitations</p>
                <h2 id="invites-heading">Invite someone</h2>
              </div>
              <form
                className={styles.inviteForm}
                onSubmit={(event) => {
                  event.preventDefault();
                  if (!recipient.trim()) return;
                  void onCreateInvite(recipient).then(() => setRecipient(''));
                }}
              >
                <TextField
                  autoCapitalize="none"
                  autoComplete="off"
                  hint={inviteCode ? `Your invite ID: ${inviteCode}` : 'Enter their username or invite ID.'}
                  label="Username or invite ID"
                  name="groupInviteRecipient"
                  placeholder="Username or invite ID"
                  spellCheck={false}
                  value={recipient}
                  onChange={(event) => setRecipient(event.target.value)}
                />
                <Button disabled={busyAction === 'invite:create' || !recipient.trim()} type="submit">
                  {busyAction === 'invite:create' ? 'Sending…' : 'Send invite'}
                </Button>
              </form>

              {invites.length > 0 && (
                <div className={styles.outgoingInvites}>
                  <p className={styles.outgoingLabel}>Pending outgoing</p>
                  <ul className={styles.inviteList}>
                    {invites.map((invite) => (
                      <li className={styles.inviteRow} key={invite.id}>
                        <div className={styles.inviteMeta}>
                          <strong>{invite.invitedDisplayName}</strong>
                          <span>@{invite.invitedUsername}</span>
                        </div>
                        <button
                          className={styles.revokeButton}
                          disabled={busyAction === `invite:${invite.id}`}
                          onClick={() => void onRevokeInvite(invite.id)}
                          type="button"
                        >Revoke</button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </section>
          )}

          <section className={styles.settingsSection} aria-labelledby="group-settings-heading">
            <details className={styles.settingsDetails}>
              <summary>
                <span>
                  <span className={styles.sectionLabel}>Group settings</span>
                  <strong id="group-settings-heading">Name, ownership and membership</strong>
                </span>
                <span aria-hidden="true">›</span>
              </summary>
              <div className={styles.settingsBody}>
                {canManage && (
                  <form className={styles.renameForm} onSubmit={(event) => { event.preventDefault(); void onRename(name); }}>
                    <TextField label="Current group name" maxLength={80} onChange={(event) => setName(event.target.value)} value={name} />
                    <Button disabled={busyAction === 'rename' || name.trim() === group.name} type="submit" variant="secondary">Save name</Button>
                  </form>
                )}

                <div className={styles.createGroupBlock}>
                  <h3>Create another group</h3>
                  <p>You can belong to or own more than one group at the same time.</p>
                  <CreateGroupForm busy={creatingGroup} compact error={createGroupError} onSubmit={onCreateGroup} />
                </div>

                <div className={styles.membershipBlock}>
                  <h3>Your membership</h3>
                  <p>{isOwner ? 'Transfer ownership before leaving this group.' : 'Leaving removes only this group membership. Your other groups stay unchanged.'}</p>
                  <div className={styles.membershipRow}>
                    {!isOwner && <Button disabled={busyAction === 'leave'} onClick={() => void onLeaveGroup()} variant="ghost">Leave group</Button>}
                    <span>Role: {group.role}</span>
                  </div>
                </div>
              </div>
            </details>
          </section>
        </div>

        {manageOpen && managedMember && (
          <div className={styles.manageBackdrop}>
            <section
              ref={manageDialogRef}
              aria-describedby="manage-member-description"
              aria-labelledby="manage-member-title"
              aria-modal="true"
              className={styles.manageSheet}
              role="dialog"
            >
              <div className={styles.sheetHandle} aria-hidden="true" />
              <header className={styles.manageHeader}>
                <ProfilePicture displayName={managedMember.displayName} size="sm" src={managedMember.profilePictureUrl} />
                <div>
                  <h2 id="manage-member-title">{dialogTitle}</h2>
                  <p id="manage-member-description">@{managedMember.username} · {managedMember.role.toLowerCase()}</p>
                </div>
                <button ref={closeManageRef} className={styles.doneButton} disabled={busyAction !== null} onClick={closeMemberManagement} type="button">Done</button>
              </header>

              {confirmAction ? (
                <div className={styles.confirmPanel}>
                  <p className={styles.sectionLabel}>{confirmAction === 'remove' ? 'Remove member' : 'Transfer ownership'}</p>
                  <h3>{confirmationTitle}</h3>
                  <p>
                    {confirmAction === 'transfer'
                      ? `Ownership of ${group.name} will move to ${managedMember.displayName}. Your role will change according to the server ownership-transfer rules.`
                      : `${managedMember.displayName} will lose active membership in ${group.name}.`}
                  </p>
                  <div className={styles.confirmActions}>
                    <button disabled={busyAction !== null} onClick={() => setConfirmAction(null)} type="button">Go back</button>
                    <button
                      className={confirmAction === 'remove' ? styles.confirmDanger : styles.confirmPrimary}
                      disabled={busyAction !== null}
                      onClick={() => void confirmManagedAction()}
                      type="button"
                    >
                      {busyAction !== null
                        ? 'Working…'
                        : confirmAction === 'remove'
                          ? `Remove ${managedMember.displayName}`
                          : 'Transfer ownership'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className={styles.memberActions}>
                  <p className={styles.sectionLabel}>Member actions</p>
                  {isOwner && managedMember.role !== 'OWNER' && (
                    <button aria-label={managedMember.role === 'ADMIN' ? 'Make member' : 'Make admin'} disabled={busyAction !== null} onClick={() => void changeManagedRole()} type="button">
                      <span>
                        <strong>{managedMember.role === 'ADMIN' ? 'Make member' : 'Make admin'}</strong>
                        <small>{managedMember.role === 'ADMIN' ? `Demote ${managedMember.displayName} from admin` : `Promote ${managedMember.displayName} to admin`}</small>
                      </span>
                      <span aria-hidden="true">›</span>
                    </button>
                  )}
                  {isOwner && managedMember.role !== 'OWNER' && (
                    <button aria-label="Transfer ownership" disabled={busyAction !== null} onClick={() => setConfirmAction('transfer')} type="button">
                      <span>
                        <strong>Transfer ownership</strong>
                        <small>Make {managedMember.displayName} the owner of {group.name}</small>
                      </span>
                      <span aria-hidden="true">›</span>
                    </button>
                  )}
                  {canRemove(group.role, managedMember) && (
                    <button aria-label="Remove from group" className={styles.dangerAction} disabled={busyAction !== null} onClick={() => setConfirmAction('remove')} type="button">
                      <span>
                        <strong>Remove from group</strong>
                        <small>Remove {managedMember.displayName} from {group.name}</small>
                      </span>
                      <span aria-hidden="true">›</span>
                    </button>
                  )}
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </AppShell>
  );
}
