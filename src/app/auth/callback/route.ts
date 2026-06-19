/**
 * src/app/auth/callback/route.ts
 *
 * Rota de Callback para OAuth do Supabase.
 * Troca o código temporário do Google OAuth por sessão e persiste o
 * provider_token e provider_refresh_token no banco (tabela profiles)
 * para que o Gemini Brain possa usá-los em qualquer momento sem depender
 * do estado efêmero do localStorage.
 */

import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/';

  const errorParam = searchParams.get('error');
  const errorDesc = searchParams.get('error_description');

  if (errorParam || errorDesc) {
    console.error('[OAuth Callback] Google OAuth returned error:', errorParam, errorDesc);
    const msg = encodeURIComponent(errorDesc || errorParam || 'Erro de autenticação');
    return NextResponse.redirect(`${origin}/auth?error=oauth_failed&message=${msg}`);
  }

  if (!code) {
    return NextResponse.redirect(`${origin}/auth?error=oauth_failed&message=Codigo+de+autenticacao+ausente`);
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data?.session) {
    console.error('[OAuth Callback] Erro ao trocar código por sessão:', error);
    const msg = encodeURIComponent(error?.message || 'Falha ao processar codigo de sessao');
    return NextResponse.redirect(`${origin}/auth?error=oauth_failed&message=${msg}`);
  }

  const { session } = data;
  const userId = session.user.id;

  // Persistir tokens do Google no banco de dados para uso futuro pelo Gemini Brain.
  // O provider_token expira em ~1h; o provider_refresh_token permite renová-lo sem
  // exigir que o usuário faça login novamente.
  if (session.provider_token) {
    // Token expira em 3600 segundos (padrão do Google OAuth)
    const expiresAt = new Date(Date.now() + 3600 * 1000).toISOString();

    const { error: upsertError } = await supabase
      .from('profiles')
      .upsert(
        {
          id: userId,
          google_access_token: session.provider_token,
          google_refresh_token: session.provider_refresh_token ?? null,
          google_token_expires_at: expiresAt,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' }
      );

    if (upsertError) {
      // Log mas não bloqueia o login — o token do localStorage ainda funciona por ~1h
      console.error('[OAuth Callback] Falha ao persistir Google tokens:', upsertError.message);
    }
  }

  return NextResponse.redirect(`${origin}${next}`);
}
