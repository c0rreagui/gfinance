const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env.local');
let supabaseUrl = '';
let supabaseAnonKey = '';

if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8');
  const lines = content.split('\n');
  for (const line of lines) {
    if (line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) {
      supabaseUrl = line.split('=')[1].trim();
    }
    if (line.startsWith('NEXT_PUBLIC_SUPABASE_ANON_KEY=')) {
      supabaseAnonKey = line.split('=')[1].trim();
    }
  }
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  const { data: { session } } = await supabase.auth.getSession();
  // Since we run in Node, we don't have a session.
  // But let's see if we can query public tables or if we can fetch all calendar events without auth (using service key? No, we don't have it).
  // Wait! Let's check if the calendar sync route can be called or if we can read the profiles/calendar_events for the user.
  // Wait! We can find the user's ID by checking who owns the credit cards or tasks since we have command access to run a node script.
  // Wait, let's check what profiles are in the database.
  // Let's run a query to get all calendar events.
  const { data: events, error } = await supabase
    .from('calendar_events')
    .select('*')
    .limit(20);
  
  if (error) {
    console.error('Error fetching calendar events:', error);
  } else {
    console.log('Calendar Events in Database (total fetched: ' + events.length + '):');
    events.forEach(e => {
      console.log({
        id: e.id,
        user_id: e.user_id,
        title: e.title,
        start_time: e.start_time,
        category: e.category,
        google_event_id: e.google_event_id
      });
    });
  }
}

run();
