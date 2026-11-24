-- ==============================================================================
-- Query om alle reeds gelezen notificaties te verwijderen uit Supabase
-- ==============================================================================

DELETE FROM "Notification"
WHERE is_read = true;

-- Optioneel: als de tabelnaam in kleine letters is:
-- DELETE FROM notifications WHERE is_read = true;
