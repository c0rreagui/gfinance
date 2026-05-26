/**
 * src/app/api/ai/test/route.ts
 *
 * Rota de Diagnóstico Seguro do Gemini AI Brain.
 * Testa a validade da GEMINI_API_KEY, a sessão OAuth do usuário e a conectividade com a Google AI API.
 */

import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createSupabaseServerClient } from '@/lib/supabase-server';

export const runtime = 'nodejs';

export async function GET(req: Request): Promise<NextResponse> {
  const diagnostics: any = {
    user_logged_in: false,
    google_oauth_token_present: false,
    gemini_key_configured: false,
    gemini_key_placeholder: false,
    gemini_connection_ok: false,
    supabase_url_configured: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    supabase_url: process.env.NEXT_PUBLIC_SUPABASE_URL || 'não configurado',
    auth_mode: 'API_KEY',
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
    // 1. Autenticar usuário e extrair token OAuth da sessão
    const supabase = await createSupabaseServerClient();
    const { data: { session } } = await supabase.auth.getSession();
    const providerToken = session?.provider_token;

    if (session?.user) {
      diagnostics.user_logged_in = true;
      diagnostics.user_email = session.user.email;
    }

    if (providerToken) {
      diagnostics.google_oauth_token_present = true;
      diagnostics.auth_mode = 'GOOGLE_OAUTH_TOKEN';
    }

    // 2. Definir método de autenticação da IA
    const finalKey = providerToken ? 'oauth-authenticated' : apiKey;

    if (!finalKey || (diagnostics.auth_mode === 'API_KEY' && diagnostics.gemini_key_placeholder)) {
      throw new Error('Nenhum método de autenticação disponível (GEMINI_API_KEY ausente e Google OAuth não conectado).');
    }

    // 3. Inicializar cliente e fazer chamada de teste
    const genAI = new GoogleGenerativeAI(finalKey);
    const model = genAI.getGenerativeModel(
      { model: 'gemini-2.0-flash' },
      providerToken ? { customHeaders: { 'Authorization': `Bearer ${providerToken}` } } : undefined
    );
    
    const start = Date.now();
    const result = await model.generateContent('Diga a palavra "OK"');
    const latency = Date.now() - start;
    
    diagnostics.gemini_connection_ok = true;
    diagnostics.latency_ms = latency;
    diagnostics.test_response = result.response.text().trim();

  } catch (err: any) {
    diagnostics.error = err.message || 'Erro desconhecido ao conectar com a API do Gemini';
  }

  return NextResponse.json(diagnostics);
}
