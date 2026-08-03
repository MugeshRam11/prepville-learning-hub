import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://mvmciqmszakciijfdyos.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im12bWNpcW1zemFrY2lpamZkeW9zIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTcyNTM2NywiZXhwIjoyMDY1MzAxMzY3fQ._KBL9EHOdsbSZ7iE6-QcrKd8m7Xn7A0J7FFwTp2yuJ4';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function testUpload() {
  console.log('Testing upload...');
  const { data, error } = await supabase.storage
    .from('study-materials')
    .upload('test/dummy.txt', 'Hello World', {
      upsert: true
    });
    
  if (error) {
    console.error('Upload Error:', error.message, error);
  } else {
    console.log('Upload Success:', data);
  }
}

testUpload();
