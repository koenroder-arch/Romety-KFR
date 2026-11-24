-- Voer dit SQL-script uit in je Supabase Dashboard -> SQL Editor:

-- 1. Maak de 'chat-uploads' bucket aan (als public bucket)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('chat-uploads', 'chat-uploads', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 2. Zorg voor uploadrechten (INSERT) naar 'chat-uploads'
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Allow public uploads to chat-uploads'
  ) THEN
    CREATE POLICY "Allow public uploads to chat-uploads" ON storage.objects 
    FOR INSERT TO public WITH CHECK (bucket_id = 'chat-uploads');
  END IF;
END $$;

-- 3. Zorg voor leesrechten (SELECT) uit 'chat-uploads'
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Allow public select from chat-uploads'
  ) THEN
    CREATE POLICY "Allow public select from chat-uploads" ON storage.objects 
    FOR SELECT TO public USING (bucket_id = 'chat-uploads');
  END IF;
END $$;
