import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { syncGoogleCalendarEvents } from '@/lib/calendar-sync';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export async function POST(request: Request) {
  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Authenticate user via Authorization Bearer Token
    const authHeader = request.headers.get('Authorization');
    let userId = '';

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);
      if (!authError && user) {
        userId = user.id;
      }
    }

    if (!userId) {
      return NextResponse.json({ error: 'Não autorizado. JWT inválido ou ausente.' }, { status: 401 });
    }

    // Execute Google Calendar synchronization
    const result = await syncGoogleCalendarEvents(userId);

    return NextResponse.json(result, { status: 200 });

  } catch (err: any) {
    console.error('[Calendar Sync Route Error]:', err.message || err);
    
    // Custom error mappings for UI prompts
    if (err.message === 'GOOGLE_AUTH_MISSING') {
      return NextResponse.json({ error: 'GOOGLE_AUTH_MISSING', message: 'Conta do Google não conectada.' }, { status: 403 });
    }
    if (err.message === 'GOOGLE_SCOPE_INSUFFICIENT') {
      return NextResponse.json({ error: 'GOOGLE_SCOPE_INSUFFICIENT', message: 'Permissões do Google Agenda insuficientes.' }, { status: 403 });
    }

    return NextResponse.json({ error: 'INTERNAL_ERROR', message: err.message || 'Erro interno do servidor.' }, { status: 500 });
  }
}
