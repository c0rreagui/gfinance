/**
 * src/app/api/ai/sessions/[id]/route.ts
 *
 * API Route dinâmica para gerenciar uma sessão de chat específica.
 * Permite buscar todo o histórico de mensagens da sessão e excluí-la de forma limpa.
 */

import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';

export const runtime = 'nodejs';

// GET: Buscar todas as mensagens de uma sessão específica
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { id: sessionId } = await params;
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

    // 1. Verificar se a sessão pertence ao usuário autenticado para proteção RLS extra
    const { data: chatSession, error: checkError } = await supabase
      .from('chat_sessions')
      .select('id')
      .eq('id', sessionId)
      .eq('user_id', user.id)
      .single();

    if (checkError || !chatSession) {
      return NextResponse.json(
        { error: 'Sessão de conversa não encontrada ou acesso não autorizado.' },
        { status: 404 }
      );
    }

    // 2. Listar todas as mensagens (incluindo compactadas para renderização histórica)
    const { data: messages, error: listError } = await supabase
      .from('chat_messages')
      .select('id, role, content, is_compacted, created_at')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });

    if (listError) {
      throw listError;
    }

    return NextResponse.json({
      success: true,
      messages: messages || []
    });

  } catch (err: any) {
    console.error('[API Session Detail GET] Erro:', err);
    return NextResponse.json(
      { error: err.message || 'Erro interno no servidor ao carregar mensagens.' },
      { status: 500 }
    );
  }
}

// DELETE: Excluir a sessão de chat e suas mensagens em cascata
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { id: sessionId } = await params;
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

    // Excluir a sessão (o banco de dados lida com ON DELETE CASCADE nas mensagens)
    const { error: deleteError } = await supabase
      .from('chat_sessions')
      .delete()
      .eq('id', sessionId)
      .eq('user_id', user.id);

    if (deleteError) {
      throw deleteError;
    }

    return NextResponse.json({
      success: true,
      message: 'Sessão excluída com sucesso.'
    });

  } catch (err: any) {
    console.error('[API Session Detail DELETE] Erro:', err);
    return NextResponse.json(
      { error: err.message || 'Erro interno no servidor ao excluir sessão.' },
      { status: 500 }
    );
  }
}
