/**
 * src/app/api/auth/google-drive/folders/route.ts
 *
 * Endpoint para listar pastas do Google Drive do usuário autenticado.
 */

import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { getValidGoogleToken } from '@/lib/google-auth';

export const runtime = 'nodejs';

export async function GET(): Promise<NextResponse> {
  const supabase = await createSupabaseServerClient();
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user;

  if (!user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  const token = await getValidGoogleToken(user.id);
  if (!token) {
    return NextResponse.json({ error: 'Conta do Google não vinculada ou token inválido' }, { status: 403 });
  }

  try {
    // Listar apenas pastas que não estão na lixeira, ordenadas por nome
    const q = "mimeType='application/vnd.google-apps.folder' and trashed=false";
    const driveUrl = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id,name)&orderBy=name&pageSize=200`;

    const response = await fetch(driveUrl, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('[Google Drive] Falha ao listar pastas:', errText);
      return NextResponse.json({ error: 'Falha ao buscar pastas do Google Drive' }, { status: response.status });
    }

    const data = await response.json();
    const allFiles = data.files || [];

    // Filtrar diretórios ocultos e pastas de desenvolvimento redundantes
    const filteredFolders = allFiles.filter((f: any) => {
      const name = f.name || '';
      const lowerName = name.toLowerCase();
      return (
        !name.startsWith('.') &&
        !name.startsWith('_') &&
        !['node_modules', 'bin', 'obj', 'dist', 'build', 'public', 'temp', 'tmp', 'venv', 'env', 'git', 'github'].includes(lowerName)
      );
    });

    return NextResponse.json({ folders: filteredFolders });
  } catch (err: any) {
    console.error('[Google Drive API Error]:', err.message);
    return NextResponse.json({ error: 'Erro interno ao consultar Google Drive' }, { status: 500 });
  }
}
