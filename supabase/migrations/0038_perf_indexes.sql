


















create index if not exists messages_conv_created_idx
  on public.messages (conversation_id, created_at);

create index if not exists events_created_at_idx
  on public.events (created_at desc);

create index if not exists events_memory_recent_idx
  on public.events (created_at desc)
  where type = 'memory';

create index if not exists approvals_pending_idx
  on public.approvals (created_at)
  where status = 'pending';

create index if not exists tasks_agent_created_idx
  on public.tasks (agent_id, created_at desc);

create index if not exists conversations_operator_updated_idx
  on public.conversations (operator_id, updated_at desc);
