-- Run this SQL script in your Supabase Dashboard SQL Editor:
ALTER TABLE "UserDestination" ADD COLUMN IF NOT EXISTS venue_city text;
ALTER TABLE "VenueCheckIn" ADD COLUMN IF NOT EXISTS venue_city text;
ALTER TABLE "SearchHistory" ADD COLUMN IF NOT EXISTS sublabel text;
