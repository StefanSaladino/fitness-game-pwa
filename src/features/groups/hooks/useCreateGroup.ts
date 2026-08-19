import { useCallback, useRef, useState } from 'react';
import { toUserFacingGroupError } from '../groupMessages';
import { createGroupService, type GroupService } from '../groupService';
import type { CreateGroupInput, GroupSummary } from '../model';

export function useCreateGroup(userId: string, injectedService?: GroupService) {
  const serviceRef = useRef<GroupService | null>(null);
  if (!serviceRef.current) serviceRef.current = injectedService ?? createGroupService();

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [createdGroup, setCreatedGroup] = useState<GroupSummary | null>(null);

  const create = useCallback(async (input: CreateGroupInput) => {
    setSubmitting(true);
    setError('');
    try {
      const group = await serviceRef.current!.createGroup(userId, input);
      setCreatedGroup(group);
      return group;
    } catch (caught) {
      setError(toUserFacingGroupError(caught));
      return null;
    } finally {
      setSubmitting(false);
    }
  }, [userId]);

  return { submitting, error, createdGroup, create };
}
