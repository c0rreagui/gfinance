/**
 * supabase-server.ts
 * Factory para cliente Supabase server-side com suporte a cookies.
 * Usar em Route Handlers e Server Components — NUNCA em Client Components.
 *
 * Padrão: @supabase/ssr com createServerClient
 * Documentação: https://supabase.com/docs/guides/auth/server-side/nextjs
 */

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // setAll pode ser chamado de Server Component onde cookies são read-only.
            // Route Handlers sempre podem setar — ignorar apenas em Server Components.
          }
        },
      },
    }
  );
}
