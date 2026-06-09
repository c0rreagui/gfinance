/**
 * src/app/api/auth/google-token/route.ts
 *
 * Rota que retorna um token Google válido para uso no Gemini Brain.
 */

import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { getValidGoogleToken } from '@/lib/google-auth';

export const runtime = 'nodejs';

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

  const token = await getValidGoogleToken(user.id);
  if (!token) {
    return NextResponse.json({ token: null, requires_google_login: true });
  }

  return NextResponse.json({ token });
}
