-- Permite que lideranças também cadastrem diretamente na Rede de confiança.
-- Na Rede de confiança, somente nome, endereço e dados territoriais são obrigatórios.

alter table public.families
  alter column activist_id drop not null,
  alter column cpf drop not null;

alter table public.families
  add column if not exists municipality text,
  add column if not exists manaus_zone text;
