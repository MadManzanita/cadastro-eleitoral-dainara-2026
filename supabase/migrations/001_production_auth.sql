-- Migração para o banco já criado.
-- Execute este arquivo uma única vez no SQL Editor do Supabase.
-- Ela não remove tabelas nem cadastros.

alter table public.admins
  add column if not exists password_hash text;
