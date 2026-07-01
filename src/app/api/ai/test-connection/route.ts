/**
 * src/app/api/ai/test-connection/route.ts
 *
 * API Route para testar a conexão com um provedor de LLM personalizado (OpenAI/Ollama).
 * Bypassa CORS chamando do backend.
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

  const { provider, apiUrl, apiKey, model } = body;

  if (provider === 'gemini') {
    // Test native Gemini key
    const geminiKey = process.env.GEMINI_API_KEY;
    if (!geminiKey || geminiKey === 'your-gemini-api-key-here') {
      return NextResponse.json({ success: false, error: 'GEMINI_API_KEY não configurada no servidor.' });
    }
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${geminiKey}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: 'Ping' }] }] })
      });
      if (response.ok) {
        return NextResponse.json({ success: true });
      }
      return NextResponse.json({ success: false, error: `Gemini retornou status ${response.status}` });
    } catch (err: any) {
      return NextResponse.json({ success: false, error: err.message });
    }
  }

  // Test OpenAI / Ollama connection
  let endpoint = apiUrl || '';
  if (!endpoint) {
    if (provider === 'ollama') {
      endpoint = 'https://ollama.com';
    } else if (provider === 'openai') {
      endpoint = 'https://api.openai.com';
    } else {
      return NextResponse.json({ success: false, error: 'A URL da API é obrigatória para este provedor.' });
    }
  }
  if (!endpoint.includes('/chat/completions') && !endpoint.includes('/completions')) {
    endpoint = endpoint.replace(/\/$/, '') + '/v1/chat/completions';
  }

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }

    const payload = {
      model: model || 'llama3',
      messages: [{ role: 'user', content: 'Ping' }],
      max_tokens: 5
    };

    console.info(`[Test LLM Connection] Testando endpoint: ${endpoint}`);

    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(30000) // 30s timeout para dar tempo da LLM em nuvem responder
    });

    if (response.ok) {
      const data = await response.json();
      if (data.choices || data.candidates || data.message) {
        return NextResponse.json({ success: true });
      }
      return NextResponse.json({ success: true, warning: 'Conectado, mas resposta em formato incomum.' });
    }

    const errorText = await response.text();
    return NextResponse.json({ success: false, error: `Status ${response.status}: ${errorText.substring(0, 150)}` });

  } catch (err: any) {
    console.error('[Test LLM Connection Error]', err);
    const errStr = String(err).toLowerCase();
    let errorMsg = err.message || 'Erro ao conectar ao endpoint.';
    if (endpoint.includes('localhost') || endpoint.includes('127.0.0.1')) {
      errorMsg += ' Nota: O servidor na nuvem (Vercel) não consegue acessar seu localhost. Exponha o Ollama usando um túnel (ex: ngrok) ou execute o G-Hub localmente.';
    }
    return NextResponse.json({ success: false, error: errorMsg });
  }
}
