alter table approvals add column if not exists telegram_chat_id text;
alter table approvals add column if not exists telegram_message_id bigint;
