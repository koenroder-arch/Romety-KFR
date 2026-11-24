-- Voer dit SQL-script uit in je Supabase Dashboard -> SQL Editor:

ALTER TABLE "UserProfile" ADD COLUMN IF NOT EXISTS country text DEFAULT 'Nederland';

-- Ververs de schema-cache van PostgREST:
NOTIFY pgrst, 'reload schema';
