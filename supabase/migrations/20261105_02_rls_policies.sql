-- Stap 2 beveiliging: echte RLS-regels. Wordt in GROEPEN toegepast (A t/m E), na elke groep testen.
-- Terugdraaien: supabase/rollback/2026-11-05_rls_before.sql
-- "me" = (select public.my_email()) = e-mailadres van de ingelogde gebruiker.
-- Alle regels gelden alleen voor ingelogde gebruikers (authenticated), behalve Club (publiek).

-- ═══════════════ GROEP A — alleen eigen gegevens ═══════════════
DROP POLICY IF EXISTS "SearchHistory_select" ON public."SearchHistory";
DROP POLICY IF EXISTS "SearchHistory_insert" ON public."SearchHistory";
DROP POLICY IF EXISTS "SearchHistory_delete" ON public."SearchHistory";
CREATE POLICY "SearchHistory_own" ON public."SearchHistory" FOR ALL TO authenticated
  USING (lower(user_email) = (select public.my_email()))
  WITH CHECK (lower(user_email) = (select public.my_email()));

DROP POLICY IF EXISTS "SeenProfiles_all" ON public."SeenProfiles";
CREATE POLICY "SeenProfiles_own" ON public."SeenProfiles" FOR ALL TO authenticated
  USING (lower(user_email) = (select public.my_email()))
  WITH CHECK (lower(user_email) = (select public.my_email()));

DROP POLICY IF EXISTS "PremiumSubscription_all" ON public."PremiumSubscription";
CREATE POLICY "PremiumSubscription_own" ON public."PremiumSubscription" FOR ALL TO authenticated
  USING (lower(user_email) = (select public.my_email()))
  WITH CHECK (lower(user_email) = (select public.my_email()));

DROP POLICY IF EXISTS "Feedback_insert" ON public."Feedback";
DROP POLICY IF EXISTS "Feedback_select" ON public."Feedback";
CREATE POLICY "Feedback_insert_own" ON public."Feedback" FOR INSERT TO authenticated
  WITH CHECK (user_email IS NULL OR lower(user_email) = (select public.my_email()));

DROP POLICY IF EXISTS "Survey_insert" ON public."AccountDeletionSurvey";
DROP POLICY IF EXISTS "Survey_select" ON public."AccountDeletionSurvey";
CREATE POLICY "Survey_insert_own" ON public."AccountDeletionSurvey" FOR INSERT TO authenticated
  WITH CHECK (lower(user_email) = (select public.my_email()));

DROP POLICY IF EXISTS "Report_insert" ON public."Report";
DROP POLICY IF EXISTS "Report_select" ON public."Report";
CREATE POLICY "Report_insert_own" ON public."Report" FOR INSERT TO authenticated
  WITH CHECK (lower(reporter_email) = (select public.my_email()));
CREATE POLICY "Report_select_own" ON public."Report" FOR SELECT TO authenticated
  USING (lower(reporter_email) = (select public.my_email()));

DROP POLICY IF EXISTS "Club_select" ON public."Club";
CREATE POLICY "Club_select_all" ON public."Club" FOR SELECT TO anon, authenticated USING (true);

-- ═══════════════ GROEP B — profielen, locaties, stories, hints ═══════════════
-- Lezen: alle ingelogde gebruikers (nodig voor matches/kaart). Schrijven: alleen je eigen rijen.
DO $$
DECLARE t text; c text;
BEGIN
  FOR t, c IN VALUES ('UserProfile','user_email'), ('UserDestination','user_email'),
                     ('VenueCheckIn','user_email'), ('Story','user_email'), ('Hint','from_email')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t||'_select', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t||'_insert', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t||'_update', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t||'_delete', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (true)', t||'_read', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK (lower(%I) = (select public.my_email()))', t||'_insert_own', t, c);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING (lower(%I) = (select public.my_email())) WITH CHECK (lower(%I) = (select public.my_email()))', t||'_update_own', t, c, c);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR DELETE TO authenticated USING (lower(%I) = (select public.my_email()))', t||'_delete_own', t, c);
  END LOOP;
END $$;

-- likes_received mag niet door de gebruiker zelf aangepast worden (alleen via increment_likes_received)
CREATE OR REPLACE FUNCTION public.protect_profile_counters()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  IF current_user IN ('authenticated', 'anon') THEN
    NEW.likes_received := OLD.likes_received;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS protect_profile_counters ON public."UserProfile";
CREATE TRIGGER protect_profile_counters BEFORE UPDATE ON public."UserProfile"
  FOR EACH ROW EXECUTE FUNCTION public.protect_profile_counters();

-- ═══════════════ GROEP C — likes en meldingen ═══════════════
DROP POLICY IF EXISTS "Like_select" ON public."Like";
DROP POLICY IF EXISTS "Like_insert" ON public."Like";
DROP POLICY IF EXISTS "Like_delete" ON public."Like";
CREATE POLICY "Like_read_mine" ON public."Like" FOR SELECT TO authenticated
  USING (lower(from_email) = (select public.my_email()) OR lower(to_email) = (select public.my_email()));
CREATE POLICY "Like_insert_own" ON public."Like" FOR INSERT TO authenticated
  WITH CHECK (lower(from_email) = (select public.my_email()));
CREATE POLICY "Like_delete_mine" ON public."Like" FOR DELETE TO authenticated
  USING (lower(from_email) = (select public.my_email()) OR lower(to_email) = (select public.my_email()));

DROP POLICY IF EXISTS "Notification_select" ON public."Notification";
DROP POLICY IF EXISTS "Notification_insert" ON public."Notification";
DROP POLICY IF EXISTS "Notification_update" ON public."Notification";
DROP POLICY IF EXISTS "Notification_delete" ON public."Notification";
-- Ook verstuurde meldingen leesbaar: de app leest een nieuwe melding direct terug na aanmaken
-- (anders wordt bv. de match-melding aan de ander geweigerd en verschijnt het match-scherm niet).
CREATE POLICY "Notification_read_mine" ON public."Notification" FOR SELECT TO authenticated
  USING (lower(to_email) = (select public.my_email()) OR lower(from_email) = (select public.my_email()));
CREATE POLICY "Notification_insert" ON public."Notification" FOR INSERT TO authenticated
  WITH CHECK (lower(from_email) = (select public.my_email()) OR from_email = 'system' OR from_email IS NULL
              OR lower(to_email) = (select public.my_email()));
CREATE POLICY "Notification_update_mine" ON public."Notification" FOR UPDATE TO authenticated
  USING (lower(to_email) = (select public.my_email()))
  WITH CHECK (lower(to_email) = (select public.my_email()));
CREATE POLICY "Notification_delete_mine" ON public."Notification" FOR DELETE TO authenticated
  USING (lower(to_email) = (select public.my_email()) OR lower(from_email) = (select public.my_email()));

-- ═══════════════ GROEP D — chats en spelletjes (alleen deelnemers) ═══════════════
DROP POLICY IF EXISTS "ChatRoom_select" ON public."ChatRoom";
DROP POLICY IF EXISTS "ChatRoom_insert" ON public."ChatRoom";
DROP POLICY IF EXISTS "ChatRoom_update" ON public."ChatRoom";
DROP POLICY IF EXISTS "ChatRoom_delete" ON public."ChatRoom";
CREATE POLICY "ChatRoom_participants" ON public."ChatRoom" FOR ALL TO authenticated
  USING (lower(user_a_email) = (select public.my_email()) OR lower(user_b_email) = (select public.my_email()))
  WITH CHECK (lower(user_a_email) = (select public.my_email()) OR lower(user_b_email) = (select public.my_email()));

DROP POLICY IF EXISTS "ChatMessage_select" ON public."ChatMessage";
DROP POLICY IF EXISTS "ChatMessage_insert" ON public."ChatMessage";
DROP POLICY IF EXISTS "ChatMessage_update" ON public."ChatMessage";
DROP POLICY IF EXISTS "ChatMessage_delete" ON public."ChatMessage";
CREATE POLICY "ChatMessage_read_participants" ON public."ChatMessage" FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public."ChatRoom" r WHERE r.id = room_id
          AND (lower(r.user_a_email) = (select public.my_email()) OR lower(r.user_b_email) = (select public.my_email()))));
CREATE POLICY "ChatMessage_insert_participants" ON public."ChatMessage" FOR INSERT TO authenticated
  WITH CHECK ((lower(sender_email) = (select public.my_email()) OR sender_email = 'system')
    AND EXISTS (SELECT 1 FROM public."ChatRoom" r WHERE r.id = room_id
          AND (lower(r.user_a_email) = (select public.my_email()) OR lower(r.user_b_email) = (select public.my_email()))));
CREATE POLICY "ChatMessage_delete_participants" ON public."ChatMessage" FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public."ChatRoom" r WHERE r.id = room_id
          AND (lower(r.user_a_email) = (select public.my_email()) OR lower(r.user_b_email) = (select public.my_email()))));

DROP POLICY IF EXISTS "GameSession_all" ON public."GameSession";
CREATE POLICY "GameSession_players" ON public."GameSession" FOR ALL TO authenticated
  USING (lower(player1_email) = (select public.my_email()) OR lower(player2_email) = (select public.my_email()))
  WITH CHECK (lower(player1_email) = (select public.my_email()) OR lower(player2_email) = (select public.my_email()));

DROP POLICY IF EXISTS "CardGameRound_all" ON public."CardGameRound";
CREATE POLICY "CardGameRound_players" ON public."CardGameRound" FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public."GameSession" g WHERE g.id = session_id
          AND (lower(g.player1_email) = (select public.my_email()) OR lower(g.player2_email) = (select public.my_email()))))
  WITH CHECK (EXISTS (SELECT 1 FROM public."GameSession" g WHERE g.id = session_id
          AND (lower(g.player1_email) = (select public.my_email()) OR lower(g.player2_email) = (select public.my_email()))));

DROP POLICY IF EXISTS "NumberGameState_all" ON public."NumberGameState";
CREATE POLICY "NumberGameState_players" ON public."NumberGameState" FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public."GameSession" g WHERE g.id = session_id
          AND (lower(g.player1_email) = (select public.my_email()) OR lower(g.player2_email) = (select public.my_email()))))
  WITH CHECK (EXISTS (SELECT 1 FROM public."GameSession" g WHERE g.id = session_id
          AND (lower(g.player1_email) = (select public.my_email()) OR lower(g.player2_email) = (select public.my_email()))));

-- ═══════════════ GROEP E — bestanden (storage) ═══════════════
-- Bestanden blijven publiek te bekijken via hun link (nodig voor foto's in de app),
-- maar uploaden alleen ingelogd, en verwijderen/opvragen alleen je eigen bestanden.
DROP POLICY IF EXISTS "profiel 1va6avm_0" ON storage.objects;
DROP POLICY IF EXISTS "Allow public uploads to chat-uploads" ON storage.objects;
DROP POLICY IF EXISTS "Storage_public_insert" ON storage.objects;
DROP POLICY IF EXISTS "Storage_public_delete" ON storage.objects;
DROP POLICY IF EXISTS "Allow public delete 1va6avm_0" ON storage.objects;
DROP POLICY IF EXISTS "Allow public delete 1va6avm_1" ON storage.objects;
DROP POLICY IF EXISTS "Allow public delete tjytjx_0" ON storage.objects;
DROP POLICY IF EXISTS "Allow public delete tjytjx_1" ON storage.objects;
DROP POLICY IF EXISTS "Storage_auth_insert" ON storage.objects;
DROP POLICY IF EXISTS "Storage_auth_delete" ON storage.objects;
CREATE POLICY "Storage_upload_auth" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id IN ('uploads', 'chat-uploads'));
CREATE POLICY "Storage_read_own" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id IN ('uploads', 'chat-uploads') AND owner_id = (select auth.uid()::text));
CREATE POLICY "Storage_delete_own" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id IN ('uploads', 'chat-uploads') AND owner_id = (select auth.uid()::text));
UPDATE storage.buckets SET file_size_limit = 52428800, allowed_mime_types = ARRAY['image/*', 'video/*'] WHERE id = 'uploads';
UPDATE storage.buckets SET file_size_limit = 20971520, allowed_mime_types = ARRAY['image/*'] WHERE id = 'chat-uploads';
