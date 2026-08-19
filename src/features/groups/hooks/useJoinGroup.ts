import { useCallback, useRef, useState } from 'react';
import { toUserFacingGroupError } from '../groupMessages';
import { createGroupService, type GroupService } from '../groupService';

export function useJoinGroup(injectedService?: GroupService) {
  const serviceRef = useRef<GroupService | null>(null);
  if (!serviceRef.current) serviceRef.current = injectedService ?? createGroupService();

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [joinedGroupId, setJoinedGroupId] = useState<string | null>(null);

  const join = useCallback(async (invite: string) => {
    setSubmitting(true);
    setError('');
    try {
      const groupId = await serviceRef.current!.joinByInvite(invite);
      setJoinedGroupId(groupId);
      return groupId;
    } catch (caught) {
      setError(toUserFacingGroupError(caught));
      return null;
    } finally {
      setSubmitting(false);
    }
  }, []);

  return { submitting, error, joinedGroupId, join };
}
