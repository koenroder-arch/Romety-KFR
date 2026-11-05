-- Draait 20261105_05_moderation_account_deletion.sql terug.
-- Let op: de lijst met verbannen gebruikers en de behandelstatus van meldingen gaan hierbij verloren.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['UserProfile','Like','ChatRoom','ChatMessage','Story','Hint','UserDestination','VenueCheckIn','Report'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t||'_not_banned', t);
  END LOOP;
END $$;
DROP POLICY IF EXISTS "Storage_read_admin" ON storage.objects;
DROP POLICY IF EXISTS "Storage_delete_admin" ON storage.objects;
DROP TRIGGER IF EXISTS notify_admins_of_report ON public."Report";
DROP TRIGGER IF EXISTS report_before_insert ON public."Report";

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

DROP FUNCTION IF EXISTS public.admin_ban_user(text, text);
DROP FUNCTION IF EXISTS public.admin_resolve_report(uuid, text);
DROP FUNCTION IF EXISTS public.admin_list_reports(text);
DROP FUNCTION IF EXISTS public.purge_user_data(text);
DROP FUNCTION IF EXISTS public.notify_admins_of_report();
DROP FUNCTION IF EXISTS public.report_before_insert();
DROP FUNCTION IF EXISTS public.am_banned();
DROP FUNCTION IF EXISTS public.is_app_admin();
DROP TABLE IF EXISTS public."BannedUser";
DROP TABLE IF EXISTS public."AppAdmin";
ALTER TABLE public."Report"
  DROP COLUMN IF EXISTS status,
  DROP COLUMN IF EXISTS resolution,
  DROP COLUMN IF EXISTS resolved_at,
  DROP COLUMN IF EXISTS resolved_by;
