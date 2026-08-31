import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://hytvaaehfolgeumknlpz.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh5dHZhYWVoZm9sZ2V1bWtubHB6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwNTcxOTUsImV4cCI6MjA4ODYzMzE5NX0.NXv1gxGBLe6pEPtnG3-KlBCPpk-cE_4m_rG6a67aslI';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function main() {
  const photo1 = "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=800&auto=format&fit=crop&q=80";
  const photo2 = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800&auto=format&fit=crop&q=80";

  const { data: updated, error } = await supabase
    .from('UserProfile')
    .update({
      photos: [photo1, photo2],
      photo_url: photo1
    })
    .eq('user_email', 'sanne25@test.com')
    .select();

  if (error) {
    console.error("Error:", error);
  } else {
    console.log("Updated Sanne with 2 distinct photos:", updated);
  }
}

main();
