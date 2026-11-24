-- Recreate the Hint table to match the expected schema columns
DROP TABLE IF EXISTS "Hint";

CREATE TABLE "Hint" (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_date timestamptz DEFAULT now(),
  from_email text NOT NULL,
  from_name text,
  from_photo_url text,
  from_age integer,
  from_traits jsonb DEFAULT '[]'::jsonb,
  venue_name text NOT NULL,
  message text NOT NULL,
  target_type text NOT NULL,
  to_emails jsonb DEFAULT '[]'::jsonb,
  heart_reactions jsonb DEFAULT '[]'::jsonb
);
