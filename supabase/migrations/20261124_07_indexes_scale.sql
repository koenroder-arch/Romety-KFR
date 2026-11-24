-- Fase 3 schaalbaarheid: indexen voor de zoekopdrachten die de app het vaakst doet.
-- Verandert geen gegevens en geen regels; alleen sneller zoeken.
-- Plus één regel: dezelfde like (van A naar B) kan maar één keer bestaan.
-- Terugdraaien: supabase/rollback/2026-11-24_indexes_scale_rollback.sql

-- Likes: "wie like ik" / "wie liket mij" / "heb ik deze persoon al geliked"
CREATE UNIQUE INDEX IF NOT EXISTS like_from_to_unique ON public."Like" (from_email, to_email);
CREATE INDEX IF NOT EXISTS like_to_email_idx ON public."Like" (to_email);

-- Meldingen: per ontvanger, nieuwste eerst
CREATE INDEX IF NOT EXISTS notification_to_created_idx ON public."Notification" (to_email, created_date DESC);

-- Locaties: eigen rijen en de actieve van iedereen
CREATE INDEX IF NOT EXISTS userdestination_user_idx ON public."UserDestination" (user_email, created_date DESC);
CREATE INDEX IF NOT EXISTS userdestination_active_idx ON public."UserDestination" (expires_at) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS venuecheckin_user_idx ON public."VenueCheckIn" (user_email);
CREATE INDEX IF NOT EXISTS venuecheckin_expires_idx ON public."VenueCheckIn" (expires_at);

-- Profielen per land, nieuwste eerst
CREATE INDEX IF NOT EXISTS userprofile_country_created_idx ON public."UserProfile" (country, created_date DESC);

-- Hints en verhalen: nieuwste eerst en per afzender
CREATE INDEX IF NOT EXISTS hint_created_idx ON public."Hint" (created_date DESC);
CREATE INDEX IF NOT EXISTS hint_from_idx ON public."Hint" (from_email);
CREATE INDEX IF NOT EXISTS story_created_idx ON public."Story" (created_date DESC);
CREATE INDEX IF NOT EXISTS story_user_idx ON public."Story" (user_email);

-- Zoekgeschiedenis per gebruiker
CREATE INDEX IF NOT EXISTS searchhistory_user_created_idx ON public."SearchHistory" (user_email, created_date DESC);

-- Eigen meldingen (rapportages) en spelrondes (advies van Supabase)
CREATE INDEX IF NOT EXISTS report_reporter_idx ON public."Report" (reporter_email);
CREATE INDEX IF NOT EXISTS cardgameround_session_idx ON public."CardGameRound" (session_id);
