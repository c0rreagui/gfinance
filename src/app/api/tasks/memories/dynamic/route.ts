import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';

export async function GET(req: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const onlyActive = searchParams.get('onlyActive') !== 'false';

    let query = supabase
      .from('agent_memories')
      .select('*')
      .eq('user_id', user.id);

    if (onlyActive) {
      query = query.eq('is_active', true);
    }

    // Order by date
    query = query.order('created_at', { ascending: false });

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ success: true, memories: data });
  } catch (err: any) {
    console.error('[Dynamic Memories GET Error]:', err);
    return NextResponse.json({ error: err.message || 'Falha ao buscar memórias.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const body = await req.json();
    const { memories, sourceTranscriptionId } = body;

    if (!memories || !Array.isArray(memories) || memories.length === 0) {
      return NextResponse.json({ error: 'Nenhuma memória para salvar.' }, { status: 400 });
    }

    // Map content strings to insert payloads
    const rowsToInsert = memories.map((content: string) => ({
      user_id: user.id,
      content: content.trim(),
      memory_type: 'rule', // default type is rule
      source_transcription_id: sourceTranscriptionId || null,
      is_active: true
    }));

    const { data, error } = await supabase
      .from('agent_memories')
      .insert(rowsToInsert)
      .select('*');

    if (error) throw error;

    return NextResponse.json({ success: true, inserted: data });
  } catch (err: any) {
    console.error('[Dynamic Memories POST Error]:', err);
    return NextResponse.json({ error: err.message || 'Falha ao salvar memórias.' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID de memória não fornecido.' }, { status: 400 });
    }

    const { error } = await supabase
      .from('agent_memories')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[Dynamic Memories DELETE Error]:', err);
    return NextResponse.json({ error: err.message || 'Falha ao excluir memória.' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const body = await req.json();
    const { id, is_active } = body;

    if (!id || is_active === undefined) {
      return NextResponse.json({ error: 'Parâmetros inválidos.' }, { status: 400 });
    }

    const { error } = await supabase
      .from('agent_memories')
      .update({ is_active })
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[Dynamic Memories PATCH Error]:', err);
    return NextResponse.json({ error: err.message || 'Falha ao atualizar memória.' }, { status: 500 });
  }
}
