create table if not exists public.framebridge_documents (
  id uuid primary key default gen_random_uuid(),
  collection text not null,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists framebridge_documents_collection_idx
  on public.framebridge_documents (collection, created_at desc);
create unique index if not exists framebridge_users_email_unique
  on public.framebridge_documents ((lower(data->>'email')))
  where collection = 'users';
create unique index if not exists framebridge_transaction_id_unique
  on public.framebridge_documents ((data->>'transactionId'))
  where collection = 'payment_transactions';

alter table public.framebridge_documents enable row level security;
revoke all on table public.framebridge_documents from anon, authenticated;
grant select, insert, update, delete on table public.framebridge_documents to service_role;
