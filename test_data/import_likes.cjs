const fs = require('fs');

const apikey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh5dHZhYWVoZm9sZ2V1bWtubHB6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwNTcxOTUsImV4cCI6MjA4ODYzMzE5NX0.NXv1gxGBLe6pEPtnG3-KlBCPpk-cE_4m_rG6a67aslI';

async function run() {
  const file = fs.readFileSync('test_data/likes.csv', 'utf8');
  const lines = file.split('\n').filter(Boolean);
  const header = lines[0];
  const existingLikes = lines.slice(1).map(line => {
    const cols = line.split(',');
    return {
      id: cols[0],
      from_email: cols[1],
      to_email: cols[2],
      created_date: cols[3]
    };
  });

  // Filter out any existing likes associated with koen.roder@gmail.com first
  const cleanLikes = existingLikes.filter(l => 
    l.from_email !== 'koen.roder@gmail.com' && l.to_email !== 'koen.roder@gmail.com'
  );

  const targetUsers = [
    'lotte0@test.com',
    'maud1@test.com',
    'emma2@test.com',
    'nina3@test.com',
    'maud4@test.com',
    'nina5@test.com',
    'noa6@test.com',
    'anna7@test.com'
  ];

  const newLikes = [];
  const nowStr = new Date().toISOString();

  // Create mutual likes
  targetUsers.forEach((email, index) => {
    // Koen likes them
    newLikes.push({
      id: `a1111111-2222-3333-4444-${String(100000000000 + index)}`,
      from_email: 'koen.roder@gmail.com',
      to_email: email,
      created_date: nowStr
    });

    // They like Koen
    newLikes.push({
      id: `b1111111-2222-3333-4444-${String(100000000000 + index)}`,
      from_email: email,
      to_email: 'koen.roder@gmail.com',
      created_date: nowStr
    });
  });

  const allLikes = [...cleanLikes, ...newLikes];

  // Write back to likes.csv
  const csvRows = [header];
  allLikes.forEach(l => {
    csvRows.push(`${l.id},${l.from_email},${l.to_email},${l.created_date}`);
  });

  fs.writeFileSync('test_data/likes.csv', csvRows.join('\n') + '\n', 'utf8');
  console.log('Successfully updated test_data/likes.csv with 16 mutual likes!');

  // Clear existing Likes in Supabase
  console.log('Clearing old Like entries from Supabase...');
  const deleteRes = await fetch('https://hytvaaehfolgeumknlpz.supabase.co/rest/v1/Like?id=not.is.null', {
    method: 'DELETE',
    headers: {
      apikey,
      Authorization: 'Bearer ' + apikey
    }
  });
  console.log('Delete status:', deleteRes.status);

  // Upload all to Supabase
  console.log('Uploading all likes to Supabase...');
  const insertRes = await fetch('https://hytvaaehfolgeumknlpz.supabase.co/rest/v1/Like', {
    method: 'POST',
    headers: {
      apikey,
      Authorization: 'Bearer ' + apikey,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal'
    },
    body: JSON.stringify(allLikes)
  });

  console.log('Insert status:', insertRes.status);
  if (insertRes.status !== 201 && insertRes.status !== 200 && insertRes.status !== 204) {
    console.log('Insert error details:', await insertRes.text());
  } else {
    console.log('Successfully imported all likes to Supabase!');
  }
}

run();
