-- Permite que a chave de servidor do site execute os fluxos autenticados.
grant usage on schema public to service_role;
grant select, insert, update, delete on table public.admins, public.leaderships, public.activists, public.families, public.assessors to service_role;
