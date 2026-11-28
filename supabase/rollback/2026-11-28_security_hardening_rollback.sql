-- Terugdraaien van supabase/migrations/20261128_08_security_hardening.sql
-- Zet de rechten en regels terug zoals ze op 2026-11-28 vóór de migratie waren.

-- 1. Rechten
GRANT ALL ON public."AccountDeletionSurvey", public."CardGameRound", public."ChatMessage", public."ChatRoom",
  public."Club", public."Feedback", public."GameSession", public."Hint", public."Like", public."Notification",
  public."NumberGameState", public."PremiumSubscription", public."Report", public."SearchHistory",
  public."SeenProfiles", public."Story", public."UserDestination", public."UserProfile", public."VenueCheckIn"
  TO anon;
GRANT TRUNCATE, TRIGGER, REFERENCES ON ALL TABLES IN SCHEMA public TO authenticated;
REVOKE ALL ON public."BlockedUser", public."AppAdmin", public."BannedUser" FROM anon;
REVOKE TRUNCATE, TRIGGER, REFERENCES ON public."AppAdmin", public."BannedUser" FROM authenticated;

-- 2. Meldingen
DROP POLICY IF EXISTS "Notification_no_admin_types" ON public."Notification";
DROP POLICY IF EXISTS "Notification_insert" ON public."Notification";
CREATE POLICY "Notification_insert" ON public."Notification" FOR INSERT TO authenticated
  WITH CHECK (lower(from_email) = (select public.my_email()) OR from_email = 'system' OR from_email IS NULL
              OR lower(to_email) = (select public.my_email()));

-- 3 en 4. Chatbewaking
DROP TRIGGER IF EXISTS guard_chat_message ON public."ChatMessage";
DROP TRIGGER IF EXISTS guard_chat_room ON public."ChatRoom";
DROP FUNCTION IF EXISTS public.guard_chat_message();
DROP FUNCTION IF EXISTS public.guard_chat_room();
