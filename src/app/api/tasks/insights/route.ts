import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    
    // Verify user authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Usuário não autenticado.' }, { status: 401 });
    }

    // Fetch active insights (non-dismissed, non-acted_on) for the current user
    const { data: insights, error } = await supabase
      .from('ai_insights')
      .select('*')
      .eq('user_id', user.id)
      .eq('dismissed', false)
      .eq('acted_on', false)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      console.error('[GET /api/tasks/insights] Error fetching insights:', error);
      return NextResponse.json({ error: 'Erro ao buscar insights.' }, { status: 500 });
    }

    return NextResponse.json(insights || []);
  } catch (err: any) {
    console.error('[GET /api/tasks/insights] Internal error:', err);
    return NextResponse.json({ error: err.message || 'Falha técnica.' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    
    // Verify user authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Usuário não autenticado.' }, { status: 401 });
    }

    const body = await req.json();
    const { id, dismissed, acted_on } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID do insight é obrigatório.' }, { status: 400 });
    }

    // Build update object dynamically based on parameters provided
    const updateFields: Record<string, any> = {};
    if (typeof dismissed === 'boolean') updateFields.dismissed = dismissed;
    if (typeof acted_on === 'boolean') updateFields.acted_on = acted_on;

    if (Object.keys(updateFields).length === 0) {
      return NextResponse.json({ error: 'Campos de atualização inválidos.' }, { status: 400 });
    }

    const { data: updatedInsight, error } = await supabase
      .from('ai_insights')
      .update(updateFields)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      console.error('[PATCH /api/tasks/insights] Error updating insight:', error);
      return NextResponse.json({ error: 'Erro ao atualizar insight.' }, { status: 500 });
    }

    return NextResponse.json({ success: true, insight: updatedInsight });
  } catch (err: any) {
    console.error('[PATCH /api/tasks/insights] Internal error:', err);
    return NextResponse.json({ error: err.message || 'Falha técnica.' }, { status: 500 });
  }
}
