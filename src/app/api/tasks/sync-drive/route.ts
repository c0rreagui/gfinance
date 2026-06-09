/**
 * src/app/api/tasks/sync-drive/route.ts
 *
 * Rota para sincronizar arquivos de transcrição (.md) da pasta do Google Drive configurada.
 */

import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { getValidGoogleToken } from '@/lib/google-auth';
import { createHash } from 'crypto';

export const runtime = 'nodejs';

export async function POST(req: Request): Promise<NextResponse> {
  const supabase = await createSupabaseServerClient();
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user;

  if (!user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  let folderId = '';
  let folderName = '';

  try {
    const body = await req.json();
    folderId = body.folderId || '';
    folderName = body.folderName || '';
  } catch (e) {
    // Corpo da requisição vazio ou sem JSON válido
  }

  // Se não foi passado no corpo, buscar do banco de dados
  if (!folderId) {
    const { data: profile, error: profileErr } = await supabase
      .from('profiles')
      .select('google_drive_folder_id, google_drive_folder_name')
      .eq('id', user.id)
      .single();

    if (profileErr || !profile?.google_drive_folder_id) {
      return NextResponse.json({ 
        success: false, 
        message: 'Nenhuma pasta do Google Drive configurada para monitoramento nas configurações.' 
      });
    }

    folderId = profile.google_drive_folder_id;
    folderName = profile.google_drive_folder_name || '';
  } else {
    // Se foi fornecido no corpo, salvar/atualizar no perfil para persistir a configuração
    await supabase
      .from('profiles')
      .update({
        google_drive_folder_id: folderId,
        google_drive_folder_name: folderName,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id);
  }

  // 2. Obter token de acesso válido do Google
  const googleToken = await getValidGoogleToken(user.id);
  if (!googleToken) {
    return NextResponse.json({ 
      error: 'Google Drive não conectado ou autorização expirada. Reconecte nas configurações.' 
    }, { status: 403 });
  }

  try {
    // 3. Listar arquivos .md dentro da pasta
    // Google Drive query: 'folderId' in parents and name contains '.md' and trashed = false
    const q = `'${folderId}' in parents and name contains '.md' and trashed = false`;
    const driveListUrl = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id,name,modifiedTime)&pageSize=100&includeItemsFromAllDrives=true&supportsAllDrives=true`;

    const listResponse = await fetch(driveListUrl, {
      headers: {
        Authorization: `Bearer ${googleToken}`,
      },
    });

    if (!listResponse.ok) {
      const errText = await listResponse.text();
      console.error('[Google Drive Sync] Falha ao listar arquivos:', errText);
      return NextResponse.json({ error: 'Erro ao buscar arquivos no Google Drive' }, { status: listResponse.status });
    }

    const listData = await listResponse.json();
    const files = listData.files || [];

    let importedCount = 0;

    // 4. Processar cada arquivo encontrado
    for (const file of files) {
      const fileId = file.id;
      const fileName = file.name;
      const modifiedTime = file.modifiedTime || new Date().toISOString();

      try {
        // Baixar conteúdo do arquivo
        const driveDownloadUrl = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
        const downloadResponse = await fetch(driveDownloadUrl, {
          headers: {
            Authorization: `Bearer ${googleToken}`,
          },
        });

        if (!downloadResponse.ok) {
          console.warn(`[Google Drive Sync] Falha ao baixar arquivo ${fileName} (${fileId})`);
          continue;
        }

        const fileContent = await downloadResponse.text();
        if (!fileContent.trim()) {
          continue;
        }

        // Calcular SHA-256 para evitar duplicações
        const fileHash = createHash('sha256').update(fileContent).digest('hex');

        // Verificar se já existe no banco
        const { data: existing } = await supabase
          .from('transcriptions')
          .select('id')
          .eq('user_id', user.id)
          .or(`file_hash.eq.${fileHash},google_drive_file_id.eq.${fileId}`)
          .maybeSingle();

        if (!existing) {
          // Inserir nova transcrição
          const { error: insertErr } = await supabase
            .from('transcriptions')
            .insert({
              user_id: user.id,
              file_name: fileName,
              google_drive_file_id: fileId,
              content: fileContent,
              file_hash: fileHash,
              transcribed_at: modifiedTime,
              created_at: new Date().toISOString()
            });

          if (insertErr) {
            console.error(`[Google Drive Sync] Erro ao inserir transcrição ${fileName}:`, insertErr.message);
          } else {
            importedCount++;
          }
        }
      } catch (fileErr: any) {
        console.error(`[Google Drive Sync] Erro ao processar arquivo ${fileName}:`, fileErr.message);
      }
    }

    // 5. Atualizar timestamp de última sincronização no perfil
    const lastSyncAt = new Date().toISOString();
    await supabase
      .from('profiles')
      .update({ google_drive_last_sync_at: lastSyncAt })
      .eq('id', user.id);

    return NextResponse.json({
      success: true,
      folderName: folderName,
      filesScanned: files.length,
      filesImported: importedCount,
      lastSyncAt
    });

  } catch (err: any) {
    console.error('[Google Drive Sync API Error]:', err.message);
    return NextResponse.json({ error: 'Erro interno durante a sincronização' }, { status: 500 });
  }
}
