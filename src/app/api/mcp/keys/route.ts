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

  // 1. Tentar selecionar da tabela mcp_api_keys
  const { data: keys, error } = await adminSupabase
    .from('mcp_api_keys')
    .select('id, name, key_prefix, permissions, last_used_at, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (!error && keys) {
    return NextResponse.json({ success: true, keys });
  }

  // 2. Fallback: Se a tabela mcp_api_keys não existir no Supabase, ler de profiles.mcp_keys
  try {
    const { data: profile } = await adminSupabase
      .from('profiles')
      .select('mcp_keys')
      .eq('id', user.id)
      .single();

    const fallbackKeys = (profile?.mcp_keys || []).map((k: any) => ({
      id: k.id,
      name: k.name,
      key_prefix: k.key_prefix,
      permissions: k.permissions || 'full',
      last_used_at: k.last_used_at || null,
      created_at: k.created_at
    }));

    return NextResponse.json({ success: true, keys: fallbackKeys });
  } catch (fallbackErr: any) {
    return NextResponse.json({ success: true, keys: [] });
  }
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

  // 1. Tentar inserir na tabela mcp_api_keys
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

  if (!error && newRecord) {
    return NextResponse.json({
      success: true,
      key: newRecord,
      rawKey
    });
  }

  // 2. Fallback: Se a tabela mcp_api_keys não existir no Supabase, salvar em profiles.mcp_keys
  try {
    const { data: profile } = await adminSupabase
      .from('profiles')
      .select('mcp_keys')
      .eq('id', user.id)
      .single();

    const existingKeys = Array.isArray(profile?.mcp_keys) ? profile.mcp_keys : [];
    const fallbackRecord = {
      id: `mcp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      name,
      key_hash: keyHash,
      key_prefix: keyPrefix,
      permissions: 'full',
      created_at: new Date().toISOString()
    };

    const updatedKeys = [fallbackRecord, ...existingKeys];

    await adminSupabase
      .from('profiles')
      .update({ mcp_keys: updatedKeys })
      .eq('id', user.id);

    return NextResponse.json({
      success: true,
      key: {
        id: fallbackRecord.id,
        name: fallbackRecord.name,
        key_prefix: fallbackRecord.key_prefix,
        created_at: fallbackRecord.created_at
      },
      rawKey
    });
  } catch (fallbackErr: any) {
    return NextResponse.json({ error: `Erro ao criar chave MCP no perfil: ${fallbackErr.message}` }, { status: 500 });
  }
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

  // 1. Tentar deletar da tabela mcp_api_keys
  const { error } = await adminSupabase
    .from('mcp_api_keys')
    .delete()
    .eq('id', keyId)
    .eq('user_id', user.id);

  if (!error) {
    return NextResponse.json({ success: true, message: 'Chave de API MCP revogada com sucesso.' });
  }

  // 2. Fallback: Deletar de profiles.mcp_keys
  try {
    const { data: profile } = await adminSupabase
      .from('profiles')
      .select('mcp_keys')
      .eq('id', user.id)
      .single();

    const existingKeys = Array.isArray(profile?.mcp_keys) ? profile.mcp_keys : [];
    const updatedKeys = existingKeys.filter((k: any) => k.id !== keyId);

    await adminSupabase
      .from('profiles')
      .update({ mcp_keys: updatedKeys })
      .eq('id', user.id);

    return NextResponse.json({ success: true, message: 'Chave de API MCP revogada com sucesso.' });
  } catch (fallbackErr: any) {
    return NextResponse.json({ error: fallbackErr.message }, { status: 500 });
  }
}
