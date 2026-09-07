create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.app_users(id) on delete cascade,
  recipient_id uuid not null references public.app_users(id) on delete cascade,
  message text not null check (char_length(message) between 1 and 2000),
  read_at timestamptz,
  created_at timestamptz not null default now(),
  check (sender_id <> recipient_id)
);

create index if not exists chat_messages_pair_idx
  on public.chat_messages(sender_id, recipient_id, created_at desc);

create index if not exists chat_messages_recipient_unread_idx
  on public.chat_messages(recipient_id, read_at, created_at desc);

alter table public.chat_messages enable row level security;
