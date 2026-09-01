-- Arquivamento e exclusão controlada de lideranças.
-- Execute uma única vez no SQL Editor do Supabase.

alter table public.leaderships
  add column if not exists archived_at timestamptz;

create index if not exists leaderships_archived_at_idx
  on public.leaderships(archived_at);

alter table public.activists
  drop constraint if exists activists_leadership_id_fkey;
alter table public.activists
  add constraint activists_leadership_id_fkey
  foreign key (leadership_id) references public.leaderships(id) on delete cascade;

alter table public.families
  drop constraint if exists families_leadership_id_fkey;
alter table public.families
  add constraint families_leadership_id_fkey
  foreign key (leadership_id) references public.leaderships(id) on delete cascade;

alter table public.families
  drop constraint if exists families_activist_id_fkey;
alter table public.families
  add constraint families_activist_id_fkey
  foreign key (activist_id) references public.activists(id) on delete cascade;

do $$
begin
  if to_regclass('public.trust_network_history') is not null then
    alter table public.trust_network_history
      drop constraint if exists trust_network_history_leadership_id_fkey;
    alter table public.trust_network_history
      add constraint trust_network_history_leadership_id_fkey
      foreign key (leadership_id) references public.leaderships(id) on delete cascade;
  end if;
end;
$$;
