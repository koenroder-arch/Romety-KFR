-- Terugdraaien van supabase/migrations/20261124_07_indexes_scale.sql
DROP INDEX IF EXISTS public.like_from_to_unique;
DROP INDEX IF EXISTS public.like_to_email_idx;
DROP INDEX IF EXISTS public.notification_to_created_idx;
DROP INDEX IF EXISTS public.userdestination_user_idx;
DROP INDEX IF EXISTS public.userdestination_active_idx;
DROP INDEX IF EXISTS public.venuecheckin_user_idx;
DROP INDEX IF EXISTS public.venuecheckin_expires_idx;
DROP INDEX IF EXISTS public.userprofile_country_created_idx;
DROP INDEX IF EXISTS public.hint_created_idx;
DROP INDEX IF EXISTS public.hint_from_idx;
DROP INDEX IF EXISTS public.story_created_idx;
DROP INDEX IF EXISTS public.story_user_idx;
DROP INDEX IF EXISTS public.searchhistory_user_created_idx;
DROP INDEX IF EXISTS public.report_reporter_idx;
DROP INDEX IF EXISTS public.cardgameround_session_idx;
