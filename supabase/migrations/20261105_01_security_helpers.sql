-- Stap 1 beveiliging: hulpfuncties. Verandert GEEN bestaande regels; alleen nieuwe functies.

-- E-mailadres van de ingelogde gebruiker (kleine letters), '' als niet ingelogd.
create or replace function public.my_email()
returns text language sql stable set search_path = ''
as $$ select lower(coalesce(auth.jwt() ->> 'email', '')) $$;

-- Loginscherm: bestaat er een account met dit e-mailadres? (zonder de profieltabel open te zetten)
create or replace function public.account_exists(p_email text)
returns boolean language sql stable security definer set search_path = ''
as $$ select exists (select 1 from public."UserProfile" where lower(user_email) = lower(trim(p_email))) $$;

-- Likes-teller van een ander profiel ophogen (alleen als jij die persoon echt geliked hebt).
create or replace function public.increment_likes_received(p_target_email text)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  if auth.uid() is null then raise exception 'Niet ingelogd'; end if;
  update public."UserProfile"
     set likes_received = coalesce(likes_received, 0) + 1
   where lower(user_email) = lower(trim(p_target_email))
     and exists (select 1 from public."Like" l
                  where lower(l.from_email) = public.my_email()
                    and lower(l.to_email) = lower(trim(p_target_email)));
end $$;

-- Hartje op een hint aan/uit zetten voor de ingelogde gebruiker. Geeft de nieuwe lijst terug.
create or replace function public.toggle_hint_reaction(p_hint_id uuid)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare me text := public.my_email(); result jsonb;
begin
  if me = '' then raise exception 'Niet ingelogd'; end if;
  update public."Hint" h
     set heart_reactions = case
           when coalesce(h.heart_reactions, '[]'::jsonb) ? me then
             (select coalesce(jsonb_agg(e), '[]'::jsonb) from jsonb_array_elements(h.heart_reactions) e where e <> to_jsonb(me))
           else coalesce(h.heart_reactions, '[]'::jsonb) || to_jsonb(me)
         end
   where h.id = p_hint_id
  returning h.heart_reactions into result;
  return result;
end $$;

-- Verlopen hints en stories (> 9 uur) opruimen, ook die van anderen.
create or replace function public.cleanup_expired_content()
returns void language sql security definer set search_path = ''
as $$
  delete from public."Hint"  where created_date < now() - interval '9 hours';
  delete from public."Story" where created_date < now() - interval '9 hours';
$$;

revoke all on function public.account_exists(text), public.increment_likes_received(text),
  public.toggle_hint_reaction(uuid), public.cleanup_expired_content() from public, anon;
grant execute on function public.account_exists(text) to anon, authenticated;
grant execute on function public.increment_likes_received(text), public.toggle_hint_reaction(uuid),
  public.cleanup_expired_content() to authenticated;

-- Account verwijderen kan alleen ingelogd; anon hoeft deze functie niet te kunnen aanroepen.
revoke execute on function public.delete_user_account() from public, anon;
grant execute on function public.delete_user_account() to authenticated;
