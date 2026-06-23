const fs = require('fs');

const apikey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh5dHZhYWVoZm9sZ2V1bWtubHB6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwNTcxOTUsImV4cCI6MjA4ODYzMzE5NX0.NXv1gxGBLe6pEPtnG3-KlBCPpk-cE_4m_rG6a67aslI';
const supabaseUrl = 'https://hytvaaehfolgeumknlpz.supabase.co/rest/v1';

async function request(path, method = 'GET', body = null) {
  const headers = {
    apikey,
    Authorization: 'Bearer ' + apikey,
    'Content-Type': 'application/json',
  };
  if (body) {
    headers['Prefer'] = 'return=representation';
  }
  const res = await fetch(`${supabaseUrl}/${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : null
  });
  if (!res.ok) {
    throw new Error(`Request to ${path} failed with status ${res.status}: ${await res.text()}`);
  }
  return res.status === 204 ? null : await res.json();
}

async function run() {
  // Get target email from arguments or default to koen.roder@gmail.com
  const email = process.argv[2] || 'koen.roder@gmail.com';
  console.log(`=== Romety Games Seeder ===`);
  console.log(`Target User Email: ${email}\n`);

  try {
    // 1. Ensure target user has a profile, if not, create a basic one
    console.log('1. Checking for target user profile...');
    const userProfiles = await request(`UserProfile?user_email=eq.${email}`);
    if (userProfiles.length === 0) {
      console.log(`No profile found for ${email}. Creating one...`);
      await request('UserProfile', 'POST', [{
        user_email: email,
        display_name: 'Test Gebruiker',
        age: 25,
        gender: 'male',
        height_cm: 180,
        looking_for: 'female',
        onboarding_complete: true,
        avatar: '🦁 Leeuw',
        interests: ['Reizen', 'Dancing'],
        traits: ['Loyal', 'Spontaneous']
      }]);
      console.log('Profile created.');
    } else {
      console.log('Profile exists.');
    }

    // 2. Ensure test partners exist (Lotte, Maud, Emma)
    console.log('\n2. Ensuring test partners exist...');
    const partnerEmails = ['lotte0@test.com', 'maud1@test.com', 'emma2@test.com'];
    const usersFile = fs.readFileSync('test_data/users.csv', 'utf8');
    const usersLines = usersFile.split('\n').filter(Boolean).slice(1);
    const usersMap = {};

    for (const line of usersLines) {
      const cols = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(m => m.replace(/^"|"$/g, '').replace(/""/g, '"'));
      if (cols.length < 13) continue;
      const uEmail = cols[1];
      if (partnerEmails.includes(uEmail)) {
        usersMap[uEmail] = {
          user_email: uEmail,
          display_name: cols[2],
          age: parseInt(cols[3]) || 20,
          gender: cols[4],
          height_cm: parseInt(cols[5]) || 170,
          relationship_status: cols[6],
          looking_for: cols[7],
          min_age_pref: parseInt(cols[8]) || 18,
          max_age_pref: parseInt(cols[9]) || 40,
          traits: cols[12] ? JSON.parse(cols[12]) : [],
          interests: cols[13] ? JSON.parse(cols[13]) : [],
          photo_url: cols[14] || null,
          bio: cols[15] || '',
          is_premium: cols[16] === 'true',
          location_enabled: true,
          onboarding_complete: true,
          avatar: cols[20] ? cols[20].trim() : null
        };
      }
    }

    for (const pEmail of partnerEmails) {
      const existing = await request(`UserProfile?user_email=eq.${pEmail}`);
      if (existing.length === 0) {
        console.log(`Creating test partner profile for ${pEmail}...`);
        await request('UserProfile', 'POST', [usersMap[pEmail]]);
      } else {
        console.log(`Partner ${pEmail} already exists.`);
      }
    }

    // 3. Setup mutual likes between target user and partners
    console.log('\n3. Creating mutual likes...');
    // Delete any existing likes first to prevent unique constraint issues
    await request(`Like?or=(and(from_email.eq.${email},to_email.in.(${partnerEmails.join(',')})),and(from_email.in.(${partnerEmails.join(',')}),to_email.eq.${email}))`, 'DELETE');
    
    const likesToInsert = [];
    partnerEmails.forEach((pEmail, idx) => {
      likesToInsert.push({
        from_email: email,
        to_email: pEmail,
        created_date: new Date().toISOString()
      });
      likesToInsert.push({
        from_email: pEmail,
        to_email: email,
        created_date: new Date().toISOString()
      });
    });
    await request('Like', 'POST', likesToInsert);
    console.log('Mutual likes created successfully.');

    // 4. Clear old game sessions to clean test environment
    console.log('\n4. Cleaning old game sessions...');
    await request(`GameSession?or=(player1_email.eq.${email},player2_email.eq.${email})`, 'DELETE');
    console.log('Cleaned old sessions.');

    // 5. Seed game sessions
    console.log('\n5. Seeding new game sessions...');

    // --- Session A: Active Card Game with Lotte (player2) ---
    console.log('Seeding active Card Game with Lotte...');
    const sessionA = await request('GameSession', 'POST', [{
      game_type: 'cards',
      player1_email: email,
      player2_email: 'lotte0@test.com',
      status: 'active',
      invited_at: new Date().toISOString(),
      last_activity: new Date().toISOString()
    }]);
    const sessAId = sessionA[0].id;

    // Rounds for Session A
    await request('CardGameRound', 'POST', [
      {
        session_id: sessAId,
        round_number: 1,
        asker_email: 'lotte0@test.com',
        question: 'Ben je een honden- of kattenmens? 🐱🐶',
        question_category: 'oppervlakkig',
        answer: 'yes',
        answered_at: new Date().toISOString()
      },
      {
        session_id: sessAId,
        round_number: 2,
        asker_email: email,
        question: 'Heb je weleens een hele serie in één weekend gebingewatched? 📺',
        question_category: 'oppervlakkig',
        answer: 'yes',
        answered_at: new Date().toISOString()
      },
      {
        session_id: sessAId,
        round_number: 3,
        asker_email: 'lotte0@test.com',
        question: 'Zing je weleens keihard mee in de auto als je alleen bent? 🚗🎵',
        question_category: 'oppervlakkig',
        // Not answered yet! This means it's my turn to answer!
        answer: null,
        answered_at: null
      }
    ]);
    console.log('Card Game session set up successfully.');

    // --- Session B: Active Number Game with Maud (player1) ---
    console.log('Seeding active Number Game with Maud...');
    const sessionB = await request('GameSession', 'POST', [{
      game_type: 'number',
      player1_email: 'maud1@test.com',
      player2_email: email,
      status: 'active',
      invited_at: new Date().toISOString(),
      last_activity: new Date().toISOString()
    }]);
    const sessBId = sessionB[0].id;

    // States for Session B (guessing secret numbers)
    await request('NumberGameState', 'POST', [
      {
        session_id: sessBId,
        player_email: 'maud1@test.com',
        phone_number: '0612345678', // Maud's secret number
        guesses: [
          scoreGuess('0600000000', '0612345678') // Maud guessed first
        ],
        gift_digits: [
          { index: 2, digit: '1' },
          { index: 5, digit: '5' }
        ]
      },
      {
        session_id: sessBId,
        player_email: email,
        phone_number: '0698765432', // Target user's secret number
        guesses: [],
        gift_digits: [
          { index: 3, digit: '7' },
          { index: 7, digit: '4' }
        ]
      }
    ]);
    console.log('Number Game session set up successfully.');

    // --- Session C: Pending Card Game Invite with Emma ---
    console.log('Seeding pending Card Game invite with Emma...');
    await request('GameSession', 'POST', [{
      game_type: 'cards',
      player1_email: 'emma2@test.com', // Emma invited target user
      player2_email: email,
      status: 'pending',
      invited_at: new Date().toISOString(),
      last_activity: new Date().toISOString()
    }]);
    console.log('Pending Game session set up successfully.');

    console.log('\n=== Seeding Completed Successfully! ===');
    console.log(`Open Romety in your browser and log in with:`);
    console.log(`Email: ${email}`);
    console.log(`Username: ${userProfiles[0]?.display_name || 'Test Gebruiker'}`);
    console.log(`\nGo to the Home page to find:`);
    console.log(`1. The 'SUPER' match count showing Lotte, Maud, and Emma.`);
    console.log(`2. The 'SPELLEN' badge showing active games. Click it to view invites, accept Emma's invite, and play with Lotte or Maud!`);
  } catch (error) {
    console.error('Seeding failed:', error);
  }
}

// Helper to score a guess for seeding data
function scoreGuess(guess, secret) {
  const scored = guess.split('').map((ch, i) => {
    if (ch === secret[i]) return { digit: ch, result: 'correct' };
    const diff = Math.abs(parseInt(ch, 10) - parseInt(secret[i], 10));
    if (!isNaN(diff) && diff <= 3) return { digit: ch, result: 'close' };
    return { digit: ch, result: 'wrong' };
  });
  return { digits: guess, result: scored, created_at: new Date().toISOString() };
}

run();
