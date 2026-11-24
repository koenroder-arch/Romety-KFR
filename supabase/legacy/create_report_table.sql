-- Create the Report table for profile reports (rapportages)
CREATE TABLE IF NOT EXISTS "Report" (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_date timestamptz DEFAULT now(),
  reporter_email text NOT NULL,
  reporter_name text,
  reported_email text NOT NULL,
  reported_name text,
  reason text NOT NULL,
  details text
);
