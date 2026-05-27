/**
 * supabase.ts — Cliente Supabase para uso CLIENT-SIDE apenas.
 *
 * Para Route Handlers e Server Components, usar `createSupabaseServerClient`
 * de `@/lib/supabase-server` (suporta cookies e sessão real).
 */
import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder-project.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key';

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  console.warn(
    '[G-Finance] Alerta: NEXT_PUBLIC_SUPABASE_URL e/ou NEXT_PUBLIC_SUPABASE_ANON_KEY não estão configurados. ' +
    'Usando placeholders temporários para compilação estática.'
  );
}

export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);
