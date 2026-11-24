-- ============================================================
-- Romety Games Tables Migration
-- Run this in your Supabase SQL Editor
-- ============================================================

-- 1. GameSession: tracks a game between two supermatches
CREATE TABLE IF NOT EXISTS "GameSession" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_date timestamptz DEFAULT now(),
  game_type text NOT NULL CHECK (game_type IN ('cards', 'number')),
  player1_email text NOT NULL,
  player2_email text NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'finished', 'declined')),
  invited_at timestamptz DEFAULT now(),
  finished_at timestamptz,
  winner_email text,
  last_activity timestamptz DEFAULT now()
);

-- RLS for GameSession
ALTER TABLE "GameSession" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "GameSession: players can read their own sessions"
  ON "GameSession" FOR SELECT
  USING (auth.email() IN (player1_email, player2_email));
CREATE POLICY "GameSession: player1 can create"
  ON "GameSession" FOR INSERT
  WITH CHECK (auth.email() = player1_email);
CREATE POLICY "GameSession: players can update"
  ON "GameSession" FOR UPDATE
  USING (auth.email() IN (player1_email, player2_email));

-- 2. CardGameRound: each round of the card game
CREATE TABLE IF NOT EXISTS "CardGameRound" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_date timestamptz DEFAULT now(),
  session_id uuid NOT NULL REFERENCES "GameSession"(id) ON DELETE CASCADE,
  round_number int NOT NULL CHECK (round_number BETWEEN 1 AND 6),
  asker_email text NOT NULL,
  question text NOT NULL,
  question_category text,
  answer text CHECK (answer IN ('yes', 'no', NULL)),
  answered_at timestamptz,
  social_type text CHECK (social_type IN ('instagram', 'snapchat', 'phone', NULL)),
  social_handle text
);

-- RLS for CardGameRound
ALTER TABLE "CardGameRound" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "CardGameRound: session players can read"
  ON "CardGameRound" FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM "GameSession" gs
      WHERE gs.id = session_id
      AND auth.email() IN (gs.player1_email, gs.player2_email)
    )
  );
CREATE POLICY "CardGameRound: asker can insert"
  ON "CardGameRound" FOR INSERT
  WITH CHECK (auth.email() = asker_email);
CREATE POLICY "CardGameRound: responder can update"
  ON "CardGameRound" FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM "GameSession" gs
      WHERE gs.id = session_id
      AND auth.email() IN (gs.player1_email, gs.player2_email)
    )
  );

-- 3. NumberGameState: each player's secret number and guesses
CREATE TABLE IF NOT EXISTS "NumberGameState" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_date timestamptz DEFAULT now(),
  session_id uuid NOT NULL REFERENCES "GameSession"(id) ON DELETE CASCADE,
  player_email text NOT NULL,
  phone_number text NOT NULL,
  gift_digits jsonb DEFAULT '[]'::jsonb,
  guesses jsonb DEFAULT '[]'::jsonb,
  UNIQUE(session_id, player_email)
);

-- RLS for NumberGameState
ALTER TABLE "NumberGameState" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "NumberGameState: session players can read"
  ON "NumberGameState" FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM "GameSession" gs
      WHERE gs.id = session_id
      AND auth.email() IN (gs.player1_email, gs.player2_email)
    )
  );
CREATE POLICY "NumberGameState: own player can insert"
  ON "NumberGameState" FOR INSERT
  WITH CHECK (auth.email() = player_email);
CREATE POLICY "NumberGameState: own player can update"
  ON "NumberGameState" FOR UPDATE
  USING (auth.email() = player_email);
