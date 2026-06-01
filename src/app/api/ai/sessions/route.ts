/**
 * src/app/api/ai/sessions/route.ts
 *
 * API Route para gerenciar as Sessões de Chat do Analista Financeiro.
 * Permite listar todas as conversas e instanciar uma nova sessão perfeitamente integrada.
 */

import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';

export const runtime = 'nodejs';

// GET: Listar todas as sessões do usuário
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

    // Listar sessões ordenadas pela atualização mais recente
    const { data: chatSessions, error: listError } = await supabase
      .from('chat_sessions')
      .select('id, title, created_at, updated_at')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false });

    if (listError) {
      throw listError;
    }

    return NextResponse.json({
      success: true,
      sessions: chatSessions || []
    });

  } catch (err: any) {
    console.error('[API Sessions GET] Erro ao listar sessões:', err);
    return NextResponse.json(
      { error: err.message || 'Erro interno no servidor ao listar sessões.' },
      { status: 500 }
    );
  }
}

// POST: Criar uma nova sessão de chat
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
    try {
      const body = await req.json();
      if (body && body.title) {
        title = body.title;
      }
    } catch {
      // Ignorar corpo ausente
    }

    // Criar a nova sessão
    const { data: newSession, error: createError } = await supabase
      .from('chat_sessions')
      .insert({
        user_id: user.id,
        title: title
      })
      .select('id, title, created_at, updated_at')
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
