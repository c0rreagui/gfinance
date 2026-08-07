import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import { validateAccessToken } from './oauth-store';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export function hashMcpKey(rawKey: string): string {
  return crypto.createHash('sha256').update(rawKey).digest('hex');
}

export function generateMcpToken(): { rawKey: string; keyHash: string; keyPrefix: string } {
  const randomBytes = crypto.randomBytes(24).toString('hex');
  const rawKey = `ghub_pat_${randomBytes}`;
  const keyHash = hashMcpKey(rawKey);
  const keyPrefix = rawKey.substring(0, 14);
  return { rawKey, keyHash, keyPrefix };
}

export interface McpAuthResult {
  authenticated: boolean;
  userId?: string;
  permissions?: string;
  error?: string;
}

export async function validateMcpRequest(req: Request): Promise<McpAuthResult> {
  const url = new URL(req.url);
  const authHeader = req.headers.get('Authorization') || req.headers.get('authorization');
  
  let rawToken = '';

  if (authHeader && authHeader.toLowerCase().startsWith('bearer ')) {
    rawToken = authHeader.substring(7).trim();
  } else {
    rawToken = url.searchParams.get('key') || url.searchParams.get('api_key') || url.searchParams.get('token') || '';
  }

  if (!rawToken) {
    return { authenticated: false, error: 'Token de autenticação MCP não fornecido. Forneça via Bearer Token ou parâmetro ?key=ghub_pat_...' };
  }

  // Verificação de token OAuth 2.0 (MCP)
  if (rawToken.startsWith('ghub_oauth_')) {
    const at = validateAccessToken(rawToken);
    if (at) {
      return {
        authenticated: true,
        userId: at.user_id,
        permissions: 'full'
      };
    }
    return { authenticated: false, error: 'Token OAuth inválido ou expirado.' };
  }

  // 1. Verificar se o token é um token PAT da tabela mcp_api_keys
  const keyHash = hashMcpKey(rawToken);
  const adminSupabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const { data: keyRecord, error: dbError } = await adminSupabase
      .from('mcp_api_keys')
      .select('id, user_id, permissions, expires_at')
      .eq('key_hash', keyHash)
      .single();

    if (!dbError && keyRecord) {
      if (keyRecord.expires_at && new Date(keyRecord.expires_at) < new Date()) {
        return { authenticated: false, error: 'Chave de API MCP expirada.' };
      }

      adminSupabase
        .from('mcp_api_keys')
        .update({ last_used_at: new Date().toISOString() })
        .eq('id', keyRecord.id)
        .then(() => {});

      return {
        authenticated: true,
        userId: keyRecord.user_id,
        permissions: keyRecord.permissions || 'full'
      };
    }
  } catch (err) {
    console.warn('[MCP Auth] Erro ao consultar tabela mcp_api_keys:', err);
  }

  // 1.5. Fallback para profiles se a tabela mcp_api_keys não existir
  try {
    const { data: profiles } = await adminSupabase
      .from('profiles')
      .select('id, mcp_keys');

    if (profiles && Array.isArray(profiles)) {
      for (const p of profiles) {
        if (Array.isArray(p.mcp_keys)) {
          const match = p.mcp_keys.find((k: any) => k.key_hash === keyHash);
          if (match) {
            return {
              authenticated: true,
              userId: p.id,
              permissions: match.permissions || 'full'
            };
          }
        }
      }
    }
  } catch (err) {
    console.warn('[MCP Auth Fallback] Erro ao buscar chaves em profiles:', err);
  }

  // 2. Fallback: Se o token for uma chave JWT de sessão do Supabase
  try {
    const { data: { user }, error: userError } = await adminSupabase.auth.getUser(rawToken);
    if (!userError && user) {
      return {
        authenticated: true,
        userId: user.id,
        permissions: 'full'
      };
    }
  } catch (err) {
    console.warn('[MCP Auth] Erro ao validar JWT no Supabase:', err);
  }

  return { authenticated: false, error: 'Chave de API MCP inválida ou revogada.' };
}

export async function getDefaultUserId(): Promise<string> {
  const adminSupabase = createClient(supabaseUrl, supabaseServiceKey);
  try {
    const { data } = await adminSupabase
      .from('profiles')
      .select('id')
      .limit(1);
    if (data && data.length > 0) {
      return data[0].id;
    }
  } catch (err) {
    console.warn('[MCP Auth] Fallback buscando em profiles falhou:', err);
  }
  // User ID fallback resiliência absoluta para passar em handshakes de descoberta MCP
  return '00000000-0000-0000-0000-000000000000';
}
