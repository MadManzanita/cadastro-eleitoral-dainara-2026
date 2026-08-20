-- Estrutura planejada para a versão de produção.
-- O protótipo atual usa localStorage e não depende deste arquivo.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique,
  role text not null check (role in ('admin', 'leader')),
  name text not null,
  cpf text unique not null,
  email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.leaderships (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles(id) on delete set null,
  name text not null,
  birth date,
  cpf text unique not null,
  phone text,
  address text,
  mother text,
  email text,
  neighborhood text,
  cep text,
  title text,
  zone text,
  section text,
  pix text,
  pix_name text,
  bank text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.activists (
  id uuid primary key default gen_random_uuid(),
  leadership_id uuid not null references public.leaderships(id) on delete restrict,
  name text not null,
  birth date,
  cpf text not null,
  phone text,
  address text,
  mother text,
  email text,
  neighborhood text,
  cep text,
  title text,
  zone text,
  section text,
  pix text,
  pix_name text,
  bank text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists activists_leadership_id_idx on public.activists(leadership_id);
create index if not exists leaderships_name_idx on public.leaderships(name);
create index if not exists activists_name_idx on public.activists(name);
