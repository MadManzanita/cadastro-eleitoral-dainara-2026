-- Gerenciamento e histórico da Rede de confiança.
-- Execute uma única vez no SQL Editor do Supabase.

create table if not exists public.trust_network_history (
  id uuid primary key default gen_random_uuid(),
  family_id uuid,
  activist_id uuid references public.activists(id) on delete set null,
  leadership_id uuid references public.leaderships(id) on delete set null,
  actor_role text not null check (actor_role in ('activist','leader','admin')),
  actor_id uuid not null,
  action text not null check (action in ('create','update','delete')),
  snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists trust_history_family_idx on public.trust_network_history(family_id);
create index if not exists trust_history_activist_idx on public.trust_network_history(activist_id);
create index if not exists trust_history_leadership_idx on public.trust_network_history(leadership_id);
alter table public.trust_network_history enable row level security;
grant all on table public.trust_network_history to service_role;
