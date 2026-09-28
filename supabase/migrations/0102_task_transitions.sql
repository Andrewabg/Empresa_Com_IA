-- 0102 — Livro de transições de tarefa (append-only).
--
-- `tasks` guarda o estado ATUAL; não guarda como a tarefa chegou nele. Uma tarefa que foi
-- queued → running → needs_approval → running → failed deixa só o último carimbo, e o motivo
-- da falha fica no log do container, fora do alcance de quem usa o painel.
--
-- Aditiva/expand-only: tabela nova, nada existente muda de forma ou de comportamento.

create table if not exists public.task_transitions (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  de text,
  para text not null,
  motivo text,
  agent_id text,
  at timestamptz not null default now()
);

-- A tela sempre lê "as transições desta tarefa, em ordem".
create index if not exists task_transitions_task_at_idx
  on public.task_transitions (task_id, at);

-- A poda apaga por idade, sem olhar a tarefa.
create index if not exists task_transitions_at_idx
  on public.task_transitions (at);

alter table public.task_transitions enable row level security;
grant all on table public.task_transitions to service_role;
