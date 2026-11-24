-- ==============================================================================
-- Query om notificaties ouder dan 14 dagen te verwijderen uit Supabase
-- ==============================================================================

DELETE FROM "Notification"
WHERE created_date < NOW() - INTERVAL '14 days';
