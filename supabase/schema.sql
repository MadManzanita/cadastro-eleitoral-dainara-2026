-- Banco de dados de produção do Cadastro Eleitoral.
-- Execute este arquivo uma única vez em um projeto Supabase novo.

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.admins (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  cpf text not null unique,
  email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.leaderships (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  birth date,
  cpf text not null unique,
  phone text,
  address text,
  mother text,
  email text,
  neighborhood text,
  cep text,
  title text,
  electoral_zone text,
  electoral_section text,
  pix text,
  pix_name text,
  bank text,
  password_hash text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.activists (
  id uuid primary key default gen_random_uuid(),
  leadership_id uuid not null references public.leaderships(id) on delete restrict,
  name text not null,
  birth date,
  cpf text not null unique,
  phone text,
  address text,
  mother text,
  email text,
  neighborhood text,
  cep text,
  title text,
  electoral_zone text,
  electoral_section text,
  pix text,
  pix_name text,
  bank text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.families (
  id uuid primary key default gen_random_uuid(),
  activist_id uuid not null references public.activists(id) on delete restrict,
  leadership_id uuid not null references public.leaderships(id) on delete restrict,
  name text not null,
  birth date,
  cpf text not null unique,
  phone text,
  address text,
  mother text,
  email text,
  neighborhood text,
  cep text,
  title text,
  electoral_zone text,
  electoral_section text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.assessors (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  role text,
  phone text,
  email text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists activists_leadership_id_idx on public.activists(leadership_id);
create index if not exists families_activist_id_idx on public.families(activist_id);
create index if not exists families_leadership_id_idx on public.families(leadership_id);
create index if not exists leaderships_neighborhood_idx on public.leaderships(neighborhood);
create index if not exists activists_neighborhood_idx on public.activists(neighborhood);
create index if not exists families_neighborhood_idx on public.families(neighborhood);

drop trigger if exists admins_updated_at on public.admins;
create trigger admins_updated_at before update on public.admins
for each row execute procedure public.set_updated_at();

drop trigger if exists leaderships_updated_at on public.leaderships;
create trigger leaderships_updated_at before update on public.leaderships
for each row execute procedure public.set_updated_at();

drop trigger if exists activists_updated_at on public.activists;
create trigger activists_updated_at before update on public.activists
for each row execute procedure public.set_updated_at();

drop trigger if exists families_updated_at on public.families;
create trigger families_updated_at before update on public.families
for each row execute procedure public.set_updated_at();

drop trigger if exists assessors_updated_at on public.assessors;
create trigger assessors_updated_at before update on public.assessors
for each row execute procedure public.set_updated_at();

alter table public.admins enable row level security;
alter table public.leaderships enable row level security;
alter table public.activists enable row level security;
alter table public.families enable row level security;
alter table public.assessors enable row level security;
