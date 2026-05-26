/**
 * supabase.ts — Cliente Supabase para uso CLIENT-SIDE apenas.
 *
 * Para Route Handlers e Server Components, usar `createSupabaseServerClient`
 * de `@/lib/supabase-server` (suporta cookies e sessão real).
 */
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    '[G-Finance] NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY são obrigatórios. ' +
    'Configure o arquivo .env.local.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
