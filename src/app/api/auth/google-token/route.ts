/**
 * src/app/api/auth/google-token/route.ts
 *
 * Rota que retorna um token Google válido para uso no Gemini Brain.
 * Estratégia em cascata:
 *   1. Verifica o google_access_token salvo no banco (profiles)
 *   2. Se expirado e há refresh_token, renova automaticamente via Google OAuth2
 *   3. Retorna o token válido (ou null se não autenticado com Google)
 */

import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';

export const runtime = 'nodejs';

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';

export async function GET(req: Request): Promise<NextResponse> {
  const authHeader = req.headers.get('Authorization');
  const supabaseToken = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;

  const supabase = await createSupabaseServerClient();

  if (supabaseToken) {
    await supabase.auth.setSession({ access_token: supabaseToken, refresh_token: '' });
  }

  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user;

  if (!user) {
    return NextResponse.json({ token: null, error: 'Não autenticado' }, { status: 401 });
  }

  // Buscar tokens salvos no banco
  const { data: profile } = await supabase
    .from('profiles')
    .select('google_access_token, google_refresh_token, google_token_expires_at')
    .eq('id', user.id)
    .single();

  if (!profile?.google_access_token) {
    // Usuário nunca fez login com Google — retorna null sem erro
    return NextResponse.json({ token: null, requires_google_login: true });
  }

  // Verificar se o token ainda é válido (com 5 min de margem)
  const expiresAt = profile.google_token_expires_at
    ? new Date(profile.google_token_expires_at).getTime()
    : 0;
  const isExpired = Date.now() > expiresAt - 5 * 60 * 1000;

  if (!isExpired) {
    // Token ainda válido
    return NextResponse.json({ token: profile.google_access_token });
  }

  // Token expirado — tentar renovar via refresh_token
  if (!profile.google_refresh_token) {
    // Sem refresh token disponível (pode ocorrer se o usuário negou acesso offline)
    return NextResponse.json({
      token: null,
      requires_google_login: true,
      reason: 'token_expired_no_refresh'
    });
  }

  try {
    const refreshResponse = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID || '',
        client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
        refresh_token: profile.google_refresh_token,
        grant_type: 'refresh_token',
      }),
    });

    if (!refreshResponse.ok) {
      const errText = await refreshResponse.text();
      console.error('[Google Token Refresh] Falha:', errText);
      return NextResponse.json({
        token: null,
        requires_google_login: true,
        reason: 'refresh_failed'
      });
    }

    const refreshData = await refreshResponse.json();
    const newAccessToken = refreshData.access_token;
    const newExpiresAt = new Date(Date.now() + (refreshData.expires_in || 3600) * 1000).toISOString();

    // Salvar novo token no banco
    await supabase
      .from('profiles')
      .update({
        google_access_token: newAccessToken,
        google_token_expires_at: newExpiresAt,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    return NextResponse.json({ token: newAccessToken });

  } catch (err: any) {
    console.error('[Google Token Refresh] Erro inesperado:', err.message);
    return NextResponse.json({
      token: null,
      requires_google_login: true,
      reason: 'refresh_error'
    });
  }
}
