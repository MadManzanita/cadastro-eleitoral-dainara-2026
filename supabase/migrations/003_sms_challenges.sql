create table if not exists public.sms_challenges (
  id uuid primary key default gen_random_uuid(),
  activist_id uuid not null references public.activists(id) on delete cascade,
  leadership_id uuid not null references public.leaderships(id) on delete cascade,
  phone text not null,
  request_ip text,
  code_hash text not null,
  expires_at timestamptz not null,
  attempts integer not null default 0,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.sms_challenges add column if not exists request_ip text;
create index if not exists sms_challenges_expires_idx on public.sms_challenges(expires_at);
create index if not exists sms_challenges_activist_created_idx on public.sms_challenges(activist_id, created_at desc);
create index if not exists sms_challenges_ip_created_idx on public.sms_challenges(request_ip, created_at desc);
grant select, insert, update, delete on table public.sms_challenges to service_role;
