-- Registro diário de atividades das lideranças, com imagens privadas.
-- Execute uma única vez no SQL Editor do Supabase.

create table if not exists public.daily_activity_records (
  id uuid primary key default gen_random_uuid(),
  leadership_id uuid not null references public.leaderships(id) on delete cascade,
  description text not null check (char_length(description) between 5 and 1000),
  status text not null default 'pending' check (status in ('pending', 'deferred')),
  reviewed_by uuid references public.admins(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.daily_activity_images (
  id uuid primary key default gen_random_uuid(),
  record_id uuid not null references public.daily_activity_records(id) on delete cascade,
  storage_path text not null unique,
  original_name text,
  created_at timestamptz not null default now()
);

create index if not exists daily_activity_records_leadership_created_idx
  on public.daily_activity_records(leadership_id, created_at desc);
create index if not exists daily_activity_records_status_idx
  on public.daily_activity_records(status, created_at desc);
create index if not exists daily_activity_images_record_idx
  on public.daily_activity_images(record_id);

create or replace function public.enforce_daily_activity_image_limit()
returns trigger
language plpgsql
as $$
declare
  target_leadership uuid;
  target_day date;
  used_images integer;
begin
  select leadership_id, (created_at at time zone 'America/Manaus')::date
    into target_leadership, target_day
    from public.daily_activity_records
    where id = new.record_id;
  perform pg_advisory_xact_lock(hashtextextended(target_leadership::text || target_day::text, 0));
  select count(*)
    into used_images
    from public.daily_activity_images image
    join public.daily_activity_records record on record.id = image.record_id
    where record.leadership_id = target_leadership
      and (record.created_at at time zone 'America/Manaus')::date = target_day;
  if used_images >= 5 then
    raise exception 'Limite diário de 5 imagens atingido';
  end if;
  return new;
end;
$$;

drop trigger if exists daily_activity_image_limit on public.daily_activity_images;
create trigger daily_activity_image_limit before insert on public.daily_activity_images
for each row execute procedure public.enforce_daily_activity_image_limit();

drop trigger if exists daily_activity_records_updated_at on public.daily_activity_records;
create trigger daily_activity_records_updated_at before update on public.daily_activity_records
for each row execute procedure public.set_updated_at();

alter table public.daily_activity_records enable row level security;
alter table public.daily_activity_images enable row level security;
grant all on table public.daily_activity_records to service_role;
grant all on table public.daily_activity_images to service_role;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('daily-activities', 'daily-activities', false, 1048576,
  array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
