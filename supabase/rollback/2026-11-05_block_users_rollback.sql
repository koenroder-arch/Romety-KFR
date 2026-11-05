-- Draait 20261105_04_block_users.sql terug. Let op: de lijst met blokkades gaat hierbij verloren.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['UserProfile','UserDestination','VenueCheckIn','Story','Hint'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t||'_not_blocked', t);
  END LOOP;
  FOREACH t IN ARRAY ARRAY['Like','ChatRoom','GameSession'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t||'_not_blocked_read', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t||'_not_blocked_insert', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t||'_not_blocked_update', t);
  END LOOP;
END $$;
DROP POLICY IF EXISTS "Notification_not_blocked_read" ON public."Notification";
DROP POLICY IF EXISTS "Notification_not_blocked_insert" ON public."Notification";

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

  DELETE FROM auth.users WHERE id = uid;
END;
$function$;

DROP FUNCTION IF EXISTS public.block_user(text);
DROP FUNCTION IF EXISTS public.blocked_emails();
DROP TABLE IF EXISTS public."BlockedUser";
