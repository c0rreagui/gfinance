import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { getValidGoogleToken } from '@/lib/google-auth';
import { listGoogleEvents } from '@/lib/google-calendar';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;

    if (!user) {
      return NextResponse.json({ error: 'Não autenticado no Supabase' }, { status: 401 });
    }

    const userId = user.id;

    // 1. Consultar eventos locais no Supabase
    const { data: localEvents, error: dbError } = await supabase
      .from('calendar_events')
      .select('*')
      .eq('user_id', userId);

    // 2. Testar e ler o token do Google e a API
    let tokenStatus = {};
    let googleEventsCount = 0;
    let googleError = null;
    let googleEventsSample = [];

    try {
      const googleToken = await getValidGoogleToken(userId);
      tokenStatus = {
        has_token: !!googleToken,
        token_preview: googleToken ? `${googleToken.substring(0, 10)}...` : null
      };

      if (googleToken) {
        const timeMin = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString();
        const timeMax = new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString();
        const googleData = await listGoogleEvents(googleToken, timeMin, timeMax);
        googleEventsCount = googleData.items?.length || 0;
        googleEventsSample = googleData.items?.slice(0, 3) || [];
      }
    } catch (err: any) {
      googleError = err.message || err;
    }

    return NextResponse.json({
      success: true,
      userId,
      email: user.email,
      dbStatus: {
        localEventsCount: localEvents?.length || 0,
        localEventsSample: localEvents?.slice(0, 3) || [],
        dbError: dbError?.message || null
      },
      googleStatus: {
        tokenStatus,
        googleEventsCount,
        googleError,
        googleEventsSample
      }
    });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
