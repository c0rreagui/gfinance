/**
 * src/app/api/ai/test/route.ts
 *
 * Rota de Diagnóstico Seguro do Gemini AI Brain.
 * Testa a validade da GEMINI_API_KEY, a sessão OAuth do usuário e a conectividade com a Google AI API.
 * Suporta dois modos de autenticação:
 *   - GOOGLE_OAUTH_TOKEN: via x-provider-token header (GCP Bearer token)
 *   - API_KEY: via GEMINI_API_KEY configurada no .env.local
 */

import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';

export const runtime = 'nodejs';

const GEMINI_REST_BASE = 'https://generativelanguage.googleapis.com/v1beta';

export async function GET(req: Request): Promise<NextResponse> {
  const diagnostics: any = {
    user_logged_in: false,
    google_oauth_token_present: false,
    gemini_key_configured: false,
    gemini_key_placeholder: false,
    gemini_connection_ok: false,
    supabase_url_configured: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    supabase_url: process.env.NEXT_PUBLIC_SUPABASE_URL || 'não configurado',
    auth_mode: 'NONE',
    error: null
  };

  const apiKey = process.env.GEMINI_API_KEY;

  if (apiKey) {
    diagnostics.gemini_key_configured = true;
    if (apiKey === 'your-gemini-api-key-here') {
      diagnostics.gemini_key_placeholder = true;
    }
  }

  try {
    // 1. Autenticar usuário via cookies ou Authorization header
    const authHeader = req.headers.get('Authorization');
    const supabaseToken = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;

    const supabase = await createSupabaseServerClient();

    if (supabaseToken) {
      await supabase.auth.setSession({
        access_token: supabaseToken,
        refresh_token: ''
      });
    }

    const { data: { session } } = await supabase.auth.getSession();
    const providerToken = req.headers.get('x-provider-token') || session?.provider_token;

    if (session?.user) {
      diagnostics.user_logged_in = true;
      diagnostics.user_email = session.user.email;
    }

    if (providerToken) {
      diagnostics.google_oauth_token_present = true;
      diagnostics.auth_mode = 'GOOGLE_OAUTH_TOKEN';
    } else if (apiKey && !diagnostics.gemini_key_placeholder) {
      diagnostics.auth_mode = 'API_KEY';
    }

    // 2. Verificar se há qualquer método de autenticação disponível
    if (diagnostics.auth_mode === 'NONE') {
      throw new Error(
        'Nenhum método de autenticação disponível. Configure GEMINI_API_KEY no .env.local ou conecte sua conta Google em Configurações.'
      );
    }

    // 3. Fazer chamada de teste ao Gemini
    const start = Date.now();

    if (providerToken) {
      // Teste via OAuth REST direto
      const url = `${GEMINI_REST_BASE}/models/gemini-flash-latest:generateContent`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${providerToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: 'Responda apenas com a palavra "OK".' }] }],
          generationConfig: { maxOutputTokens: 10 }
        }),
      });

      const latency = Date.now() - start;
      diagnostics.latency_ms = latency;

      if (!response.ok) {
        const errBody = await response.text();
        throw new Error(`Gemini OAuth retornou ${response.status}: ${errBody}`);
      }

      const json = await response.json();
      diagnostics.gemini_connection_ok = true;
      diagnostics.test_response = json.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '(resposta vazia)';

    } else {
      // Teste via SDK com API Key
      const { GoogleGenerativeAI } = await import('@google/generative-ai');
      const genAI = new GoogleGenerativeAI(apiKey!);
      const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' });
      const result = await model.generateContent('Responda apenas com a palavra "OK".');
      const latency = Date.now() - start;

      diagnostics.gemini_connection_ok = true;
      diagnostics.latency_ms = latency;
      diagnostics.test_response = result.response.text().trim();
    }

  } catch (err: any) {
    diagnostics.error = err.message || 'Erro desconhecido ao conectar com a API do Gemini';
  }

  return NextResponse.json(diagnostics);
}
