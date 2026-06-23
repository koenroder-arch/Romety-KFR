const fs = require('fs');

const apikey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh5dHZhYWVoZm9sZ2V1bWtubHB6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwNTcxOTUsImV4cCI6MjA4ODYzMzE5NX0.NXv1gxGBLe6pEPtnG3-KlBCPpk-cE_4m_rG6a67aslI';

async function run() {
  // 1. Load users for looking up display_name, photo_url, age, traits
  const usersFile = fs.readFileSync('test_data/users.csv', 'utf8');
  const usersLines = usersFile.split('\n').filter(Boolean).slice(1);
  const usersMap = {};

  for (const line of usersLines) {
    const cols = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(m => m.replace(/^"|"$/g, '').replace(/""/g, '"'));
    if (cols.length < 13) continue;
    const email = cols[1];
    usersMap[email] = {
      display_name: cols[2],
      age: parseInt(cols[3]) || null,
      traits: cols[12] ? JSON.parse(cols[12]) : [],
      photo_url: cols[14] || null,
      avatar: cols[20] || null
    };
  }

  console.log('Loaded', Object.keys(usersMap).length, 'users for reference lookup');

  // Messages of exactly 15 characters to satisfy maxLength constraint in metadata
  const messagesList = [
    'Dansen in Poema',
    'Kom naar Poema!',
    'Gezellig Poema!',
    'Wie wil drankje',
    'Poema is top!!!',
    'Match in Poema?',
    'Samen dansen???',
    'Biertje Poema??',
    'Drankje doen?!!',
    'Club Poema!!!!!'
  ];

  // 2. Generate dating hints matching the exact SQL schema:
  // (id, created_date, from_email, from_name, from_photo_url, from_age, from_traits, venue_name, message, target_type, to_emails, heart_reactions)
  const userEmails = Object.keys(usersMap);
  const databaseObjects = [];
  const csvRows = [];

  for (let i = 0; i < 30; i++) {
    const from_email = userEmails[i % userEmails.length];
    const user = usersMap[from_email];
    const message = messagesList[i % messagesList.length];
    const id = `101ec0b5-f117-4098-8304-${String(100000000000 + i)}`;

    const obj = {
      id: id,
      created_date: new Date().toISOString(),
      from_email: from_email,
      from_name: user.display_name,
      from_photo_url: user.photo_url,
      from_avatar: user.avatar,
      from_age: user.age,
      from_traits: user.traits,
      venue_name: 'Club Poema',
      message: message,
      target_type: 'matches',
      to_emails: [],
      heart_reactions: []
    };
    databaseObjects.push(obj);

    // Format for CSV (exact order of columns in SQL schema)
    const csvRow = [
      obj.id,
      obj.created_date,
      obj.from_email,
      obj.from_name,
      obj.from_photo_url,
      obj.from_avatar,
      obj.from_age,
      JSON.stringify(obj.from_traits),
      obj.venue_name,
      obj.message,
      obj.target_type,
      JSON.stringify(obj.to_emails),
      JSON.stringify(obj.heart_reactions)
    ].map(val => {
      const s = String(val === null || val === undefined ? '' : val);
      if (s.includes(',') || s.includes('"') || s.includes('\n')) {
        return `"${s.replace(/"/g, '""')}"`;
      }
      return s;
    });
    csvRows.push(csvRow.join(','));
  }

  // Write updated CSV back to test_data/hints.csv
  const newHeader = 'id,created_date,from_email,from_name,from_photo_url,from_avatar,from_age,from_traits,venue_name,message,target_type,to_emails,heart_reactions';
  fs.writeFileSync('test_data/hints.csv', [newHeader, ...csvRows].join('\n') + '\n', 'utf8');
  console.log('Successfully updated local test_data/hints.csv to match exact SQL columns');

  // 3. Clear database table using Supabase REST API
  console.log('Clearing old Hint table entries...');
  const deleteRes = await fetch('https://hytvaaehfolgeumknlpz.supabase.co/rest/v1/Hint?from_email=neq.koen.roder@gmail.com', {
    method: 'DELETE',
    headers: { 
      apikey, 
      Authorization: 'Bearer ' + apikey 
    }
  });
  console.log('Delete status:', deleteRes.status);

  // 4. Upload databaseObjects to Supabase
  console.log('Uploading hints to Supabase...');
  const insertRes = await fetch('https://hytvaaehfolgeumknlpz.supabase.co/rest/v1/Hint', {
    method: 'POST',
    headers: { 
      apikey, 
      Authorization: 'Bearer ' + apikey, 
      'Content-Type': 'application/json', 
      'Prefer': 'return=minimal' 
    },
    body: JSON.stringify(databaseObjects)
  });
  
  console.log('Insert status:', insertRes.status);
  if (insertRes.status !== 201 && insertRes.status !== 200 && insertRes.status !== 204) {
    console.log('Insert error details:', await insertRes.text());
  } else {
    console.log('Successfully imported all dating hints to Supabase database matching the schema exactly!');
  }
}

run();
