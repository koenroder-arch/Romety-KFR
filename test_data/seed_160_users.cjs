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
    throw new Error(`Request to ${path} failed: ${res.status} - ${await res.text()}`);
  }
  return res.status === 204 ? null : await res.json();
}

const femaleNames = [
  'Lotte', 'Maud', 'Emma', 'Nina', 'Eline', 'Anna', 'Sanne', 'Evi', 'Lynn', 'Liv', 
  'Isa', 'Julia', 'Sophie', 'Femke', 'Noa', 'Eva', 'Lieke', 'Tess', 'Milou', 'Sara',
  'Fleur', 'Roos', 'Lara', 'Luna', 'Iris', 'Esmée', 'Yara', 'Zoë', 'Amber', 'Fenne',
  'Lisa', 'Juul', 'Noortje', 'Puck', 'Linde', 'Fem', 'Mila', 'Bo', 'Suze', 'Merel'
];

const maleNames = [
  'Lars', 'Casper', 'Noah', 'Ruben', 'Luuk', 'Floris', 'Thijs', 'Jesse', 'Bram', 'Sem', 
  'Niels', 'Stijn', 'Daan', 'Milan', 'Levi', 'Thomas', 'Sven', 'Julian', 'Mees', 'Max',
  'Gijs', 'Sam', 'Teun', 'Pim', 'Mats', 'Hugo', 'Timo', 'Boris', 'Guus', 'Jack'
];

const animalEmojis = ['🐱', '🦊', '🐼', '🐰', '🐨', '🐯', '🦁', '🐮', '🐵', '🦉', '🦋', '🦄', '🐰', '🐼', '🦊', '🐱'];

const venues = [
  { name: 'G-Spot', city: '57, Groest, Hilversum' },
  { name: 'Escape', city: '11, Rembrandtplein, Amsterdam' },
  { name: 'Heineken Experience', city: '78, Stadhouderskade, Amsterdam' },
  { name: 'De Jansbar', city: '22, Janskerkhof, Utrecht' },
  { name: 'Grand Café De Vrienden', city: '8, Nobelstraat, Utrecht' },
  { name: 'Café Flater', city: '140, Oudegracht, Utrecht' }
];

async function run() {
  console.log('=== Romety 160 Seeder ===');
  
  try {
    // 1. Delete all existing test accounts/data (*@test.com)
    console.log('1. Cleaning up existing test data...');
    
    // Delete likes involving test users
    console.log('   - Clearing likes...');
    await request('Like?or=(from_email.like.*@test.com,to_email.like.*@test.com)', 'DELETE');
    
    // Delete check-ins and destinations involving test users
    console.log('   - Clearing destinations & check-ins...');
    await request('UserDestination?user_email=like.*@test.com', 'DELETE');
    await request('VenueCheckIn?user_email=like.*@test.com', 'DELETE');

    // Delete game rounds and sessions for test users
    console.log('   - Clearing game sessions...');
    await request('GameSession?or=(player1_email.like.*@test.com,player2_email.like.*@test.com)', 'DELETE');

    // Delete test user profiles
    console.log('   - Clearing profiles...');
    await request('UserProfile?user_email=like.*@test.com', 'DELETE');

    // 2. Generate 160 profiles
    console.log('\n2. Generating 160 profiles...');
    const profiles = [];
    const destinations = [];
    const likes = [];

    const koenEmail = 'koen.roder@gmail.com';

    for (let i = 0; i < 160; i++) {
      const email = `user${i}@test.com`;
      const isMatch = i < 80;
      
      let gender, looking_for, relationship_status, age, height_cm, displayName, avatar;
      
      if (isMatch) {
        // Matches Koen perfectly
        gender = 'female';
        looking_for = 'male';
        relationship_status = 'single';
        age = 20 + (i % 8); // 20 to 27
        height_cm = 160 + (i % 25); // 160 to 184
        displayName = femaleNames[i % femaleNames.length] + ` ${i}`;
        avatar = `${animalEmojis[i % animalEmojis.length]} ${displayName}`;
      } else {
        // Does not match Koen
        const seed = i - 80;
        if (seed % 3 === 0) {
          // Wrong relationship status
          gender = 'female';
          looking_for = 'male';
          relationship_status = 'relatie';
          age = 22;
          height_cm = 170;
          displayName = femaleNames[seed % femaleNames.length] + ` ${i}`;
          avatar = `🔒 ${displayName}`;
        } else if (seed % 3 === 1) {
          // Wrong gender
          gender = 'male';
          looking_for = 'female';
          relationship_status = 'single';
          age = 25;
          height_cm = 180;
          displayName = maleNames[seed % maleNames.length] + ` ${i}`;
          avatar = `🙋‍♂️ ${displayName}`;
        } else {
          // Out of age range
          gender = 'female';
          looking_for = 'male';
          relationship_status = 'single';
          age = 45;
          height_cm = 170;
          displayName = femaleNames[seed % femaleNames.length] + ` ${i}`;
          avatar = `👩 ${displayName}`;
        }
      }

      profiles.push({
        user_email: email,
        display_name: displayName,
        age: age,
        gender: gender,
        height_cm: height_cm,
        relationship_status: relationship_status,
        looking_for: looking_for,
        min_age_pref: 18,
        max_age_pref: 40,
        min_height_pref: 150,
        max_height_pref: 200,
        traits: ['funny', 'spontaneous'],
        interests: ['dancing', 'travel'],
        onboarding_complete: true,
        location_enabled: true,
        avatar: avatar,
        bio: `Test profile number ${i}`
      });

      // Assign destination
      const venue = venues[i % venues.length];
      destinations.push({
        user_email: email,
        venue_id: venue.name,
        venue_name: venue.name,
        venue_city: venue.city,
        status: 'active',
        expires_at: '2026-12-31T23:59:59.000Z'
      });

      // Set up likes: 30 users (user0 to user29) like Koen, first 4 are mutual (supermatches)
      if (isMatch && i < 30) {
        likes.push({ from_email: email, to_email: koenEmail, created_date: new Date().toISOString() });
        if (i < 4) {
          likes.push({ from_email: koenEmail, to_email: email, created_date: new Date().toISOString() });
        }
      }
    }

    // Insert Profiles in batches of 50
    console.log('3. Inserting 160 user profiles to Supabase...');
    for (let j = 0; j < profiles.length; j += 50) {
      const batch = profiles.slice(j, j + 50);
      await request('UserProfile', 'POST', batch);
    }
    console.log('   - Profiles inserted.');

    // Insert Destinations in batches of 50
    console.log('4. Inserting 160 active destinations to Supabase...');
    for (let j = 0; j < destinations.length; j += 50) {
      const batch = destinations.slice(j, j + 50);
      await request('UserDestination', 'POST', batch);
    }
    console.log('   - Destinations inserted.');

    // Insert Likes
    console.log('5. Inserting 4 mutual likes (8 records)...');
    // Clean old likes for Koen first to prevent duplicate likes
    await request(`Like?or=(from_email.eq.${koenEmail},to_email.eq.${koenEmail})`, 'DELETE');
    await request('Like', 'POST', likes);
    console.log('   - Likes inserted.');

    // 6. Check Koen into G-Spot (to start with)
    console.log('6. Checking Koen into G-Spot...');
    await request(`UserDestination?user_email=eq.${koenEmail}`, 'DELETE');
    await request('UserDestination', 'POST', [{
      user_email: koenEmail,
      venue_id: 'G-Spot',
      venue_name: 'G-Spot',
      venue_city: '57, Groest, Hilversum',
      status: 'active',
      expires_at: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString()
    }]);
    
    console.log('\n=== Success! 160 profiles created: 80 matches, 4 supermatches. ===');
  } catch (error) {
    console.error('Failed to seed 160 users:', error);
  }
}

run();
