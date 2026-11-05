-- Chat: per deelnemer bijhouden tot wanneer hij/zij de chat heeft gelezen (werkt over apparaten heen),
-- en Realtime aanzetten zodat nieuwe berichten en meldingen direct binnenkomen.
-- Realtime respecteert RLS: je ontvangt alleen berichten uit je eigen chats en meldingen aan jou.

ALTER TABLE public."ChatRoom"
  ADD COLUMN IF NOT EXISTS last_read_a timestamptz,
  ADD COLUMN IF NOT EXISTS last_read_b timestamptz;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'ChatMessage') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public."ChatMessage";
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'Notification') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public."Notification";
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'ChatRoom') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public."ChatRoom";
  END IF;
END $$;
