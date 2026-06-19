/**
 * src/app/api/ai/sessions/route.ts
 *
 * API Route para gerenciar Sessões de Chat, isoladas por módulo.
 * O parâmetro `module` ('finance' | 'work') filtra as sessões para
 * garantir que o CFO Assistant (G-Finance) e o CPO Assistant (G-Work)
 * nunca compartilhem histórico de conversas.
 */

import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';

export const runtime = 'nodejs';

// GET: Listar sessões do usuário filtradas por módulo
export async function GET(req: Request): Promise<NextResponse> {
  try {
    const authHeader = req.headers.get('Authorization');
    const supabaseToken = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;

    const supabase = await createSupabaseServerClient();

    if (supabaseToken) {
      await supabase.auth.setSession({
        access_token: supabaseToken,
        refresh_token: ''
      });
    }

    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    const user = session?.user;

    if (sessionError || !user) {
      return NextResponse.json(
        { error: 'Sessão inválida ou expirada. Faça login novamente.' },
        { status: 401 }
      );
    }

    // Extrair o módulo da query string (padrão: finance)
    const url = new URL(req.url);
    const rawModule = url.searchParams.get('module');
    const module = rawModule === 'work' ? 'work' : rawModule === 'hub' ? 'hub' : 'finance';

    // Listar sessões ativas filtradas por módulo e usuário
    const { data: chatSessions, error: listError } = await supabase
      .from('chat_sessions')
      .select('id, title, created_at, updated_at, module, chat_messages!inner(id)')
      .eq('user_id', user.id)
      .eq('module', module)
      .order('updated_at', { ascending: false });

    if (listError) {
      throw listError;
    }

    return NextResponse.json({
      success: true,
      sessions: chatSessions || [],
      module
    });

  } catch (err: any) {
    console.error('[API Sessions GET] Erro ao listar sessões:', err);
    return NextResponse.json(
      { error: err.message || 'Erro interno no servidor ao listar sessões.' },
      { status: 500 }
    );
  }
}

// POST: Criar uma nova sessão de chat com módulo
export async function POST(req: Request): Promise<NextResponse> {
  try {
    const authHeader = req.headers.get('Authorization');
    const supabaseToken = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;

    const supabase = await createSupabaseServerClient();

    if (supabaseToken) {
      await supabase.auth.setSession({
        access_token: supabaseToken,
        refresh_token: ''
      });
    }

    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    const user = session?.user;

    if (sessionError || !user) {
      return NextResponse.json(
        { error: 'Sessão inválida ou expirada. Faça login novamente.' },
        { status: 401 }
      );
    }

    let title = 'Nova Conversa';
    let module = 'finance';
    try {
      const body = await req.json();
      if (body?.title) title = body.title;
      if (body?.module === 'work') module = 'work';
      else if (body?.module === 'hub') module = 'hub';
    } catch {
      // Ignorar corpo ausente
    }

    const { data: newSession, error: createError } = await supabase
      .from('chat_sessions')
      .insert({
        user_id: user.id,
        title,
        module
      })
      .select('id, title, created_at, updated_at, module')
      .single();

    if (createError) {
      throw createError;
    }

    return NextResponse.json({
      success: true,
      session: newSession
    });

  } catch (err: any) {
    console.error('[API Sessions POST] Erro ao criar sessão:', err);
    return NextResponse.json(
      { error: err.message || 'Erro interno no servidor ao criar sessão.' },
      { status: 500 }
    );
  }
}
