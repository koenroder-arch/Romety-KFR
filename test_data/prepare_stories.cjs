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
  const email = 'koen.roder@gmail.com';
  console.log(`Setting up 5 stories for ${email} matches...`);

  try {
    // 1. Update/Ensure koen's profile
    console.log('1. Setting up koen.roder@gmail.com profile');
    const userProfiles = await request(`UserProfile?user_email=eq.${email}`);
    const koenProfileData = {
      user_email: email,
      display_name: 'Koen',
      age: 25,
      gender: 'male',
      height_cm: 180,
      relationship_status: 'single',
      looking_for: 'female',
      min_age_pref: 18,
      max_age_pref: 30,
      min_height_pref: 150,
      max_height_pref: 190,
      traits: ['funny', 'spontaneous'],
      interests: ['dancing', 'travel'],
      onboarding_complete: true,
      avatar: '🦁 Leeuw'
    };

    if (userProfiles.length === 0) {
      await request('UserProfile', 'POST', [koenProfileData]);
    } else {
      await request(`UserProfile?id=eq.${userProfiles[0].id}`, 'PATCH', koenProfileData);
    }

    // 2. Ensure active check-in for Koen at Club Poema
    console.log('2. Ensuring active check-in for Koen at Club Poema');
    // Delete existing active check-ins first
    await request(`VenueCheckIn?user_email=eq.${email}`, 'DELETE');
    await request('VenueCheckIn', 'POST', [{
      user_email: email,
      venue_id: 'Club Poema',
      venue_name: 'Club Poema',
      created_date: new Date().toISOString(),
      expires_at: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString() // expires in 8h
    }]);

    // 3. Define 5 test partners (female matches)
    const testPartners = [
      { email: 'lotte0@test.com', name: 'Lotte', avatar: '🐱 Kat', photo: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=800&auto=format&fit=crop&q=80' },
      { email: 'maud1@test.com', name: 'Maud', avatar: '🦊 Vos', photo: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=800&auto=format&fit=crop&q=80' },
      { email: 'emma2@test.com', name: 'Emma', avatar: '🐼 Panda', photo: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=800&auto=format&fit=crop&q=80' },
      { email: 'maud4@test.com', name: 'Maud B', avatar: '🐰 Konijn', photo: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800&auto=format&fit=crop&q=80' },
      { email: 'noa6@test.com', name: 'Noa', avatar: '🐨 Koala', photo: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=800&auto=format&fit=crop&q=80' }
    ];

    const storyImages = [
      'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800&auto=format&fit=crop&q=60',
      'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800&auto=format&fit=crop&q=60',
      'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=800&auto=format&fit=crop&q=60',
      'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&auto=format&fit=crop&q=60',
      'https://images.unsplash.com/photo-1486591978090-58e619d37fe7?w=800&auto=format&fit=crop&q=60'
    ];

    console.log('3. Updating partner profiles, adding check-ins and creating stories');
    for (let i = 0; i < testPartners.length; i++) {
      const p = testPartners[i];
      // A. Upsert UserProfile to ensure it matches Koen's criteria
      const existingP = await request(`UserProfile?user_email=eq.${p.email}`);
      const pProfileData = {
        user_email: p.email,
        display_name: p.name,
        age: 22,
        gender: 'female',
        height_cm: 170,
        relationship_status: 'single',
        looking_for: 'male',
        min_age_pref: 20,
        max_age_pref: 30,
        min_height_pref: 170,
        max_height_pref: 190,
        traits: ['funny'],
        interests: ['dancing'],
        onboarding_complete: true,
        avatar: p.avatar,
        photo_url: p.photo
      };

      if (existingP.length === 0) {
        await request('UserProfile', 'POST', [pProfileData]);
      } else {
        await request(`UserProfile?id=eq.${existingP[0].id}`, 'PATCH', pProfileData);
      }

      // B. Ensure mutual like so they are matches
      await request(`Like?or=(and(from_email.eq.${email},to_email.eq.${p.email}),and(from_email.eq.${p.email},to_email.eq.${email}))`, 'DELETE');
      await request('Like', 'POST', [
        { from_email: email, to_email: p.email, created_date: new Date().toISOString() },
        { from_email: p.email, to_email: email, created_date: new Date().toISOString() }
      ]);

      // C. Check partner into Club Poema
      await request(`VenueCheckIn?user_email=eq.${p.email}`, 'DELETE');
      await request('VenueCheckIn', 'POST', [{
        user_email: p.email,
        venue_id: 'Club Poema',
        venue_name: 'Club Poema',
        created_date: new Date().toISOString(),
        expires_at: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString()
      }]);

      // D. Create a story for the partner
      await request(`Story?user_email=eq.${p.email}`, 'DELETE');
      await request('Story', 'POST', [{
        user_email: p.email,
        user_name: p.name,
        user_photo_url: p.photo,
        media_url: storyImages[i],
        media_type: 'photo',
        venue_name: 'Club Poema',
        created_date: new Date().toISOString()
      }]);

      console.log(`   - Set up partner: ${p.name} (${p.email}) with 1 story`);
    }

    console.log('\n=== Success! 5 stories prepared for Koen\'s matches at Club Poema. ===');
  } catch (error) {
    console.error('Failed preparing stories:', error);
  }
}

run();
