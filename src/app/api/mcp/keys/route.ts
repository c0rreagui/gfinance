import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { generateMcpToken } from '@/lib/mcp/auth';

export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// GET: Listar chaves MCP do usuário autenticado
export async function GET(req: Request) {
  const authHeader = req.headers.get('Authorization');
  const token = authHeader?.replace('Bearer ', '');
  
  const adminSupabase = createClient(supabaseUrl, supabaseServiceKey);
  const { data: { user }, error: authError } = await adminSupabase.auth.getUser(token || '');

  if (authError || !user) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
  }

  const { data: keys, error } = await adminSupabase
    .from('mcp_api_keys')
    .select('id, name, key_prefix, permissions, last_used_at, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, keys });
}

// POST: Criar nova chave MCP para o usuário
export async function POST(req: Request) {
  const authHeader = req.headers.get('Authorization');
  const token = authHeader?.replace('Bearer ', '');
  
  const adminSupabase = createClient(supabaseUrl, supabaseServiceKey);
  const { data: { user }, error: authError } = await adminSupabase.auth.getUser(token || '');

  if (authError || !user) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
  }

  let body: any = {};
  try {
    body = await req.json();
  } catch {}

  const name = body.name || 'Nova Chave MCP (Gemini Spark)';
  const { rawKey, keyHash, keyPrefix } = generateMcpToken();

  const { data: newRecord, error } = await adminSupabase
    .from('mcp_api_keys')
    .insert({
      user_id: user.id,
      name,
      key_hash: keyHash,
      key_prefix: keyPrefix,
      permissions: 'full'
    })
    .select('id, name, key_prefix, created_at')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    key: newRecord,
    rawKey // Exibida APENAS UMA VEZ no momento da criação
  });
}

// DELETE: Revogar/Excluir chave MCP
export async function DELETE(req: Request) {
  const authHeader = req.headers.get('Authorization');
  const token = authHeader?.replace('Bearer ', '');
  
  const adminSupabase = createClient(supabaseUrl, supabaseServiceKey);
  const { data: { user }, error: authError } = await adminSupabase.auth.getUser(token || '');

  if (authError || !user) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
  }

  const url = new URL(req.url);
  const keyId = url.searchParams.get('id');

  if (!keyId) {
    return NextResponse.json({ error: 'ID da chave é obrigatório.' }, { status: 400 });
  }

  const { error } = await adminSupabase
    .from('mcp_api_keys')
    .delete()
    .eq('id', keyId)
    .eq('user_id', user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, message: 'Chave de API MCP revogada com sucesso.' });
}
