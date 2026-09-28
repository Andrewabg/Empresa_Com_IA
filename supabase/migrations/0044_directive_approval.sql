








alter table public.approvals drop constraint if exists approvals_kind_check;
alter table public.approvals add constraint approvals_kind_check
  check (kind in ('brain_pr', 'tool_action', 'plan', 'directive'));
