import { createClient } from '@supabase/supabase-js';

// Fallback to placeholder strings during build time to prevent Next.js static prerendering crash
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://jdliepgseoyoxfygmdet.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpkbGllcGdzZW95b3hmeWdtZGV0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk3Mzg0MzEsImV4cCI6MjA5NTMxNDQzMX0._TdK_iukApQ5zFbvzCROPWQnLaxMTxuxpvyOA4eStzg';

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  console.warn('Warning: NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY is missing from environment. Using build fallback.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
