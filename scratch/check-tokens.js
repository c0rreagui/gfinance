const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

let envUrl = '';
let envKey = '';
try {
  const envContent = fs.readFileSync('.env.local', 'utf-8');
  for (const line of envContent.split('\n')) {
    if (line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) {
      envUrl = line.split('=')[1].trim();
    }
    if (line.startsWith('NEXT_PUBLIC_SUPABASE_ANON_KEY=')) {
      envKey = line.split('=')[1].trim();
    }
  }
} catch (e) {
  console.error('Failed to parse .env.local', e);
  process.exit(1);
}

if (!envUrl || !envKey) {
  console.error('Error: NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY is missing.');
  process.exit(1);
}

const supabase = createClient(envUrl, envKey);

async function run() {
  console.log('Fetching profiles...');
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('id, google_access_token, google_refresh_token, google_token_expires_at');
  
  if (error) {
    console.error('Database query error:', error);
    return;
  }

  console.log(`Found ${profiles.length} profiles:`);
  for (const p of profiles) {
    console.log(`- Profile ID: ${p.id}`);
    console.log(`  Access Token: ${p.google_access_token ? 'Present (length ' + p.google_access_token.length + ')' : 'NULL'}`);
    console.log(`  Refresh Token: ${p.google_refresh_token ? 'Present (length ' + p.google_refresh_token.length + ')' : 'NULL'}`);
    console.log(`  Expires At: ${p.google_token_expires_at} (${p.google_token_expires_at ? new Date(p.google_token_expires_at).toLocaleString() : 'N/A'})`);
    if (p.google_token_expires_at) {
      const expiresAt = new Date(p.google_token_expires_at).getTime();
      const isExpired = Date.now() > expiresAt - 5 * 60 * 1000;
      console.log(`  Status: ${isExpired ? 'EXPIRED' : 'VALID'}`);
    }
  }
}

run();
