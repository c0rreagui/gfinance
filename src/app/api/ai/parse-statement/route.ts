/**
 * src/app/api/ai/parse-statement/route.ts
 *
 * API Route para processamento inteligente de extratos (PDF/Imagens).
 * Autentica a sessão do usuário, extrai o buffer do arquivo enviado
 * e invoca o parser multimodal do Gemini AI Brain para extrair dados estruturados.
 */

import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { parseStatementWithAI } from '@/lib/gemini';

export const runtime = 'nodejs';

// Limitar o tamanho do payload em 10MB para segurança
export const maxDuration = 60; // 60 segundos de limite de execução

export async function POST(req: Request): Promise<NextResponse> {
  try {
    // 1. Autenticar usuário conectado via Supabase Server Client
    const authHeader = req.headers.get('Authorization');
    const supabaseToken = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;

    const supabase = await createSupabaseServerClient();

    if (supabaseToken) {
      await supabase.auth.setSession({
        access_token: supabaseToken,
        refresh_token: ''
      });
    }

    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    const user = session?.user;

    if (sessionError || !user) {
      return NextResponse.json(
        { error: 'Sessão inválida ou expirada. Faça login novamente.' },
        { status: 401 }
      );
    }

    // 2. Extrair o arquivo do FormData
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { error: 'Nenhum arquivo enviado. Envie um arquivo com o campo "file".' },
        { status: 400 }
      );
    }

    const validMimeTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];
    if (!validMimeTypes.includes(file.type)) {
      return NextResponse.json(
        { error: `Tipo de arquivo inválido (${file.type}). Envie PDF, PNG ou JPEG.` },
        { status: 400 }
      );
    }

    // 3. Converter o arquivo para Buffer
    const arrayBuffer = await file.arrayBuffer();
    const fileBuffer = Buffer.from(arrayBuffer);

    // 4. Buscar perfil do usuário para verificar preferências de LLM
    const { data: profile } = await supabase
      .from('profiles')
      .select('llm_provider, llm_model, llm_api_url, llm_api_key')
      .eq('id', user.id)
      .single();

    const customLLMConfig = profile?.llm_provider && profile.llm_provider !== 'gemini' ? {
      provider: profile.llm_provider,
      apiUrl: profile.llm_api_url,
      apiKey: profile.llm_api_key,
      model: profile.llm_model || ''
    } : undefined;

    const isCustomVision = customLLMConfig?.model && (
      customLLMConfig.model.toLowerCase().includes('vl') ||
      customLLMConfig.model.toLowerCase().includes('vision') ||
      customLLMConfig.model.toLowerCase().includes('llava') ||
      customLLMConfig.model.toLowerCase().includes('gpt-4o') ||
      customLLMConfig.model.toLowerCase().includes('gemini')
    );

    const engineName = customLLMConfig
      ? (isCustomVision 
          ? `${customLLMConfig.provider.toUpperCase()} (${customLLMConfig.model})`
          : `Gemini 2.0 Flash Vision (Visão Híbrida — Chat via ${customLLMConfig.provider.toUpperCase()} ${customLLMConfig.model})`)
      : 'Gemini 2.0 Flash Vision';

    const providerToken = req.headers.get('x-provider-token') || session?.provider_token;

    console.info(`[Parser AI] Iniciando extração do arquivo: "${file.name}" (${file.type}) usando engine: ${engineName}`);
    
    const transactions = await parseStatementWithAI(
      fileBuffer,
      file.type,
      providerToken || undefined,
      customLLMConfig
    );

    console.info(`[Parser AI] Sucesso! Extraídas ${transactions.length} transações.`);

    return NextResponse.json({
      success: true,
      filename: file.name,
      engineName,
      transactions
    });

  } catch (err: any) {
    console.error('[Parser API] Erro catastrófico ao processar arquivo:', err);
    return NextResponse.json(
      { error: err.message || 'Erro interno no servidor ao processar o extrato bancário.' },
      { status: 500 }
    );
  }
}
