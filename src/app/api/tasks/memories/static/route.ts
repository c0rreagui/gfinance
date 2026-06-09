import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import fs from 'fs/promises';
import path from 'path';

const MEMORY_DIR = path.join(process.cwd(), 'src/lib/gwork/memory');

async function getFilePath(type: string): Promise<string> {
  const safeType = type.replace(/[^a-z0-9_-]/gi, '').toLowerCase();
  return path.join(MEMORY_DIR, `${safeType}.md`);
}

export async function GET(req: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type'); // 'persona', 'alma', 'funcoes'

    if (!type || !['persona', 'alma', 'funcoes'].includes(type)) {
      return NextResponse.json({ error: 'Tipo inválido de memória estática.' }, { status: 400 });
    }

    const filePath = await getFilePath(type);
    
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      return NextResponse.json({ type, content });
    } catch (err) {
      // If file doesn't exist yet, return empty
      return NextResponse.json({ type, content: '' });
    }
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err.message || 'Falha ao ler arquivo.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const body = await req.json();
    const { type, content } = body;

    if (!type || !['persona', 'alma', 'funcoes'].includes(type)) {
      return NextResponse.json({ error: 'Tipo inválido de memória estática.' }, { status: 400 });
    }

    if (content === undefined || typeof content !== 'string') {
      return NextResponse.json({ error: 'Conteúdo inválido.' }, { status: 400 });
    }

    // Ensure directory exists
    await fs.mkdir(MEMORY_DIR, { recursive: true });

    const filePath = await getFilePath(type);
    await fs.writeFile(filePath, content, 'utf-8');

    return NextResponse.json({ success: true, type });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err.message || 'Falha ao salvar arquivo.' }, { status: 500 });
  }
}
