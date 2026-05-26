/**
 * src/app/api/ai/test/route.ts
 *
 * Rota de Diagnóstico Seguro do Gemini AI Brain.
 * Testa a validade da GEMINI_API_KEY e a conectividade com a Google AI API.
 */

import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export const runtime = 'nodejs';

export async function GET(req: Request): Promise<NextResponse> {
  const diagnostics: any = {
    gemini_key_configured: false,
    gemini_key_placeholder: false,
    gemini_connection_ok: false,
    supabase_url_configured: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    supabase_url: process.env.NEXT_PUBLIC_SUPABASE_URL || 'não configurado',
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
    if (!apiKey || diagnostics.gemini_key_placeholder) {
      throw new Error('Chave de API do Gemini ausente ou configurada como placeholder.');
    }

    // Inicializar cliente e fazer chamada de teste ultra-leve
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    
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
