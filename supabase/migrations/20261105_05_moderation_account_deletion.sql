-- Meldingen behandelen (moderatie) en een volledige accountverwijdering.
-- Terugdraaien: supabase/rollback/2026-11-05_moderation_rollback.sql
--
-- Een beheerder toevoegen doe je apart, zodat er geen e-mailadressen in de code staan:
--   INSERT INTO public."AppAdmin" (email) VALUES ('naam@voorbeeld.nl');

-- ═══════════════ Beheerders en verbannen gebruikers ═══════════════
-- Deze tabellen zijn niet rechtstreeks leesbaar vanuit de app (RLS aan, geen regels).
CREATE TABLE IF NOT EXISTS public."AppAdmin" (
  email text PRIMARY KEY CHECK (email = lower(email)),
  created_date timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public."AppAdmin" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public."AppAdmin" FROM anon, authenticated;

CREATE TABLE IF NOT EXISTS public."BannedUser" (
  email text PRIMARY KEY CHECK (email = lower(email)),
  created_date timestamptz NOT NULL DEFAULT now(),
  banned_by text,
  reason text
);
ALTER TABLE public."BannedUser" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public."BannedUser" FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.is_app_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$ SELECT EXISTS (SELECT 1 FROM public."AppAdmin" a WHERE a.email = public.my_email()); $$;

CREATE OR REPLACE FUNCTION public.am_banned()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$ SELECT EXISTS (SELECT 1 FROM public."BannedUser" b WHERE b.email = public.my_email()); $$;

REVOKE ALL ON FUNCTION public.is_app_admin(), public.am_banned() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.is_app_admin(), public.am_banned() TO authenticated;

-- Een verbannen e-mailadres kan niets meer aanmaken, ook niet na opnieuw registreren.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['UserProfile','Like','ChatRoom','ChatMessage','Story','Hint','UserDestination','VenueCheckIn','Report'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t||'_not_banned', t);
    EXECUTE format('CREATE POLICY %I ON public.%I AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (NOT (select public.am_banned()))', t||'_not_banned', t);
  END LOOP;
END $$;

-- ═══════════════ Meldingen ═══════════════
ALTER TABLE public."Report"
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'open',
  ADD COLUMN IF NOT EXISTS resolution text,
  ADD COLUMN IF NOT EXISTS resolved_at timestamptz,
  ADD COLUMN IF NOT EXISTS resolved_by text;

-- De status bepaalt de gebruiker niet zelf; beheerders krijgen direct een seintje in de app.
CREATE OR REPLACE FUNCTION public.report_before_insert()
RETURNS trigger LANGUAGE plpgsql SET search_path = ''
AS $$
BEGIN
  NEW.status := 'open';
  NEW.resolution := NULL;
  NEW.resolved_at := NULL;
  NEW.resolved_by := NULL;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS report_before_insert ON public."Report";
CREATE TRIGGER report_before_insert BEFORE INSERT ON public."Report"
  FOR EACH ROW EXECUTE FUNCTION public.report_before_insert();

CREATE OR REPLACE FUNCTION public.notify_admins_of_report()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public."Notification" (to_email, from_email, from_name, type, is_read, created_date)
  SELECT a.email, 'system', 'Romety', 'report', false, now() FROM public."AppAdmin" a;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.notify_admins_of_report() FROM public, anon, authenticated;
DROP TRIGGER IF EXISTS notify_admins_of_report ON public."Report";
CREATE TRIGGER notify_admins_of_report AFTER INSERT ON public."Report"
  FOR EACH ROW EXECUTE FUNCTION public.notify_admins_of_report();

-- Alleen beheerders: meldingen bekijken.
CREATE OR REPLACE FUNCTION public.admin_list_reports(p_status text DEFAULT 'open')
RETURNS TABLE (
  id uuid, created_date timestamptz, reason text, details text, status text, resolution text,
  reported_email text, reported_name text, reported_photo text, reported_bio text,
  reports_about_user bigint, is_banned boolean
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  IF NOT public.is_app_admin() THEN RAISE EXCEPTION 'Geen toegang' USING ERRCODE = '42501'; END IF;
  RETURN QUERY
  SELECT r.id, r.created_date, r.reason, r.details, r.status, r.resolution,
         lower(r.reported_email), coalesce(p.display_name, r.reported_name), p.photo_url, p.bio,
         (SELECT count(*) FROM public."Report" x WHERE lower(x.reported_email) = lower(r.reported_email)),
         EXISTS (SELECT 1 FROM public."BannedUser" b WHERE b.email = lower(r.reported_email))
    FROM public."Report" r
    LEFT JOIN LATERAL (
      SELECT u.display_name, u.photo_url, u.bio FROM public."UserProfile" u
       WHERE lower(u.user_email) = lower(r.reported_email) LIMIT 1
    ) p ON true
   WHERE r.status = p_status
   ORDER BY r.created_date DESC NULLS LAST
   LIMIT 200;
END $$;

-- Alleen beheerders: melding afsluiten, eventueel met een waarschuwing aan de gemelde gebruiker.
CREATE OR REPLACE FUNCTION public.admin_resolve_report(p_report_id uuid, p_resolution text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE target text;
BEGIN
  IF NOT public.is_app_admin() THEN RAISE EXCEPTION 'Geen toegang' USING ERRCODE = '42501'; END IF;
  IF p_resolution NOT IN ('no_action', 'warned') THEN RAISE EXCEPTION 'Onbekende actie'; END IF;

  UPDATE public."Report"
     SET status = 'resolved', resolution = p_resolution, resolved_at = now(), resolved_by = public.my_email()
   WHERE id = p_report_id AND status = 'open'
  RETURNING lower(reported_email) INTO target;
  IF target IS NULL THEN RAISE EXCEPTION 'Melding niet gevonden of al afgehandeld'; END IF;

  IF p_resolution = 'warned' THEN
    INSERT INTO public."Notification" (to_email, from_email, from_name, type, is_read, created_date)
    VALUES (target, 'system', 'Romety', 'warning', false, now());
  END IF;
END $$;

-- Alleen beheerders: gebruiker verbannen en alle gegevens verwijderen.
-- Geeft de bestanden terug die de app daarna uit de opslag verwijdert.
CREATE OR REPLACE FUNCTION public.admin_ban_user(p_email text, p_reason text DEFAULT NULL)
RETURNS text[] LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  target text := lower(trim(p_email));
  files text[] := '{}';
BEGIN
  IF NOT public.is_app_admin() THEN RAISE EXCEPTION 'Geen toegang' USING ERRCODE = '42501'; END IF;
  IF coalesce(target, '') = '' THEN RAISE EXCEPTION 'Geen gebruiker opgegeven'; END IF;
  IF target = public.my_email() OR EXISTS (SELECT 1 FROM public."AppAdmin" a WHERE a.email = target) THEN
    RAISE EXCEPTION 'Een beheerder kan niet verbannen worden';
  END IF;

  SELECT coalesce(array_agg(DISTINCT u), '{}') INTO files FROM (
    SELECT p.photo_url AS u FROM public."UserProfile" p WHERE lower(p.user_email) = target
    UNION ALL
    SELECT coalesce(e.value ->> 'url', e.value #>> '{}')
      FROM public."UserProfile" p, jsonb_array_elements(to_jsonb(p.photos)) e
     WHERE lower(p.user_email) = target AND jsonb_typeof(to_jsonb(p.photos)) = 'array'
    UNION ALL
    SELECT s.media_url FROM public."Story" s WHERE lower(s.user_email) = target
    UNION ALL
    SELECT m.media_url FROM public."ChatMessage" m WHERE lower(m.sender_email) = target
  ) x WHERE u IS NOT NULL AND u <> '';

  INSERT INTO public."BannedUser" (email, banned_by, reason)
  VALUES (target, public.my_email(), left(p_reason, 500))
  ON CONFLICT (email) DO NOTHING;

  PERFORM public.purge_user_data(target);

  UPDATE public."Report"
     SET status = 'resolved', resolution = 'banned', resolved_at = now(), resolved_by = public.my_email()
   WHERE lower(reported_email) = target AND status = 'open';

  DELETE FROM auth.users WHERE lower(email) = target;
  RETURN files;
END $$;

-- Beheerders mogen bestanden van een verbannen gebruiker uit de opslag verwijderen.
DROP POLICY IF EXISTS "Storage_read_admin" ON storage.objects;
CREATE POLICY "Storage_read_admin" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id IN ('uploads', 'chat-uploads') AND (select public.is_app_admin()));
DROP POLICY IF EXISTS "Storage_delete_admin" ON storage.objects;
CREATE POLICY "Storage_delete_admin" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id IN ('uploads', 'chat-uploads') AND (select public.is_app_admin()));

-- ═══════════════ Gegevens verwijderen ═══════════════
-- Gedeeld door account verwijderen en verbannen. Niet rechtstreeks aan te roepen vanuit de app.
CREATE OR REPLACE FUNCTION public.purge_user_data(p_email text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  DELETE FROM public."UserProfile" WHERE lower(user_email) = p_email;
  DELETE FROM public."VenueCheckIn" WHERE lower(user_email) = p_email;
  DELETE FROM public."UserDestination" WHERE lower(user_email) = p_email;
  DELETE FROM public."Like" WHERE lower(from_email) = p_email OR lower(to_email) = p_email;
  DELETE FROM public."Hint" WHERE lower(from_email) = p_email;
  DELETE FROM public."GameSession" WHERE lower(player1_email) = p_email OR lower(player2_email) = p_email;
  DELETE FROM public."CardGameRound" WHERE lower(asker_email) = p_email;
  DELETE FROM public."NumberGameState" WHERE lower(player_email) = p_email;
  DELETE FROM public."Notification" WHERE lower(to_email) = p_email OR lower(from_email) = p_email;
  DELETE FROM public."Story" WHERE lower(user_email) = p_email;
  DELETE FROM public."SearchHistory" WHERE lower(user_email) = p_email;
  DELETE FROM public."ChatMessage" WHERE lower(sender_email) = p_email;
  -- Berichten van de ander in deze chats verdwijnen automatisch mee (ON DELETE CASCADE)
  DELETE FROM public."ChatRoom" WHERE lower(user_a_email) = p_email OR lower(user_b_email) = p_email;
  DELETE FROM public."SeenProfiles" WHERE lower(user_email) = p_email OR lower(seen_user_email) = p_email;
  DELETE FROM public."PremiumSubscription" WHERE lower(user_email) = p_email;
  DELETE FROM public."Feedback" WHERE lower(user_email) = p_email;
  DELETE FROM public."BlockedUser" WHERE blocker_email = p_email OR blocked_email = p_email;
  -- Vertrekreden en eigen meldingen blijven bewaard, maar zonder te herleiden naar deze persoon
  UPDATE public."AccountDeletionSurvey" SET user_email = NULL WHERE lower(user_email) = p_email;
  UPDATE public."Report" SET reporter_email = 'verwijderd-account', reporter_name = NULL WHERE lower(reporter_email) = p_email;
END $$;
REVOKE ALL ON FUNCTION public.purge_user_data(text) FROM public, anon, authenticated;

CREATE OR REPLACE FUNCTION public.delete_user_account()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $function$
DECLARE
  uid uuid := auth.uid();
  uemail text := coalesce(lower(auth.jwt() ->> 'email'), '');
BEGIN
  IF uid IS NULL OR uemail = '' THEN
    RAISE EXCEPTION 'Niet ingelogd';
  END IF;
  PERFORM public.purge_user_data(uemail);
  DELETE FROM auth.users WHERE id = uid;
END;
$function$;
REVOKE ALL ON FUNCTION public.delete_user_account() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.delete_user_account() TO authenticated;

REVOKE ALL ON FUNCTION public.admin_list_reports(text), public.admin_resolve_report(uuid, text), public.admin_ban_user(text, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_reports(text), public.admin_resolve_report(uuid, text), public.admin_ban_user(text, text) TO authenticated;
