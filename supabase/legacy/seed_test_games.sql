-- ============================================================
-- Romety Games Seeder (Bypasses RLS)
-- Run this in your Supabase SQL Editor
-- ============================================================

-- Change this email to match your test account email if needed
DO $$
DECLARE
  target_email text := 'koen.roder@gmail.com';
  lotte_email text := 'lotte0@test.com';
  maud_email text := 'maud1@test.com';
  emma_email text := 'emma2@test.com';
  
  sess_a_id uuid;
  sess_b_id uuid;
  sess_c_id uuid;
BEGIN
  -- 1. Ensure target user profile exists
  IF NOT EXISTS (SELECT 1 FROM "UserProfile" WHERE user_email = target_email) THEN
    INSERT INTO "UserProfile" (
      id, user_email, display_name, age, gender, height_cm, relationship_status, 
      looking_for, min_age_pref, max_age_pref, min_height_pref, max_height_pref, 
      traits, interests, bio, is_premium, location_enabled, onboarding_complete, avatar
    ) VALUES (
      gen_random_uuid(),
      target_email,
      'Test Gebruiker',
      25,
      'male',
      180,
      'Relatie',
      'female',
      18,
      40,
      150,
      200,
      '["Loyal", "Spontaneous"]'::jsonb,
      '["Reizen", "Dancing"]'::jsonb,
      'Hoi, ik ben een test-gebruiker!',
      true,
      true,
      true,
      '🦁 Leeuw'
    );
  END IF;

  -- 2. Ensure test partners exist
  -- Lotte
  IF NOT EXISTS (SELECT 1 FROM "UserProfile" WHERE user_email = lotte_email) THEN
    INSERT INTO "UserProfile" (
      id, user_email, display_name, age, gender, height_cm, relationship_status, 
      looking_for, min_age_pref, max_age_pref, min_height_pref, max_height_pref, 
      traits, interests, photo_url, bio, is_premium, location_enabled, onboarding_complete, avatar
    ) VALUES (
      'a6dbd908-b686-4134-b833-50a8dd1ad933',
      lotte_email,
      'Lotte',
      21,
      'female',
      171,
      'Relatie',
      'male',
      18,
      40,
      150,
      200,
      '["Athletic", "Romantic", "Spontaneous"]'::jsonb,
      '["Reizen", "Dancing", "Nature"]'::jsonb,
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800&auto=format&fit=crop&q=60',
      'Hoi, ik ben Lotte en ik hou van een goed feestje!',
      false,
      true,
      true,
      '🐘 Olifant'
    );
  END IF;

  -- Maud
  IF NOT EXISTS (SELECT 1 FROM "UserProfile" WHERE user_email = maud_email) THEN
    INSERT INTO "UserProfile" (
      id, user_email, display_name, age, gender, height_cm, relationship_status, 
      looking_for, min_age_pref, max_age_pref, min_height_pref, max_height_pref, 
      traits, interests, photo_url, bio, is_premium, location_enabled, onboarding_complete, avatar
    ) VALUES (
      '94f62387-43c7-4851-a1c2-33e75d5565bb',
      maud_email,
      'Maud',
      24,
      'female',
      163,
      'Relatie',
      'male',
      18,
      40,
      150,
      200,
      '["Loyal", "Romantic", "Spontaneous"]'::jsonb,
      '["Reizen", "Travel", "Dancing"]'::jsonb,
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800&auto=format&fit=crop&q=60',
      'Hoi, ik ben Maud en ik hou van een goed feestje!',
      true,
      true,
      true,
      '🦘 Kangoeroe'
    );
  END IF;

  -- Emma
  IF NOT EXISTS (SELECT 1 FROM "UserProfile" WHERE user_email = emma_email) THEN
    INSERT INTO "UserProfile" (
      id, user_email, display_name, age, gender, height_cm, relationship_status, 
      looking_for, min_age_pref, max_age_pref, min_height_pref, max_height_pref, 
      traits, interests, bio, is_premium, location_enabled, onboarding_complete, avatar
    ) VALUES (
      '241bec4d-42c0-481a-b356-d305d005863e',
      emma_email,
      'Emma',
      21,
      'female',
      174,
      'Relatie',
      'male',
      18,
      40,
      150,
      200,
      '["Athletic", "Spontaneous", "Romantic"]'::jsonb,
      '["Reizen", "Art", "Photography"]'::jsonb,
      'Hoi, ik ben Emma en ik hou van een goed feestje!',
      true,
      true,
      true,
      '🐬 Dolfijn'
    );
  END IF;

  -- 3. Create mutual likes
  -- Delete old likes
  DELETE FROM "Like" 
  WHERE (from_email = target_email AND to_email IN (lotte_email, maud_email, emma_email))
     OR (from_email IN (lotte_email, maud_email, emma_email) AND to_email = target_email);

  -- Insert new likes
  INSERT INTO "Like" (id, from_email, to_email, created_date) VALUES
    (gen_random_uuid(), target_email, lotte_email, now()),
    (gen_random_uuid(), lotte_email, target_email, now()),
    (gen_random_uuid(), target_email, maud_email, now()),
    (gen_random_uuid(), maud_email, target_email, now()),
    (gen_random_uuid(), target_email, emma_email, now()),
    (gen_random_uuid(), emma_email, target_email, now());

  -- 4. Clean old game sessions
  DELETE FROM "GameSession"
  WHERE player1_email = target_email OR player2_email = target_email;

  -- 5. Seed game sessions
  -- --- Session A: Active Card Game with Lotte ---
  INSERT INTO "GameSession" (game_type, player1_email, player2_email, status, invited_at, last_activity)
  VALUES ('cards', target_email, lotte_email, 'active', now(), now())
  RETURNING id INTO sess_a_id;

  -- Rounds for Session A
  INSERT INTO "CardGameRound" (session_id, round_number, asker_email, question, question_category, answer, answered_at) VALUES
    (sess_a_id, 1, lotte_email, 'Ben je een honden- of kattenmens? 🐱🐶', 'oppervlakkig', 'yes', now()),
    (sess_a_id, 2, target_email, 'Heb je weleens een hele serie in één weekend gebingewatched? 📺', 'oppervlakkig', 'yes', now()),
    (sess_a_id, 3, lotte_email, 'Zing je weleens keihard mee in de auto als je alleen bent? 🚗🎵', 'oppervlakkig', null, null);

  -- --- Session B: Active Number Game with Maud ---
  INSERT INTO "GameSession" (game_type, player1_email, player2_email, status, invited_at, last_activity)
  VALUES ('number', maud_email, target_email, 'active', now(), now())
  RETURNING id INTO sess_b_id;

  -- States for Session B
  INSERT INTO "NumberGameState" (session_id, player_email, phone_number, guesses, gift_digits) VALUES
    (
      sess_b_id, 
      maud_email, 
      '0612345678', 
      '[{"digits": "0600000000", "result": [{"digit": "0", "result": "correct"}, {"digit": "6", "result": "correct"}, {"digit": "0", "result": "wrong"}, {"digit": "0", "result": "wrong"}, {"digit": "0", "result": "wrong"}, {"digit": "0", "result": "wrong"}, {"digit": "0", "result": "wrong"}, {"digit": "0", "result": "wrong"}, {"digit": "0", "result": "wrong"}, {"digit": "0", "result": "wrong"}], "created_at": "2026-06-16T14:30:00Z"}]'::jsonb, 
      '[{"index": 2, "digit": "1"}, {"index": 5, "digit": "5"}]'::jsonb
    ),
    (
      sess_b_id, 
      target_email, 
      '0698765432', 
      '[]'::jsonb, 
      '[{"index": 3, "digit": "7"}, {"index": 7, "digit": "4"}]'::jsonb
    );

  -- --- Session C: Pending Card Game Invite from Emma ---
  INSERT INTO "GameSession" (game_type, player1_email, player2_email, status, invited_at, last_activity)
  VALUES ('cards', emma_email, target_email, 'pending', now(), now());

END $$;
