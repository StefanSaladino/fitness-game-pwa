import { useState } from 'react';
import { Button } from '../../../components/ui';
import type { OnboardingProfile } from '../../onboarding';
import { ProfilePicture } from '../../profile-picture';
import type { GroupSummary } from '../model';
import type { GroupChatService } from './groupChatService';
import { useGroupChat } from './useGroupChat';
import { GROUP_CHAT_REACTIONS, type GroupChatMessage, type GroupChatReaction } from './model';
import styles from './GroupChatPanel.module.css';

interface Props {
  group: GroupSummary;
  profile: OnboardingProfile;
  service?: GroupChatService;
}

const reactionEmoji: Record<GroupChatReaction, string> = {
  FIRE: '🔥',
  STRONG: '💪',
  CLAP: '👏',
  HEART: '❤️',
  LAUGH: '😂',
};

const reactionName: Record<GroupChatReaction, string> = {
  FIRE: 'fire',
  STRONG: 'strong',
  CLAP: 'clap',
  HEART: 'heart',
  LAUGH: 'laugh',
};

function relativeTime(value: string): string {
  const delta = Date.now() - new Date(value).getTime();
  if (!Number.isFinite(delta) || delta < 0) return 'just now';
  const minutes = Math.floor(delta / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return days < 7 ? `${days}d` : new Intl.DateTimeFormat('en-CA', { month: 'short', day: 'numeric' }).format(new Date(value));
}

export function GroupChatPanel({ group, profile, service }: Props) {
  const chat = useGroupChat(group.id, service);
  const [draft, setDraft] = useState('');
  const [deleteCandidate, setDeleteCandidate] = useState<GroupChatMessage | null>(null);

  async function submit() {
    const posted = await chat.post(draft);
    if (posted) setDraft('');
  }

  async function confirmDelete() {
    if (!deleteCandidate) return;
    const deleted = await chat.deleteMessage(deleteCandidate.id);
    if (deleted) setDeleteCandidate(null);
  }

  if (chat.status === 'loading') {
    return <section className={styles.state} data-groups-surface="chat" role="tabpanel"><p role="status">Loading group chat…</p></section>;
  }

  if (chat.status === 'error' && chat.page.items.length === 0) {
    return <section className={styles.state} data-groups-surface="chat" role="tabpanel"><p>{chat.error}</p><Button onClick={() => void chat.retry()} variant="secondary">Try again</Button></section>;
  }

  return (
    <section aria-labelledby="group-chat-heading" className={styles.panel} data-groups-surface="chat" role="tabpanel">
      <div className={styles.heading}>
        <div>
          <p>Group chat</p>
          <h2 id="group-chat-heading">Talk with {group.name}</h2>
          <span>Only current members can read or post. Reactions never affect XP.</span>
        </div>
        <span className={styles.liveStatus}><i aria-hidden="true" /> Live</span>
      </div>

      <form className={styles.composer} onSubmit={(event) => { event.preventDefault(); void submit(); }}>
        <label htmlFor="group-chat-message">Message your group</label>
        <textarea
          id="group-chat-message"
          maxLength={1000}
          onChange={(event) => setDraft(event.target.value)}
          placeholder={`Share something with ${group.name}…`}
          rows={3}
          value={draft}
        />
        <div>
          <span>{draft.length}/1000</span>
          <Button disabled={chat.busyAction !== null || !draft.trim()} type="submit">
            {chat.busyAction === 'post' ? 'Posting…' : 'Post message'}
          </Button>
        </div>
      </form>

      {chat.error && <p className={styles.error} role="alert">{chat.error}</p>}

      {chat.page.items.length === 0 ? (
        <div className={styles.empty}>
          <span aria-hidden="true">💬</span>
          <strong>Start the conversation</strong>
          <p>Updates, encouragement, questions, and friendly trash talk all belong here.</p>
        </div>
      ) : (
        <ol className={styles.messages} aria-label={`${group.name} messages`}>
          {chat.page.items.map((message) => {
            const own = message.authorUserId === profile.id;
            const confirming = deleteCandidate?.id === message.id;
            return (
              <li className={styles.message} data-deleted={Boolean(message.deletedAt)} key={message.id}>
                <div className={styles.identity}>
                  <ProfilePicture displayName={message.displayName} size="sm" src={message.profilePictureUrl} />
                  <div>
                    <strong>{message.displayName}{own ? ' · You' : ''}</strong>
                    <span>@{message.username} · <time dateTime={message.createdAt}>{relativeTime(message.createdAt)}</time></span>
                  </div>
                  {message.canDelete && !confirming && <button aria-label={`Delete message from ${message.displayName}`} className={styles.messageMenu} disabled={chat.busyAction !== null} onClick={() => setDeleteCandidate(message)} type="button">Delete</button>}
                </div>

                {message.deletedAt ? <p className={styles.deletedBody}>Message deleted</p> : <p className={styles.body}>{message.body}</p>}

                {!message.deletedAt && !confirming && (
                  <div className={styles.reactions} aria-label={`Reactions to ${message.displayName}'s message`}>
                    {GROUP_CHAT_REACTIONS.map((reaction) => (
                      <button
                        aria-label={`${reactionName[reaction]} reaction, ${message.reactions[reaction]}`}
                        aria-pressed={message.myReaction === reaction}
                        disabled={chat.busyAction !== null}
                        key={reaction}
                        onClick={() => void chat.react(message.id, reaction)}
                        type="button"
                      >
                        <span aria-hidden="true">{reactionEmoji[reaction]}</span><b>{message.reactions[reaction]}</b>
                      </button>
                    ))}
                  </div>
                )}

                {confirming && (
                  <div className={styles.deleteConfirm} role="group" aria-label="Confirm group message deletion">
                    <div><strong>{own ? 'Delete your message?' : 'Remove this message for everyone?'}</strong><span>This cannot be undone.</span></div>
                    <div>
                      <button disabled={chat.busyAction !== null} onClick={() => setDeleteCandidate(null)} type="button">Keep</button>
                      <button className={styles.confirmDelete} disabled={chat.busyAction !== null} onClick={() => void confirmDelete()} type="button">{chat.busyAction ? 'Deleting…' : 'Delete'}</button>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      )}

      {chat.page.nextCursor && <div className={styles.loadMore}><Button disabled={chat.loadingMore} onClick={() => void chat.loadMore()} variant="secondary">{chat.loadingMore ? 'Loading…' : 'Load older messages'}</Button></div>}
    </section>
  );
}
