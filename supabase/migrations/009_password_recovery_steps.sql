-- Validate the SMS before showing password fields. Exchange the OTP proof for
-- a random, single-use reset authorization; no password changes in this step.
create or replace function public.verify_password_recovery_code(p_id uuid, p_code_hash text, p_token_hash text)
returns boolean language plpgsql security definer set search_path = public, pg_temp as $$
declare
  c password_recovery_challenges%rowtype;
begin
  select * into c from password_recovery_challenges where id = p_id for update;
  if not found or c.consumed_at is not null or c.expires_at <= now() or c.attempts >= 5 then return false; end if;
  update password_recovery_challenges set attempts = attempts + 1 where id = p_id;
  if c.code_hash <> p_code_hash or p_token_hash !~ '^[0-9a-f]{64}$' then return false; end if;
  update password_recovery_challenges
    set code_hash = p_token_hash, attempts = 0, expires_at = now() + interval '5 minutes'
    where id = p_id;
  return true;
end;
$$;
revoke all on function public.verify_password_recovery_code(uuid, text, text) from public, anon, authenticated;
grant execute on function public.verify_password_recovery_code(uuid, text, text) to service_role;
