/**
 * src/app/api/ai/list-models/route.ts
 *
 * API Route para listar modelos disponíveis dinamicamente em um servidor LLM (Ollama / OpenAI / Custom API).
 * Chamada pelo frontend dos Ajustes para preencher o select com modelos reais do host.
 */

import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';

export const runtime = 'nodejs';

export async function POST(req: Request): Promise<NextResponse> {
  const supabase = await createSupabaseServerClient();
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();

  if (sessionError || !session?.user) {
    return NextResponse.json(
      { error: 'Não autorizado. Faça login novamente.' },
      { status: 401 }
    );
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Body inválido.' }, { status: 400 });
  }

  const { provider, apiUrl, apiKey } = body;

  let endpoint = apiUrl || '';
  if (!endpoint) {
    if (provider === 'ollama') endpoint = 'https://ollama.com';
    else if (provider === 'openai') endpoint = 'https://api.openai.com';
    else {
      return NextResponse.json({ success: false, models: [] });
    }
  }

  endpoint = endpoint.replace(/\/$/, '');
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (apiKey) {
    headers['Authorization'] = `Bearer ${apiKey}`;
  }

  const discoveredModels: string[] = [];

  // 1. Tentar GET /v1/models (Padrão OpenAI)
  try {
    const res = await fetch(`${endpoint}/v1/models`, {
      headers,
      signal: AbortSignal.timeout(10000)
    });
    if (res.ok) {
      const json = await res.json();
      if (json.data && Array.isArray(json.data)) {
        json.data.forEach((m: any) => {
          if (m.id && typeof m.id === 'string') discoveredModels.push(m.id);
        });
      }
    }
  } catch (err: any) {
    console.warn('[List Models API] GET /v1/models falhou:', err.message);
  }

  // 2. Tentar GET /api/tags (Padrão nativo Ollama)
  if (discoveredModels.length === 0) {
    try {
      const res = await fetch(`${endpoint}/api/tags`, {
        headers,
        signal: AbortSignal.timeout(10000)
      });
      if (res.ok) {
        const json = await res.json();
        if (json.models && Array.isArray(json.models)) {
          json.models.forEach((m: any) => {
            if (m.name && typeof m.name === 'string' && !discoveredModels.includes(m.name)) {
              discoveredModels.push(m.name);
            }
          });
        }
      }
    } catch (err: any) {
      console.warn('[List Models API] GET /api/tags falhou:', err.message);
    }
  }

  return NextResponse.json({
    success: true,
    models: discoveredModels
  });
}
