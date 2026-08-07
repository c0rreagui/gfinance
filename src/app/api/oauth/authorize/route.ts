import { NextResponse } from 'next/server';
import { createAuthCode } from '@/lib/mcp/oauth-store';
import { createSupabaseServerClient } from '@/lib/supabase-server';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const client_id = url.searchParams.get('client_id');
  const redirect_uri = url.searchParams.get('redirect_uri');
  const state = url.searchParams.get('state');
  const code_challenge = url.searchParams.get('code_challenge');
  const code_challenge_method = url.searchParams.get('code_challenge_method');
  const user_approved = url.searchParams.get('user_approved');

  if (!client_id || !redirect_uri || !state || !code_challenge || !code_challenge_method) {
    return NextResponse.json({ error: 'invalid_request' }, { status: 400 });
  }

  if (user_approved !== 'true') {
    return NextResponse.json({ error: 'access_denied' }, { status: 403 });
  }

  // Obter usuário da sessão Supabase
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'unauthorized', message: 'User not logged in' }, { status: 401 });
  }

  const code = createAuthCode(
    client_id,
    redirect_uri,
    user.id,
    code_challenge,
    code_challenge_method
  );

  const redirectUrl = new URL(redirect_uri);
  redirectUrl.searchParams.set('code', code);
  redirectUrl.searchParams.set('state', state);

  return NextResponse.redirect(redirectUrl.toString());
}
