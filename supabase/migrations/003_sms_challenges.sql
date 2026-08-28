create table if not exists public.sms_challenges (
  id uuid primary key default gen_random_uuid(),
  activist_id uuid not null references public.activists(id) on delete cascade,
  leadership_id uuid not null references public.leaderships(id) on delete cascade,
  phone text not null,
  code_hash text not null,
  expires_at timestamptz not null,
  attempts integer not null default 0,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists sms_challenges_expires_idx on public.sms_challenges(expires_at);
grant select, insert, update, delete on table public.sms_challenges to service_role;
