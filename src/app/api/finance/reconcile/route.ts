import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { reconcileBalances } from '@/lib/reconcile';

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

    // Run reconciliation logic (which now excludes future transactions!)
    const result = await reconcileBalances(supabase, userId);

    if (!result.success) {
      return NextResponse.json({ error: result.error || 'Erro na reconciliação.' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      balances: result.data 
    }, { status: 200 });

  } catch (err: any) {
    console.error('Erro na rota de reconciliação de saldos:', err);
    return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 });
  }
}
