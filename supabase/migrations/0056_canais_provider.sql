







alter table public.canais add column if not exists provider text not null default 'whatsapp_cloud';
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'canais_provider_check') then
    alter table public.canais add constraint canais_provider_check
      check (provider in ('whatsapp_cloud','uazapi'));
  end if;
end $$;


alter table public.canais add column if not exists conexao_estado text not null default 'nao_aplica';
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'canais_conexao_estado_check') then
    alter table public.canais add constraint canais_conexao_estado_check
      check (conexao_estado in ('nao_aplica','aguardando_qr','pareado','desconectado'));
  end if;
end $$;


alter table public.canais add column if not exists conexao_qr text;



alter table public.mensagens_externas add column if not exists sandbox_ignorada boolean not null default false;
