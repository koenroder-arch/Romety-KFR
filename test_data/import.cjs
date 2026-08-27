const fs = require('fs');

const apikey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh5dHZhYWVoZm9sZ2V1bWtubHB6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwNTcxOTUsImV4cCI6MjA4ODYzMzE5NX0.NXv1gxGBLe6pEPtnG3-KlBCPpk-cE_4m_rG6a67aslI';

async function run() {
  // 1. Users import
  const file = fs.readFileSync('test_data/users.csv', 'utf8');
  const rows = file.split('\n').filter(Boolean).slice(1);
  
  const objects = rows.map(r => {
    // Regex to split by comma, ignoring commas inside quotes
    const cols = r.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(m => m.replace(/^"|"$/g, '').replace(/""/g, '"'));
    
    const obj = {
      id: cols[0],
      user_email: cols[1],
      display_name: cols[2],
      age: parseInt(cols[3]),
      gender: cols[4],
      height_cm: parseInt(cols[5]),
      relationship_status: cols[6],
      looking_for: cols[7],
      min_age_pref: parseInt(cols[8]),
      max_age_pref: parseInt(cols[9]),
      min_height_pref: parseInt(cols[10]),
      max_height_pref: parseInt(cols[11]),
      traits: cols[12] ? JSON.parse(cols[12]) : [],
      interests: cols[13] ? JSON.parse(cols[13]) : [],
      photo_url: cols[14],
      bio: cols[15],
      is_premium: cols[16] === 'true',
      location_enabled: cols[17] === 'true',
      onboarding_complete: cols[18] === 'true',
      created_date: cols[19] ? cols[19].trim() : undefined,
      avatar: cols[20] ? cols[20].trim() : null
    };
    return obj;
  });

  console.log('Parsed', objects.length, 'users');

  await fetch('https://hytvaaehfolgeumknlpz.supabase.co/rest/v1/UserProfile?user_email=neq.koen.roder@gmail.com', {
    method: 'DELETE',
    headers: { apikey, Authorization: 'Bearer ' + apikey }
  });
  console.log('Deleted old users');

  const res = await fetch('https://hytvaaehfolgeumknlpz.supabase.co/rest/v1/UserProfile', {
    method: 'POST',
    headers: { apikey, Authorization: 'Bearer ' + apikey, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
    body: JSON.stringify(objects)
  });
  
  console.log('Insert status:', res.status, await res.text());

  // 2. Destinations import
  const destFile = fs.readFileSync('test_data/destinations.csv', 'utf8');
  const destRows = destFile.split('\n').filter(Boolean).slice(1);
  const destinations = destRows.map(r => {
    const cols = r.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(m => m.replace(/^"|"$/g, '').replace(/""/g, '"'));
    return {
      id: cols[0],
      user_email: cols[1],
      venue_id: cols[2],
      venue_name: cols[3],
      expires_at: cols[4] || null,
      status: cols[5],
      created_date: cols[6] ? cols[6].trim() : undefined,
      venue_city: cols[7]
    };
  });
  console.log('Parsed', destinations.length, 'destinations');

  await fetch('https://hytvaaehfolgeumknlpz.supabase.co/rest/v1/UserDestination?user_email=neq.koen.roder@gmail.com', {
    method: 'DELETE',
    headers: { apikey, Authorization: 'Bearer ' + apikey }
  });
  console.log('Deleted old destinations');

  const destRes = await fetch('https://hytvaaehfolgeumknlpz.supabase.co/rest/v1/UserDestination', {
    method: 'POST',
    headers: { apikey, Authorization: 'Bearer ' + apikey, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
    body: JSON.stringify(destinations)
  });
  
  console.log('Insert destinations status:', destRes.status, await destRes.text());
}

run();
