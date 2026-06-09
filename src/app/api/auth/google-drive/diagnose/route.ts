import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { getValidGoogleToken } from '@/lib/google-auth';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;

    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    // 1. Check process.env variables
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    const envStatus = {
      GOOGLE_CLIENT_ID: clientId ? `Presente (tamanho: ${clientId.length}, início: ${clientId.substring(0, 8)}...)` : 'AUSENTE',
      GOOGLE_CLIENT_SECRET: clientSecret ? `Presente (tamanho: ${clientSecret.length})` : 'AUSENTE'
    };

    // 2. Check Database record
    const { data: profile, error: dbError } = await supabase
      .from('profiles')
      .select('google_access_token, google_refresh_token, google_token_expires_at')
      .eq('id', user.id)
      .single();

    if (dbError || !profile) {
      return NextResponse.json({
        success: false,
        message: 'Perfil não encontrado no banco de dados',
        dbError: dbError?.message,
        envStatus
      });
    }

    const expiresAt = profile.google_token_expires_at
      ? new Date(profile.google_token_expires_at).getTime()
      : 0;
    const timeRemainingMs = expiresAt - Date.now();
    const isExpired = timeRemainingMs <= 5 * 60 * 1000;

    const dbStatus = {
      has_access_token: !!profile.google_access_token,
      access_token_length: profile.google_access_token?.length || 0,
      has_refresh_token: !!profile.google_refresh_token,
      refresh_token_length: profile.google_refresh_token?.length || 0,
      expires_at: profile.google_token_expires_at,
      time_remaining_sec: Math.round(timeRemainingMs / 1000),
      is_expired_or_expiring_soon: isExpired
    };

    // 3. Test refresh logic
    let refreshResult = 'Não testado (token ainda válido)';
    let refreshedToken = null;
    let refreshErrorDetails = null;

    if (isExpired) {
      try {
        console.log('[Diagnostics] Attempting token refresh...');
        const token = await getValidGoogleToken(user.id);
        if (token) {
          refreshResult = 'SUCESSO! Token renovado e atualizado no banco.';
          refreshedToken = `${token.substring(0, 10)}...`;
        } else {
          refreshResult = 'FALHA! getValidGoogleToken retornou null.';
        }
      } catch (err: any) {
        refreshResult = 'EXCEÇÃO! Erro disparado durante refresh.';
        refreshErrorDetails = err.message || err;
      }
    }

    return NextResponse.json({
      success: true,
      envStatus,
      dbStatus,
      refreshResult,
      refreshedToken,
      refreshErrorDetails
    });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
