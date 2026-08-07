const fs = require('fs');
const path = require('path');

// Load env variables from .env.local
const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    const key = match[1];
    let value = match[2] || '';
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
});

const supabaseUrl = env['NEXT_PUBLIC_SUPABASE_URL'];
const anonKey = env['NEXT_PUBLIC_SUPABASE_ANON_KEY'];
const url = `${supabaseUrl}/functions/v1/process-transcriptions`;

console.log('Testing Edge Function Endpoint:', url);

async function run() {
  try {
    // Attempt 1: Call without any headers
    console.log('\n--- Attempt 1: No headers ---');
    let res = await fetch(url, {
      method: 'POST',
      body: JSON.stringify({ action: 'generate', transcriptionId: 'dummy-id' })
    });
    console.log('Status:', res.status, res.statusText);
    console.log('Headers:', Object.fromEntries(res.headers.entries()));
    console.log('Body:', await res.text());

    // Attempt 2: Call with apikey header (anon key)
    console.log('\n--- Attempt 2: With apikey header (anon key) ---');
    res = await fetch(url, {
      method: 'POST',
      headers: {
        'apikey': anonKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ action: 'generate', transcriptionId: 'dummy-id' })
    });
    console.log('Status:', res.status, res.statusText);
    console.log('Headers:', Object.fromEntries(res.headers.entries()));
    console.log('Body:', await res.text());
  } catch (e) {
    console.error('Fetch error:', e.message);
  }
}

run();
