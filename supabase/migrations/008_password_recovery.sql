-- Execute before deploying the recovery routes. No existing records are removed.
-- Older production installations may predate this existing login support column.
alter table public.sms_challenges add column if not exists request_ip text;
create table if not exists public.password_recovery_requests (
  id bigint generated always as identity primary key,
  ip_hash text not null,
  account_hash text not null,
  created_at timestamptz not null default now()
);
create index if not exists recovery_request_ip_idx on public.password_recovery_requests(ip_hash, created_at);
create index if not exists recovery_request_account_idx on public.password_recovery_requests(account_hash, created_at);

create table if not exists public.password_recovery_challenges (
  id uuid primary key,
  role text not null check (role in ('leader', 'activist')),
  person_id uuid not null,
  phone text not null,
  code_hash text not null,
  attempts integer not null default 0,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '5 minutes'),
  consumed_at timestamptz
);
create index if not exists recovery_person_idx on public.password_recovery_challenges(role, person_id, created_at);
create index if not exists recovery_phone_idx on public.password_recovery_challenges(phone, created_at);
alter table public.password_recovery_requests enable row level security;
alter table public.password_recovery_challenges enable row level security;
revoke all on public.password_recovery_requests, public.password_recovery_challenges from anon, authenticated;
grant all on public.password_recovery_requests, public.password_recovery_challenges to service_role;
grant usage, select on sequence public.password_recovery_requests_id_seq to service_role;

create or replace function public.allow_password_recovery_request(p_ip text, p_account text)
returns boolean language plpgsql security definer set search_path = public, pg_temp as $$
begin
  -- Transaction locks keep limits effective across concurrent serverless invocations.
  perform pg_advisory_xact_lock(hashtextextended('recovery-ip:' || p_ip, 0));
  perform pg_advisory_xact_lock(hashtextextended('recovery-account:' || p_account, 0));
  if (select count(*) from password_recovery_requests where ip_hash = p_ip and created_at > now() - interval '1 hour') >= 20
    or (select count(*) from password_recovery_requests where account_hash = p_account and created_at > now() - interval '1 hour') >= 5
    or exists(select 1 from password_recovery_requests where account_hash = p_account and created_at > now() - interval '1 minute') then
    return false;
  end if;
  insert into password_recovery_requests(ip_hash, account_hash) values(p_ip, p_account);
  delete from password_recovery_requests where created_at < now() - interval '2 days';
  delete from password_recovery_challenges where created_at < now() - interval '2 days';
  return true;
end;
$$;

create or replace function public.reserve_password_recovery(p_id uuid, p_role text, p_person_id uuid, p_phone text, p_code_hash text)
returns boolean language plpgsql security definer set search_path = public, pg_temp as $$
begin
  perform pg_advisory_xact_lock(hashtextextended('recovery-phone:' || p_phone, 0));
  perform pg_advisory_xact_lock(hashtextextended('recovery-person:' || p_role || ':' || p_person_id::text, 0));
  if (select count(*) from password_recovery_challenges where phone = p_phone and created_at > now() - interval '1 hour') >= 5
    or exists(select 1 from password_recovery_challenges where phone = p_phone and created_at > now() - interval '1 minute') then
    return false;
  end if;
  update password_recovery_challenges set consumed_at = now() where role = p_role and person_id = p_person_id and consumed_at is null;
  insert into password_recovery_challenges(id, role, person_id, phone, code_hash) values(p_id, p_role, p_person_id, p_phone, p_code_hash);
  return true;
end;
$$;

create or replace function public.complete_password_recovery(p_id uuid, p_code_hash text, p_password_hash text)
returns boolean language plpgsql security definer set search_path = public, pg_temp as $$
declare
  c password_recovery_challenges%rowtype;
  current_phone text;
  leader_id uuid;
begin
  -- Verify and update the credential in one transaction: one code can succeed once.
  select * into c from password_recovery_challenges where id = p_id for update;
  if not found or c.consumed_at is not null or c.expires_at <= now() or c.attempts >= 5 then return false; end if;
  update password_recovery_challenges set attempts = attempts + 1 where id = p_id;
  if c.code_hash <> p_code_hash then return false; end if;
  if p_password_hash !~ '^[0-9a-f]{32}:[0-9a-f]{128}$' then return false; end if;

  if c.role = 'leader' then
    select phone into current_phone from leaderships where id = c.person_id and archived_at is null for update;
  else
    select a.phone, a.leadership_id into current_phone, leader_id from activists a
      join leaderships l on l.id = a.leadership_id
      where a.id = c.person_id and l.archived_at is null for update of a, l;
  end if;
  if not found then return false; end if;
  current_phone := regexp_replace(coalesce(current_phone, ''), '[^0-9]', '', 'g');
  if length(current_phone) = 11 then current_phone := '55' || current_phone; end if;
  -- A changed phone number invalidates a previously issued code.
  if '+' || current_phone <> c.phone then return false; end if;
  if c.role = 'leader' then
    update leaderships set password_hash = p_password_hash where id = c.person_id;
  else
    insert into sms_challenges(activist_id, leadership_id, phone, code_hash, expires_at, attempts, request_ip)
      values(c.person_id, leader_id, 'TRUST_PASSWORD', p_password_hash, '9999-12-31T23:59:59.999Z', 0, null);
  end if;
  update password_recovery_challenges set consumed_at = now() where id = p_id;
  return true;
end;
$$;

revoke all on function public.allow_password_recovery_request(text, text) from public, anon, authenticated;
revoke all on function public.reserve_password_recovery(uuid, text, uuid, text, text) from public, anon, authenticated;
revoke all on function public.complete_password_recovery(uuid, text, text) from public, anon, authenticated;
grant execute on function public.allow_password_recovery_request(text, text) to service_role;
grant execute on function public.reserve_password_recovery(uuid, text, uuid, text, text) to service_role;
grant execute on function public.complete_password_recovery(uuid, text, text) to service_role;
