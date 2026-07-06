const apikey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh5dHZhYWVoZm9sZ2V1bWtubHB6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwNTcxOTUsImV4cCI6MjA4ODYzMzE5NX0.NXv1gxGBLe6pEPtnG3-KlBCPpk-cE_4m_rG6a67aslI';
const supabaseUrl = 'https://hytvaaehfolgeumknlpz.supabase.co/rest/v1';

async function run() {
  try {
    const resL = await fetch(`${supabaseUrl}/Like`, {
      headers: { apikey, Authorization: 'Bearer ' + apikey }
    });
    const likes = await resL.json();

    const studentEmails = ['koen.roder@student.hu.nl', 'Koen.roder@student.hu.nl', 'koen.roder@gmail.com'];
    
    studentEmails.forEach(email => {
      const sent = likes.filter(l => l.from_email?.toLowerCase() === email.toLowerCase());
      const rec = likes.filter(l => l.to_email?.toLowerCase() === email.toLowerCase());
      console.log(`Email: ${email} | Sent: ${sent.length} | Received: ${rec.length}`);
    });
    
    // Find mutual likes for student hu nl
    const allStudentLikes = likes.filter(l => 
      l.from_email?.toLowerCase() === 'koen.roder@student.hu.nl' ||
      l.to_email?.toLowerCase() === 'koen.roder@student.hu.nl'
    );
    console.log('Likes matching student case-insensitively:', allStudentLikes);

  } catch (e) {
    console.error(e);
  }
}

run();
