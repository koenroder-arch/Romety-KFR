-- Voer dit SQL-script uit in je Supabase Dashboard -> SQL Editor:

ALTER TABLE "UserProfile" ADD COLUMN IF NOT EXISTS photos text[] DEFAULT '{}';

-- Zorg dat de schema-cache van PostgREST ververst wordt:
NOTIFY pgrst, 'reload schema';
