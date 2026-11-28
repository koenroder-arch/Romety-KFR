-- Fase 4 beveiliging. De app hoeft hiervoor niets anders te doen: de database controleert
-- alleen of elke wijziging past bij wat de app zelf doet, zodat niemand via de API kan
-- vals spelen (nep-systemberichten, nep-waarschuwingen, chatfases overslaan, timers verlengen).
-- Terugdraaien: supabase/rollback/2026-11-28_security_hardening_rollback.sql

-- ═══════════════ 1. Niet-ingelogde bezoekers ═══════════════
-- Zonder inlog had niemand al rijen kunnen lezen (alle regels gelden voor ingelogde gebruikers),
-- maar de tabellen waren wel zichtbaar in de API. Alleen Club (venues) blijft openbaar.
-- Inloggen gebruikt account_exists(); die functie blijft beschikbaar.
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
GRANT SELECT ON public."Club" TO anon;

-- Rechten die de app nooit gebruikt (tabel leegmaken, triggers, verwijzingen) ook niet voor ingelogden
REVOKE TRUNCATE, TRIGGER, REFERENCES ON ALL TABLES IN SCHEMA public FROM authenticated;

-- ═══════════════ 2. Meldingen ═══════════════
-- Voorheen mocht iedereen een melding sturen met afzender 'system' of zonder afzender.
-- Nu: de afzender ben jij, of de melding is voor jezelf (zoals de app doet bij een match).
DROP POLICY IF EXISTS "Notification_insert" ON public."Notification";
CREATE POLICY "Notification_insert" ON public."Notification" FOR INSERT TO authenticated
  WITH CHECK (lower(from_email) = (select public.my_email()) OR lower(to_email) = (select public.my_email()));

-- Waarschuwingen en meldingen over rapportages komen alleen van de database zelf
-- (admin_resolve_report en notify_admins_of_report), nooit van een gebruiker.
DROP POLICY IF EXISTS "Notification_no_admin_types" ON public."Notification";
CREATE POLICY "Notification_no_admin_types" ON public."Notification" AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (coalesce(type, '') NOT IN ('warning', 'report'));

-- ═══════════════ 3. Chatberichten ═══════════════
-- Systeemberichten (afzender 'system') mogen alleen de vaste teksten van de app zijn.
-- Een eigen bericht als systeembericht kan alleen voor het delen van contactgegevens.
CREATE OR REPLACE FUNCTION public.guard_chat_message()
RETURNS trigger LANGUAGE plpgsql SET search_path = ''
AS $$
BEGIN
  IF current_user NOT IN ('authenticated', 'anon') THEN RETURN NEW; END IF;

  IF NEW.sender_email = 'system' THEN
    IF coalesce(NEW.content, '') NOT IN (
      '💬 Chat gestart! Jullie hebben 48 uur om te chatten.',
      '48 uur extra chat! Stuur een foto',
      'Nog 24 uur om te chatten!',
      'Jullie kunnen nu contactgegevens uitwisselen!',
      'Chat verlengd!',
      '🎉 Beide contactgegevens zijn uitgewisseld! De chat wordt over 5 dagen verwijderd.'
    ) THEN
      RAISE EXCEPTION 'Onbekend systeembericht' USING ERRCODE = '42501';
    END IF;
  ELSIF coalesce(NEW.is_system, false) OR NEW.type = 'system' THEN
    IF coalesce(NEW.content, '') !~ '^(Snapchat|Instagram|Nummer): .+' THEN
      RAISE EXCEPTION 'Alleen contactgegevens mogen als systeembericht' USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS guard_chat_message ON public."ChatMessage";
CREATE TRIGGER guard_chat_message BEFORE INSERT ON public."ChatMessage"
  FOR EACH ROW EXECUTE FUNCTION public.guard_chat_message();

-- ═══════════════ 4. Chats ═══════════════
-- Precies de stappen die de app zet, en verder niets:
--  - een chat starten kan alleen met een supermatch (wederzijdse like), als uitnodiging
--  - alleen de uitgenodigde kan accepteren
--  - een fase gaat pas verder als beide hebben ingestemd, en altijd maar één stap
--  - de timer kan niet verder vooruit dan 48 uur (+ marge) en niet los worden verlengd
--  - "foto gestuurd", "akkoord", "contact gedeeld" en "gelezen tot" zet je alleen voor jezelf
--  - beëindigen (verwijderen, weigeren, inactiviteit) kan altijd; een beëindigde chat komt niet terug
CREATE OR REPLACE FUNCTION public.guard_chat_room()
RETURNS trigger LANGUAGE plpgsql SET search_path = ''
AS $$
DECLARE
  me text := public.my_email();
  is_a boolean;
  is_b boolean;
  max_expiry timestamptz := now() + interval '48 hours 10 minutes';
BEGIN
  IF current_user NOT IN ('authenticated', 'anon') THEN RETURN NEW; END IF;

  IF TG_OP = 'INSERT' THEN
    IF lower(NEW.user_a_email) <> me THEN
      RAISE EXCEPTION 'Je kunt alleen zelf een chat starten' USING ERRCODE = '42501';
    END IF;
    IF coalesce(NEW.status, 'pending') <> 'pending' OR coalesce(NEW.phase, 1) <> 1
       OR coalesce(NEW.photo_sent_a, false) OR coalesce(NEW.photo_sent_b, false)
       OR coalesce(NEW.extension_accepted_a, false) OR coalesce(NEW.extension_accepted_b, false)
       OR NEW.contact_sent_a IS NOT NULL OR NEW.contact_sent_b IS NOT NULL
       OR NEW.phase_expires_at IS NOT NULL OR NEW.deleted_at IS NOT NULL
       OR NEW.last_read_a IS NOT NULL OR NEW.last_read_b IS NOT NULL THEN
      RAISE EXCEPTION 'Een chat begint als uitnodiging' USING ERRCODE = '42501';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public."Like" l WHERE l.from_email = lower(NEW.user_a_email) AND l.to_email = lower(NEW.user_b_email))
       OR NOT EXISTS (SELECT 1 FROM public."Like" l WHERE l.from_email = lower(NEW.user_b_email) AND l.to_email = lower(NEW.user_a_email)) THEN
      RAISE EXCEPTION 'Chatten kan alleen met een supermatch' USING ERRCODE = '42501';
    END IF;
    RETURN NEW;
  END IF;

  -- UPDATE
  is_a := lower(OLD.user_a_email) = me;
  is_b := lower(OLD.user_b_email) = me;

  IF NEW.user_a_email IS DISTINCT FROM OLD.user_a_email OR NEW.user_b_email IS DISTINCT FROM OLD.user_b_email
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'Deelnemers van een chat liggen vast' USING ERRCODE = '42501';
  END IF;

  -- Beëindigen kan altijd (verwijderen, weigeren, melden, inactiviteit, blokkeren)
  IF NEW.status = 'deleted' THEN
    IF NEW.phase IS DISTINCT FROM OLD.phase OR NEW.photo_sent_a IS DISTINCT FROM OLD.photo_sent_a
       OR NEW.photo_sent_b IS DISTINCT FROM OLD.photo_sent_b THEN
      RAISE EXCEPTION 'Ongeldige wijziging bij beëindigen' USING ERRCODE = '42501';
    END IF;
    RETURN NEW;
  END IF;
  IF OLD.status = 'deleted' THEN
    RAISE EXCEPTION 'Deze chat is beëindigd' USING ERRCODE = '42501';
  END IF;

  -- Status
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF OLD.status = 'pending' AND NEW.status = 'active' THEN
      IF NOT is_b THEN RAISE EXCEPTION 'Alleen de uitgenodigde kan accepteren' USING ERRCODE = '42501'; END IF;
      IF coalesce(NEW.phase, 1) <> 1 OR NEW.phase_expires_at IS NULL OR NEW.phase_expires_at > max_expiry THEN
        RAISE EXCEPTION 'Ongeldige start van de chat' USING ERRCODE = '42501';
      END IF;
    ELSIF OLD.status = 'active' AND NEW.status = 'archived' THEN
      IF NEW.contact_sent_a IS NULL OR NEW.contact_sent_b IS NULL
         OR NEW.deleted_at IS NULL OR NEW.deleted_at > now() + interval '5 days 10 minutes' THEN
        RAISE EXCEPTION 'Archiveren kan pas na het uitwisselen van contact' USING ERRCODE = '42501';
      END IF;
    ELSE
      RAISE EXCEPTION 'Ongeldige statuswijziging' USING ERRCODE = '42501';
    END IF;
  ELSIF NEW.deleted_at IS DISTINCT FROM OLD.deleted_at OR NEW.chat_closed_at IS DISTINCT FROM OLD.chat_closed_at THEN
    RAISE EXCEPTION 'Ongeldige wijziging' USING ERRCODE = '42501';
  END IF;

  -- Fase: één stap verder, alleen als beide akkoord waren
  IF NEW.phase IS DISTINCT FROM OLD.phase THEN
    IF NOT (OLD.status = 'active' AND NEW.phase = OLD.phase + 1 AND NEW.phase <= 4
            AND coalesce(OLD.extension_accepted_a, false) AND coalesce(OLD.extension_accepted_b, false)
            AND NOT coalesce(NEW.extension_accepted_a, false) AND NOT coalesce(NEW.extension_accepted_b, false)) THEN
      RAISE EXCEPTION 'Ongeldige fasewijziging' USING ERRCODE = '42501';
    END IF;
    IF (NEW.phase = 4 AND NEW.phase_expires_at IS NOT NULL)
       OR (NEW.phase < 4 AND (NEW.phase_expires_at IS NULL OR NEW.phase_expires_at > max_expiry)) THEN
      RAISE EXCEPTION 'Ongeldige timer' USING ERRCODE = '42501';
    END IF;
  ELSE
    -- Akkoord zet je alleen voor jezelf
    IF (NOT is_a AND NEW.extension_accepted_a IS DISTINCT FROM OLD.extension_accepted_a)
       OR (NOT is_b AND NEW.extension_accepted_b IS DISTINCT FROM OLD.extension_accepted_b) THEN
      RAISE EXCEPTION 'Je kunt alleen je eigen akkoord geven' USING ERRCODE = '42501';
    END IF;
    -- Timer alleen bij het accepteren, of (bijna) gelijk als twee telefoons tegelijk verlengen
    IF NEW.phase_expires_at IS DISTINCT FROM OLD.phase_expires_at
       AND NOT (OLD.status = 'pending' AND NEW.status = 'active')
       AND NOT (NEW.phase_expires_at IS NOT NULL AND OLD.phase_expires_at IS NOT NULL
                AND NEW.phase_expires_at <= max_expiry
                AND abs(extract(epoch FROM (NEW.phase_expires_at - OLD.phase_expires_at))) <= 600) THEN
      RAISE EXCEPTION 'De timer kan niet worden aangepast' USING ERRCODE = '42501';
    END IF;
  END IF;

  IF NEW.extension_requested_at IS DISTINCT FROM OLD.extension_requested_at AND NEW.extension_requested_at IS NOT NULL THEN
    RAISE EXCEPTION 'Ongeldige wijziging' USING ERRCODE = '42501';
  END IF;

  -- Foto gestuurd: alleen voor jezelf, en alleen als er echt een foto van jou in de chat staat
  IF NEW.photo_sent_a IS DISTINCT FROM OLD.photo_sent_a THEN
    IF NOT is_a OR NOT coalesce(NEW.photo_sent_a, false) OR NOT EXISTS (
      SELECT 1 FROM public."ChatMessage" m WHERE m.room_id = OLD.id AND lower(m.sender_email) = me AND m.media_url IS NOT NULL) THEN
      RAISE EXCEPTION 'Ongeldige fotostatus' USING ERRCODE = '42501';
    END IF;
  END IF;
  IF NEW.photo_sent_b IS DISTINCT FROM OLD.photo_sent_b THEN
    IF NOT is_b OR NOT coalesce(NEW.photo_sent_b, false) OR NOT EXISTS (
      SELECT 1 FROM public."ChatMessage" m WHERE m.room_id = OLD.id AND lower(m.sender_email) = me AND m.media_url IS NOT NULL) THEN
      RAISE EXCEPTION 'Ongeldige fotostatus' USING ERRCODE = '42501';
    END IF;
  END IF;

  -- Contactgegevens en "gelezen tot": alleen je eigen kant
  IF (NOT is_a AND (NEW.contact_sent_a IS DISTINCT FROM OLD.contact_sent_a OR NEW.last_read_a IS DISTINCT FROM OLD.last_read_a))
     OR (NOT is_b AND (NEW.contact_sent_b IS DISTINCT FROM OLD.contact_sent_b OR NEW.last_read_b IS DISTINCT FROM OLD.last_read_b)) THEN
    RAISE EXCEPTION 'Je kunt alleen je eigen gegevens aanpassen' USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS guard_chat_room ON public."ChatRoom";
CREATE TRIGGER guard_chat_room BEFORE INSERT OR UPDATE ON public."ChatRoom"
  FOR EACH ROW EXECUTE FUNCTION public.guard_chat_room();
