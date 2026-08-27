-- Fitness Game PWA — group chat foreign-key coverage
-- Cover both referencing column sets so message and profile deletes do not
-- require sequential scans as group chat history grows.

create index group_chat_reactions_group_message_idx
  on public.group_chat_reactions(group_id, message_id);

create index group_chat_reactions_user_idx
  on public.group_chat_reactions(user_id);
