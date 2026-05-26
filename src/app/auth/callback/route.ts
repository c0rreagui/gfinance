/**
 * src/app/auth/callback/route.ts
 *
 * Rota de Callback para OAuth do Supabase.
 * Troca o código temporário do Google OAuth por cookies de sessão válidos no servidor.
 */

import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/';

  if (code) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
    
    console.error('[OAuth Callback] Erro ao trocar código por sessão:', error);
  }

  // Em caso de falha, redireciona de volta para login com parâmetro de erro
  return NextResponse.redirect(`${origin}/auth?error=oauth_failed`);
}
