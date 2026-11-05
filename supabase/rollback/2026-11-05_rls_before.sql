-- ROLLBACK: zet RLS-policies en storage-buckets terug naar de stand van 2026-11-05 (vóór de beveiligingsfix).
-- Gebruik: plak in Supabase SQL Editor en voer uit. Verwijdert eerst alle policies op public/storage
-- (ook nieuwe), en maakt daarna de oude exact opnieuw aan.
BEGIN;

DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT policyname, schemaname, tablename FROM pg_policies
           WHERE schemaname = 'public' OR (schemaname = 'storage' AND tablename = 'objects')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
  END LOOP;
END $$;

CREATE POLICY "profiel 1va6avm_0" ON storage.objects AS PERMISSIVE FOR INSERT TO public WITH CHECK ((bucket_id = 'uploads'::text));
CREATE POLICY "Allow public uploads to chat-uploads" ON storage.objects AS PERMISSIVE FOR INSERT TO public WITH CHECK ((bucket_id = 'chat-uploads'::text));
CREATE POLICY "Storage_public_insert" ON storage.objects AS PERMISSIVE FOR INSERT TO public WITH CHECK ((bucket_id = ANY (ARRAY['uploads'::text, 'chat-uploads'::text])));
CREATE POLICY "Storage_public_delete" ON storage.objects AS PERMISSIVE FOR DELETE TO public USING ((bucket_id = ANY (ARRAY['uploads'::text, 'chat-uploads'::text])));
CREATE POLICY "Allow public delete 1va6avm_0" ON storage.objects AS PERMISSIVE FOR DELETE TO anon, authenticated USING ((bucket_id = 'uploads'::text));
CREATE POLICY "Allow public delete 1va6avm_1" ON storage.objects AS PERMISSIVE FOR SELECT TO anon, authenticated USING ((bucket_id = 'uploads'::text));
CREATE POLICY "Allow public delete tjytjx_0" ON storage.objects AS PERMISSIVE FOR DELETE TO anon, authenticated USING ((bucket_id = 'chat-uploads'::text));
CREATE POLICY "Allow public delete tjytjx_1" ON storage.objects AS PERMISSIVE FOR SELECT TO anon, authenticated USING ((bucket_id = 'chat-uploads'::text));
CREATE POLICY "Storage_auth_insert" ON storage.objects AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((bucket_id = ANY (ARRAY['uploads'::text, 'chat-uploads'::text])));
CREATE POLICY "Storage_auth_delete" ON storage.objects AS PERMISSIVE FOR DELETE TO authenticated USING ((bucket_id = ANY (ARRAY['uploads'::text, 'chat-uploads'::text])));

CREATE POLICY "GameSession_all" ON public."GameSession" AS PERMISSIVE FOR ALL TO public USING (true);
CREATE POLICY "CardGameRound_all" ON public."CardGameRound" AS PERMISSIVE FOR ALL TO public USING (true);
CREATE POLICY "NumberGameState_all" ON public."NumberGameState" AS PERMISSIVE FOR ALL TO public USING (true);
CREATE POLICY "Report_insert" ON public."Report" AS PERMISSIVE FOR INSERT TO public WITH CHECK ((reporter_email IS NOT NULL));
CREATE POLICY "Report_select" ON public."Report" AS PERMISSIVE FOR SELECT TO public USING ((reporter_email IS NOT NULL));
CREATE POLICY "Survey_insert" ON public."AccountDeletionSurvey" AS PERMISSIVE FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Survey_select" ON public."AccountDeletionSurvey" AS PERMISSIVE FOR SELECT TO public USING ((user_email IS NOT NULL));
CREATE POLICY "Feedback_insert" ON public."Feedback" AS PERMISSIVE FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Feedback_select" ON public."Feedback" AS PERMISSIVE FOR SELECT TO public USING ((user_email IS NOT NULL));
CREATE POLICY "ChatRoom_select" ON public."ChatRoom" AS PERMISSIVE FOR SELECT TO public USING (((user_a_email IS NOT NULL) AND (user_b_email IS NOT NULL)));
CREATE POLICY "ChatRoom_insert" ON public."ChatRoom" AS PERMISSIVE FOR INSERT TO public WITH CHECK (((user_a_email IS NOT NULL) AND (user_b_email IS NOT NULL)));
CREATE POLICY "ChatRoom_update" ON public."ChatRoom" AS PERMISSIVE FOR UPDATE TO public USING (true);
CREATE POLICY "ChatRoom_delete" ON public."ChatRoom" AS PERMISSIVE FOR DELETE TO public USING (true);
CREATE POLICY "ChatMessage_select" ON public."ChatMessage" AS PERMISSIVE FOR SELECT TO public USING ((room_id IS NOT NULL));
CREATE POLICY "ChatMessage_insert" ON public."ChatMessage" AS PERMISSIVE FOR INSERT TO public WITH CHECK (((room_id IS NOT NULL) AND (sender_email IS NOT NULL)));
CREATE POLICY "ChatMessage_update" ON public."ChatMessage" AS PERMISSIVE FOR UPDATE TO public USING (true);
CREATE POLICY "ChatMessage_delete" ON public."ChatMessage" AS PERMISSIVE FOR DELETE TO public USING (true);
CREATE POLICY "PremiumSubscription_all" ON public."PremiumSubscription" AS PERMISSIVE FOR ALL TO public USING ((user_email IS NOT NULL));
CREATE POLICY "UserDestination_select" ON public."UserDestination" AS PERMISSIVE FOR SELECT TO public USING (true);
CREATE POLICY "UserDestination_insert" ON public."UserDestination" AS PERMISSIVE FOR INSERT TO public WITH CHECK (((user_email IS NOT NULL) AND (length(TRIM(BOTH FROM user_email)) > 0)));
CREATE POLICY "UserDestination_update" ON public."UserDestination" AS PERMISSIVE FOR UPDATE TO public USING ((user_email IS NOT NULL));
CREATE POLICY "UserDestination_delete" ON public."UserDestination" AS PERMISSIVE FOR DELETE TO public USING ((user_email IS NOT NULL));
CREATE POLICY "VenueCheckIn_select" ON public."VenueCheckIn" AS PERMISSIVE FOR SELECT TO public USING (true);
CREATE POLICY "VenueCheckIn_insert" ON public."VenueCheckIn" AS PERMISSIVE FOR INSERT TO public WITH CHECK (((user_email IS NOT NULL) AND (length(TRIM(BOTH FROM user_email)) > 0)));
CREATE POLICY "VenueCheckIn_update" ON public."VenueCheckIn" AS PERMISSIVE FOR UPDATE TO public USING ((user_email IS NOT NULL));
CREATE POLICY "VenueCheckIn_delete" ON public."VenueCheckIn" AS PERMISSIVE FOR DELETE TO public USING ((user_email IS NOT NULL));
CREATE POLICY "UserProfile_select" ON public."UserProfile" AS PERMISSIVE FOR SELECT TO public USING (true);
CREATE POLICY "UserProfile_insert" ON public."UserProfile" AS PERMISSIVE FOR INSERT TO public WITH CHECK (((user_email IS NOT NULL) AND (length(TRIM(BOTH FROM user_email)) > 0)));
CREATE POLICY "UserProfile_update" ON public."UserProfile" AS PERMISSIVE FOR UPDATE TO public USING ((user_email IS NOT NULL));
CREATE POLICY "UserProfile_delete" ON public."UserProfile" AS PERMISSIVE FOR DELETE TO public USING ((user_email IS NOT NULL));
CREATE POLICY "Club_select" ON public."Club" AS PERMISSIVE FOR SELECT TO public USING (true);
CREATE POLICY "Like_select" ON public."Like" AS PERMISSIVE FOR SELECT TO public USING (((from_email IS NOT NULL) OR (to_email IS NOT NULL)));
CREATE POLICY "Like_insert" ON public."Like" AS PERMISSIVE FOR INSERT TO public WITH CHECK (((from_email IS NOT NULL) AND (to_email IS NOT NULL)));
CREATE POLICY "Like_delete" ON public."Like" AS PERMISSIVE FOR DELETE TO public USING (true);
CREATE POLICY "Hint_select" ON public."Hint" AS PERMISSIVE FOR SELECT TO public USING (true);
CREATE POLICY "Hint_insert" ON public."Hint" AS PERMISSIVE FOR INSERT TO public WITH CHECK ((from_email IS NOT NULL));
CREATE POLICY "Hint_update" ON public."Hint" AS PERMISSIVE FOR UPDATE TO public USING (true);
CREATE POLICY "Hint_delete" ON public."Hint" AS PERMISSIVE FOR DELETE TO public USING (true);
CREATE POLICY "Story_select" ON public."Story" AS PERMISSIVE FOR SELECT TO public USING (true);
CREATE POLICY "Story_insert" ON public."Story" AS PERMISSIVE FOR INSERT TO public WITH CHECK ((user_email IS NOT NULL));
CREATE POLICY "Story_delete" ON public."Story" AS PERMISSIVE FOR DELETE TO public USING (true);
CREATE POLICY "Notification_select" ON public."Notification" AS PERMISSIVE FOR SELECT TO public USING ((to_email IS NOT NULL));
CREATE POLICY "Notification_insert" ON public."Notification" AS PERMISSIVE FOR INSERT TO public WITH CHECK ((to_email IS NOT NULL));
CREATE POLICY "Notification_update" ON public."Notification" AS PERMISSIVE FOR UPDATE TO public USING (true);
CREATE POLICY "Notification_delete" ON public."Notification" AS PERMISSIVE FOR DELETE TO public USING (true);
CREATE POLICY "SearchHistory_select" ON public."SearchHistory" AS PERMISSIVE FOR SELECT TO public USING ((user_email IS NOT NULL));
CREATE POLICY "SearchHistory_insert" ON public."SearchHistory" AS PERMISSIVE FOR INSERT TO public WITH CHECK (((user_email IS NOT NULL) AND (length(TRIM(BOTH FROM user_email)) > 0)));
CREATE POLICY "SearchHistory_delete" ON public."SearchHistory" AS PERMISSIVE FOR DELETE TO public USING ((user_email IS NOT NULL));
CREATE POLICY "SeenProfiles_all" ON public."SeenProfiles" AS PERMISSIVE FOR ALL TO public USING ((user_email IS NOT NULL));

UPDATE storage.buckets SET public = true, file_size_limit = NULL, allowed_mime_types = NULL WHERE id IN ('uploads', 'chat-uploads');

COMMIT;
