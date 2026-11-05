-- Blokkeren: twee gebruikers zien en bereiken elkaar niet meer, in beide richtingen.
-- Dit wordt in de database afgedwongen met RESTRICTIVE regels, bovenop de bestaande RLS-regels.
-- Terugdraaien: supabase/rollback/2026-11-05_block_users_rollback.sql

CREATE TABLE IF NOT EXISTS public."BlockedUser" (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_date  timestamptz NOT NULL DEFAULT now(),
  blocker_email text NOT NULL,
  blocked_email text NOT NULL,
  blocked_name  text,
  CONSTRAINT blocked_user_unique UNIQUE (blocker_email, blocked_email),
  CONSTRAINT blocked_user_not_self CHECK (blocker_email <> blocked_email),
  CONSTRAINT blocked_user_lowercase CHECK (blocker_email = lower(blocker_email) AND blocked_email = lower(blocked_email))
);
CREATE INDEX IF NOT EXISTS blocked_user_blocked_idx ON public."BlockedUser" (blocked_email);

ALTER TABLE public."BlockedUser" ENABLE ROW LEVEL SECURITY;

-- Alleen de blokkeerder ziet zijn eigen lijst en kan iemand weer deblokkeren.
-- Blokkeren zelf gaat alleen via block_user(); de geblokkeerde ziet nooit een rij.
DROP POLICY IF EXISTS "BlockedUser_read_own" ON public."BlockedUser";
CREATE POLICY "BlockedUser_read_own" ON public."BlockedUser" FOR SELECT TO authenticated
  USING (blocker_email = (select public.my_email()));
DROP POLICY IF EXISTS "BlockedUser_delete_own" ON public."BlockedUser";
CREATE POLICY "BlockedUser_delete_own" ON public."BlockedUser" FOR DELETE TO authenticated
  USING (blocker_email = (select public.my_email()));

-- Alle e-mailadressen waarmee de ingelogde gebruiker een blokkade heeft, in beide richtingen.
CREATE OR REPLACE FUNCTION public.blocked_emails()
RETURNS text[] LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT coalesce(array_agg(other), '{}'::text[]) FROM (
    SELECT b.blocked_email AS other FROM public."BlockedUser" b WHERE b.blocker_email = public.my_email()
    UNION
    SELECT b.blocker_email FROM public."BlockedUser" b WHERE b.blocked_email = public.my_email()
  ) s;
$$;

-- Blokkeert iemand en verbreekt meteen alle bestaande contact: likes, meldingen, spellen en chats.
-- Chatberichten blijven bewaard (verborgen), zodat een melding later nog te beoordelen is.
CREATE OR REPLACE FUNCTION public.block_user(p_email text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  me text := public.my_email();
  other text := lower(trim(p_email));
  other_name text;
BEGIN
  IF auth.uid() IS NULL OR coalesce(me, '') = '' THEN RAISE EXCEPTION 'Niet ingelogd'; END IF;
  IF coalesce(other, '') = '' THEN RAISE EXCEPTION 'Geen gebruiker opgegeven'; END IF;
  IF other = me THEN RAISE EXCEPTION 'Je kunt jezelf niet blokkeren'; END IF;

  SELECT left(p.display_name, 100) INTO other_name
    FROM public."UserProfile" p WHERE lower(p.user_email) = other LIMIT 1;

  INSERT INTO public."BlockedUser" (blocker_email, blocked_email, blocked_name)
  VALUES (me, other, other_name)
  ON CONFLICT (blocker_email, blocked_email) DO NOTHING;

  DELETE FROM public."Like"
   WHERE (lower(from_email) = me AND lower(to_email) = other)
      OR (lower(from_email) = other AND lower(to_email) = me);

  DELETE FROM public."Notification"
   WHERE (lower(from_email) = me AND lower(to_email) = other)
      OR (lower(from_email) = other AND lower(to_email) = me);

  DELETE FROM public."CardGameRound" WHERE session_id IN (
    SELECT g.id FROM public."GameSession" g
     WHERE (lower(g.player1_email) = me AND lower(g.player2_email) = other)
        OR (lower(g.player1_email) = other AND lower(g.player2_email) = me));
  DELETE FROM public."NumberGameState" WHERE session_id IN (
    SELECT g.id FROM public."GameSession" g
     WHERE (lower(g.player1_email) = me AND lower(g.player2_email) = other)
        OR (lower(g.player1_email) = other AND lower(g.player2_email) = me));
  DELETE FROM public."GameSession"
   WHERE (lower(player1_email) = me AND lower(player2_email) = other)
      OR (lower(player1_email) = other AND lower(player2_email) = me);

  UPDATE public."ChatRoom"
     SET status = 'deleted', deleted_at = now(), chat_closed_at = now()
   WHERE (lower(user_a_email) = me AND lower(user_b_email) = other)
      OR (lower(user_a_email) = other AND lower(user_b_email) = me);
END $$;

REVOKE ALL ON FUNCTION public.blocked_emails(), public.block_user(text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.blocked_emails(), public.block_user(text) TO authenticated;
GRANT SELECT, DELETE ON public."BlockedUser" TO authenticated;
REVOKE ALL ON public."BlockedUser" FROM anon;

-- Niet zien: profielen, locaties, verhalen en hints van iemand met wie een blokkade bestaat.
DO $$
DECLARE t text; c text;
BEGIN
  FOR t, c IN VALUES ('UserProfile','user_email'), ('UserDestination','user_email'),
                     ('VenueCheckIn','user_email'), ('Story','user_email'), ('Hint','from_email')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t||'_not_blocked', t);
    EXECUTE format('CREATE POLICY %I ON public.%I AS RESTRICTIVE FOR SELECT TO authenticated
      USING (coalesce(lower(%I), '''') <> ALL ((select public.blocked_emails())::text[]))', t||'_not_blocked', t, c);
  END LOOP;
END $$;

-- Niet bereiken: likes, chats en spellen, zowel lezen, aanmaken als wijzigen.
DO $$
DECLARE t text; a text; b text; cond text; cmd text;
BEGIN
  FOR t, a, b IN VALUES ('Like','from_email','to_email'), ('ChatRoom','user_a_email','user_b_email'),
                        ('GameSession','player1_email','player2_email')
  LOOP
    cond := format('coalesce(lower(%I), '''') <> ALL ((select public.blocked_emails())::text[]) AND coalesce(lower(%I), '''') <> ALL ((select public.blocked_emails())::text[])', a, b);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t||'_not_blocked_read', t);
    EXECUTE format('CREATE POLICY %I ON public.%I AS RESTRICTIVE FOR SELECT TO authenticated USING (%s)', t||'_not_blocked_read', t, cond);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t||'_not_blocked_insert', t);
    EXECUTE format('CREATE POLICY %I ON public.%I AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (%s)', t||'_not_blocked_insert', t, cond);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t||'_not_blocked_update', t);
    EXECUTE format('CREATE POLICY %I ON public.%I AS RESTRICTIVE FOR UPDATE TO authenticated USING (%s)', t||'_not_blocked_update', t, cond);
  END LOOP;
END $$;

-- Berichten: de bestaande regels controleren de ChatRoom, die nu verborgen is. Daardoor kan
-- een geblokkeerde gebruiker geen berichten meer lezen of sturen (ook niet in een open chat).

-- Meldingen: geen nieuwe meldingen sturen aan, of zien van, iemand met wie een blokkade bestaat.
DROP POLICY IF EXISTS "Notification_not_blocked_read" ON public."Notification";
CREATE POLICY "Notification_not_blocked_read" ON public."Notification" AS RESTRICTIVE FOR SELECT TO authenticated
  USING (coalesce(lower(from_email), '') <> ALL ((select public.blocked_emails())::text[])
     AND coalesce(lower(to_email), '') <> ALL ((select public.blocked_emails())::text[]));
DROP POLICY IF EXISTS "Notification_not_blocked_insert" ON public."Notification";
CREATE POLICY "Notification_not_blocked_insert" ON public."Notification" AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (coalesce(lower(to_email), '') <> ALL ((select public.blocked_emails())::text[]));

-- Account verwijderen ruimt ook blokkades op.
CREATE OR REPLACE FUNCTION public.delete_user_account()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  uid uuid := auth.uid();
  uemail text := coalesce(lower(auth.jwt() ->> 'email'), '');
BEGIN
  IF uid IS NULL OR uemail = '' THEN
    RAISE EXCEPTION 'Niet ingelogd';
  END IF;

  DELETE FROM "UserProfile" WHERE lower(user_email) = uemail OR lower(contact_email) = uemail;
  DELETE FROM "VenueCheckIn" WHERE lower(user_email) = uemail;
  DELETE FROM "UserDestination" WHERE lower(user_email) = uemail;
  DELETE FROM "Like" WHERE lower(from_email) = uemail OR lower(to_email) = uemail;
  DELETE FROM "Hint" WHERE lower(from_email) = uemail;
  DELETE FROM "GameSession" WHERE lower(player1_email) = uemail OR lower(player2_email) = uemail;
  DELETE FROM "CardGameRound" WHERE lower(asker_email) = uemail;
  DELETE FROM "NumberGameState" WHERE lower(player_email) = uemail;
  DELETE FROM "Notification" WHERE lower(to_email) = uemail OR lower(from_email) = uemail;
  DELETE FROM "Story" WHERE lower(user_email) = uemail;
  DELETE FROM "SearchHistory" WHERE lower(user_email) = uemail;
  DELETE FROM "ChatMessage" WHERE lower(sender_email) = uemail;
  DELETE FROM "ChatRoom" WHERE lower(user_a_email) = uemail OR lower(user_b_email) = uemail;
  DELETE FROM "SeenProfiles" WHERE lower(user_email) = uemail OR lower(seen_user_email) = uemail;
  DELETE FROM "PremiumSubscription" WHERE lower(user_email) = uemail;
  DELETE FROM "Feedback" WHERE lower(user_email) = uemail;
  DELETE FROM "BlockedUser" WHERE blocker_email = uemail OR blocked_email = uemail;

  DELETE FROM auth.users WHERE id = uid;
END;
$function$;
