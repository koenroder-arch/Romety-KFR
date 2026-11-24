-- Create the Story table for user stories/verhalen
CREATE TABLE "Story" (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_date timestamptz DEFAULT now(),
  user_email text NOT NULL,
  user_name text,
  user_photo_url text,
  media_url text NOT NULL,
  media_type text NOT NULL, -- 'photo' or 'video'
  venue_name text NOT NULL
);
