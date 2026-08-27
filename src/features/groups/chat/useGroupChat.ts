import { useCallback, useEffect, useRef, useState } from 'react';
import { toUserFacingGroupChatError } from './groupChatMessages';
import { createGroupChatService, type GroupChatService } from './groupChatService';
import type { GroupChatMessage, GroupChatPage, GroupChatReaction } from './model';

function optimisticReaction(message: GroupChatMessage, next: GroupChatReaction | null): GroupChatMessage {
  const reactions = { ...message.reactions };
  if (message.myReaction) reactions[message.myReaction] = Math.max(0, reactions[message.myReaction] - 1);
  if (next) reactions[next] += 1;
  return { ...message, reactions, myReaction: next };
}

export function useGroupChat(groupId: string, injectedService?: GroupChatService) {
  const serviceRef = useRef<GroupChatService | null>(null);
  if (!serviceRef.current) serviceRef.current = injectedService ?? createGroupChatService();
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState('');
  const [page, setPage] = useState<GroupChatPage>({ items: [], nextCursor: null });
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  const load = useCallback(async () => {
    setStatus('loading');
    setError('');
    try {
      const next = await serviceRef.current!.loadMessages(groupId);
      setPage(next);
      setStatus('ready');
      return true;
    } catch (caught) {
      setError(toUserFacingGroupChatError(caught));
      setStatus('error');
      return false;
    }
  }, [groupId]);

  const refreshLatest = useCallback(async () => {
    try {
      const latest = await serviceRef.current!.loadMessages(groupId);
      setPage((current) => ({
        items: [...latest.items, ...current.items.filter((item) => !latest.items.some((latestItem) => latestItem.id === item.id))],
        nextCursor: current.items.length > latest.items.length ? current.nextCursor : latest.nextCursor,
      }));
      setError('');
    } catch (caught) {
      setError(toUserFacingGroupChatError(caught));
    }
  }, [groupId]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => serviceRef.current!.subscribe(groupId, () => { void refreshLatest(); }), [groupId, refreshLatest]);

  const loadMore = useCallback(async () => {
    if (!page.nextCursor || loadingMore) return;
    setLoadingMore(true);
    setError('');
    try {
      const older = await serviceRef.current!.loadMessages(groupId, page.nextCursor);
      setPage((current) => ({
        items: [...current.items, ...older.items.filter((item) => !current.items.some((existing) => existing.id === item.id))],
        nextCursor: older.nextCursor,
      }));
    } catch (caught) {
      setError(toUserFacingGroupChatError(caught));
    } finally {
      setLoadingMore(false);
    }
  }, [groupId, loadingMore, page.nextCursor]);

  const post = useCallback(async (body: string) => {
    if (busyAction || !body.trim()) return false;
    setBusyAction('post');
    setError('');
    try {
      await serviceRef.current!.postMessage(groupId, body);
      await refreshLatest();
      return true;
    } catch (caught) {
      setError(toUserFacingGroupChatError(caught));
      return false;
    } finally {
      setBusyAction(null);
    }
  }, [busyAction, groupId, refreshLatest]);

  const react = useCallback(async (messageId: string, reaction: GroupChatReaction) => {
    if (busyAction) return false;
    const previous = page.items.find((item) => item.id === messageId);
    if (!previous || previous.deletedAt) return false;
    const next = previous.myReaction === reaction ? null : reaction;
    setBusyAction(`reaction:${messageId}`);
    setError('');
    setPage((current) => ({ ...current, items: current.items.map((item) => item.id === messageId ? optimisticReaction(item, next) : item) }));
    try {
      await serviceRef.current!.setReaction(groupId, messageId, next);
      return true;
    } catch (caught) {
      setPage((current) => ({ ...current, items: current.items.map((item) => item.id === messageId ? previous : item) }));
      setError(toUserFacingGroupChatError(caught));
      return false;
    } finally {
      setBusyAction(null);
    }
  }, [busyAction, groupId, page.items]);

  const deleteMessage = useCallback(async (messageId: string) => {
    if (busyAction) return false;
    setBusyAction(`delete:${messageId}`);
    setError('');
    try {
      await serviceRef.current!.deleteMessage(groupId, messageId);
      await refreshLatest();
      return true;
    } catch (caught) {
      setError(toUserFacingGroupChatError(caught));
      return false;
    } finally {
      setBusyAction(null);
    }
  }, [busyAction, groupId, refreshLatest]);

  return { status, error, page, busyAction, loadingMore, retry: load, loadMore, post, react, deleteMessage };
}
