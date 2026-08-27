-- Migração para o banco já criado.
-- Execute este arquivo uma única vez no SQL Editor do Supabase.

alter table public.admins
  add column if not exists password_hash text;

-- O banco é novo, portanto ainda não há administradores sem senha.
alter table public.admins
  alter column password_hash set not null;
