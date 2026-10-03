-- Atomic administrative transfers; no existing registrations are modified on installation.
-- Some older production installations do not have migration 004 yet.
create table if not exists public.trust_network_history (
  id uuid primary key default gen_random_uuid(), family_id uuid,
  activist_id uuid references public.activists(id) on delete set null,
  leadership_id uuid references public.leaderships(id) on delete set null,
  actor_role text not null check (actor_role in ('activist','leader','admin')),
  actor_id uuid not null, action text not null check (action in ('create','update','delete')),
  snapshot jsonb not null default '{}'::jsonb, created_at timestamptz not null default now()
);
create index if not exists trust_history_family_idx on public.trust_network_history(family_id);
create index if not exists trust_history_activist_idx on public.trust_network_history(activist_id);
create index if not exists trust_history_leadership_idx on public.trust_network_history(leadership_id);
alter table public.trust_network_history enable row level security;
grant all on table public.trust_network_history to service_role;

create or replace function public.transfer_trust_registrations(
  p_actor uuid, p_activists uuid[], p_families uuid[], p_target_role text, p_target_id uuid
) returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  target_leader uuid;
  target_activist uuid;
  source public.activists%rowtype;
  person public.families%rowtype;
  moved_ids uuid[];
  converted integer := 0;
  moved integer := 0;
  batch uuid := gen_random_uuid();
begin
  if not exists(select 1 from admins where id = p_actor) then
    raise exception 'Acesso administrativo necessário.' using errcode = '42501';
  end if;
  if p_activists is null or p_families is null or
     cardinality(p_activists) + cardinality(p_families) not between 1 and 500 or
     array_position(p_activists, null) is not null or array_position(p_families, null) is not null then
    raise exception 'Selecione de 1 a 500 cadastros.';
  end if;
  -- Serialize against registration edits/deletions while ownership changes.
  lock table leaderships, activists, families in share row exclusive mode;
  if p_target_role = 'leader' then
    select id into target_leader from leaderships where id = p_target_id and archived_at is null;
  elsif p_target_role = 'activist' then
    select a.id, a.leadership_id into target_activist, target_leader
      from activists a join leaderships l on l.id = a.leadership_id
      where a.id = p_target_id and l.archived_at is null;
    if p_target_id = any(p_activists) then raise exception 'O destino não pode ser um ativista selecionado.'; end if;
  end if;
  if target_leader is null then raise exception 'Escolha uma liderança ou um ativista ativo como destino.'; end if;
  if (select count(*) from activists a join leaderships l on l.id=a.leadership_id
      where a.id=any(p_activists) and l.archived_at is null) <> cardinality(p_activists) or
     (select count(*) from families f join leaderships l on l.id=f.leadership_id
      where f.id=any(p_families) and l.archived_at is null) <> cardinality(p_families) then
    raise exception 'A seleção mudou ou contém cadastros arquivados. Atualize a lista.';
  end if;
  if exists(select 1 from activists a join families f on f.cpf=a.cpf where a.id=any(p_activists)) then
    raise exception 'Um ativista selecionado já possui CPF na rede de confiança. Revise a duplicidade antes de transferir.';
  end if;
  select coalesce(array_agg(id), '{}'::uuid[]) into moved_ids from families
    where id=any(p_families) or activist_id=any(p_activists);
  for person in select * from families where id=any(moved_ids) loop
    if person.leadership_id = target_leader and person.activist_id is not distinct from target_activist then continue; end if;
    update families set leadership_id=target_leader, activist_id=target_activist where id=person.id;
    insert into trust_network_history(family_id,activist_id,leadership_id,actor_role,actor_id,action,snapshot)
      values(person.id,target_activist,target_leader,'admin',p_actor,'update',
        jsonb_build_object('operation','transfer','batch',batch,'before',to_jsonb(person),
          'targetLeadershipId',target_leader,'targetActivistId',target_activist));
    moved := moved + 1;
  end loop;
  for source in select * from activists where id=any(p_activists) loop
    insert into families(activist_id,leadership_id,name,birth,cpf,phone,address,mother,email,
      neighborhood,cep,title,electoral_zone,electoral_section,created_at)
      values(target_activist,target_leader,source.name,source.birth,source.cpf,source.phone,source.address,
        source.mother,source.email,source.neighborhood,source.cep,source.title,
        source.electoral_zone,source.electoral_section,source.created_at) returning * into person;
    insert into trust_network_history(family_id,activist_id,leadership_id,actor_role,actor_id,action,snapshot)
      values(person.id,target_activist,target_leader,'admin',p_actor,'create',
        jsonb_build_object('operation','convert-activist','batch',batch,'transferred_activist_id',source.id,'before',to_jsonb(source),
          'after',to_jsonb(person)));
    -- All dependents were moved above; credential rows are invalidated by their existing FK cascade.
    delete from activists where id=source.id;
    converted := converted + 1;
  end loop;
  return jsonb_build_object('converted',converted,'moved',moved,'batch',batch);
end;
$$;
revoke all on function public.transfer_trust_registrations(uuid,uuid[],uuid[],text,uuid) from public, anon, authenticated;
grant execute on function public.transfer_trust_registrations(uuid,uuid[],uuid[],text,uuid) to service_role;
