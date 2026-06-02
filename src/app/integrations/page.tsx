// Fontes de Dados — Data Sources Hub
// Path: src/app/integrations/page.tsx

'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Link2,
  Copy,
  Check,
  UploadCloud,
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  FileCode,
  FileSpreadsheet,
  Trash2,
  HelpCircle,
  RefreshCw,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

interface OperationLog {
  id: string;
  created_at: string;
  source_type: string | null;
  file_name: string | null;
  status: string;
  records_synced: number | null;
  records_total: number | null;
  records_duplicate: number | null;
  error_message: string | null;
}

// ---------------------------------------------------------------------------
// Componente principal
// ---------------------------------------------------------------------------

const getSourceBadgeDetails = (sourceType: string | null) => {
  switch (sourceType) {
    case 'sms':
      return { label: 'SMS Gateway', className: 'bg-cyan-950 text-cyan-400 border border-cyan-500/10' };
    case 'pdf_ai':
      return { label: 'IA Fallback', className: 'bg-violet-950 text-violet-400 border border-violet-500/10' };
    case 'sync_sandbox':
      return { label: 'Sandbox', className: 'bg-amber-950 text-amber-400 border border-amber-500/10' };
    case 'sync_mtls':
      return { label: 'mTLS Prod', className: 'bg-emerald-950 text-emerald-400 border border-emerald-500/10' };
    default:
      return { label: sourceType ? sourceType.toUpperCase() : 'Arquivo', className: 'bg-slate-900 text-slate-400 border border-white/5' };
  }
};

export default function DataSources() {
  const [copied, setCopied] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [processingFile, setProcessingFile] = useState(false);
  const [fileProgressMsg, setFileProgressMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [logs, setLogs] = useState<OperationLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(true);
  const [userId, setUserId] = useState<string>('');

  const webhookUrl = userId 
    ? `https://jdliepgseoyoxfygmdet.supabase.co/functions/v1/sms-webhook?user_id=${userId}`
    : 'https://jdliepgseoyoxfygmdet.supabase.co/functions/v1/sms-webhook';

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Direct Itaú Sync States
  const [connectionInfo, setConnectionInfo] = useState<{
    configured: boolean;
    agency: string;
    accountNumber: string;
    lastSyncedAt: string | null;
    mode: string;
    isRealSync: boolean;
  } | null>(null);
  const [syncing, setSyncing] = useState(false);

  // -------------------------------------------------------------------------
  // Carregar logs reais do banco na inicialização
  // -------------------------------------------------------------------------

  const fetchLogs = useCallback(async () => {
    setLogsLoading(true);
    try {
      const { data, error } = await supabase
        .from('itau_sync_logs')
        .select('id, created_at, source_type, file_name, status, records_synced, records_total, records_duplicate, error_message')
        .order('created_at', { ascending: false })
        .limit(20);

      if (!error && data) {
        setLogs(data);
      }
    } finally {
      setLogsLoading(false);
    }
  }, []);

  const fetchConnectionInfo = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.id) {
        setUserId(session.user.id);
      }
      const supabaseToken = session?.access_token;
      const response = await fetch('/api/itau/sync', {
        headers: {
          ...(supabaseToken ? { 'Authorization': `Bearer ${supabaseToken}` } : {})
        }
      });
      if (response.ok) {
        const info = await response.json();
        setConnectionInfo(info);
      }
    } catch (err) {
      console.error('Erro ao carregar dados da conexão Itaú:', err);
    }
  }, []);

  useEffect(() => {
    fetchLogs();
    fetchConnectionInfo();

    // Subscribe to real-time changes on itau_sync_logs
    const channel = supabase
      .channel('itau_sync_logs_changes')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'itau_sync_logs',
        },
        () => {
          fetchLogs();
          fetchConnectionInfo();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchLogs, fetchConnectionInfo]);

  // -------------------------------------------------------------------------
  // Handlers de UI
  // -------------------------------------------------------------------------

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(webhookUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard pode falhar em contextos não-HTTPS
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const validateAndSetFile = (file: File) => {
    const extension = file.name.split('.').pop()?.toLowerCase();
    if (extension === 'ofx' || extension === 'csv' || extension === 'pdf') {
      setSelectedFile(file);
      setErrorMsg('');
    } else {
      setErrorMsg('Formato inválido. Envie apenas arquivos .PDF, .OFX ou .CSV.');
      setSelectedFile(null);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files?.[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const handleClearFile = () => {
    setSelectedFile(null);
    setFileProgressMsg('');
    setErrorMsg('');
    setSuccessMsg('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // -------------------------------------------------------------------------
  // Upload real via /api/itau/upload
  // -------------------------------------------------------------------------

  const handleProcessFile = async () => {
    if (!selectedFile) return;

    setErrorMsg('');
    setSuccessMsg('');
    setProcessingFile(true);

    const isPdf = selectedFile.name.toLowerCase().endsWith('.pdf');
    setFileProgressMsg(isPdf ? 'Extraindo texto do PDF...' : 'Analisando estrutura do arquivo...');

    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      // Pega a sessão ativa client-side para extrair o provider_token e access_token do Supabase
      const { data: { session } } = await supabase.auth.getSession();
      const providerToken = session?.provider_token;
      const supabaseToken = session?.access_token;

      setFileProgressMsg(isPdf ? 'Aplicando parser Itaú e identificando lançamentos...' : 'Processando registros...');

      const response = await fetch('/api/itau/upload', {
        method: 'POST',
        headers: {
          ...(supabaseToken ? { 'Authorization': `Bearer ${supabaseToken}` } : {}),
          ...(providerToken ? { 'x-provider-token': providerToken } : {})
        },
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        setErrorMsg(result.error || 'Erro desconhecido ao processar o arquivo.');
        setProcessingFile(false);
        setFileProgressMsg('');
        return;
      }

      setSuccessMsg(result.message);
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';

      // Recarregar logs do banco para refletir o novo resultado
      await fetchLogs();

    } catch {
      setErrorMsg('Falha de conexão com o servidor. Tente novamente.');
    } finally {
      setProcessingFile(false);
      setFileProgressMsg('');
    }
  };

  const handleDirectSync = async () => {
    setSyncing(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const supabaseToken = session?.access_token;
      const response = await fetch('/api/itau/sync', {
        method: 'POST',
        headers: {
          ...(supabaseToken ? { 'Authorization': `Bearer ${supabaseToken}` } : {})
        }
      });
      const result = await response.json();

      if (!response.ok) {
        setErrorMsg(result.error || 'Erro desconhecido ao sincronizar diretamente.');
      } else {
        const syncMsg = result.syncedRecords > 0
          ? `${result.syncedRecords} lançamento(s) importado(s) com sucesso.`
          : 'Nenhum novo lançamento encontrado.';
        const modeLabel = result.mode === 'mTLS Production' ? 'Produção mTLS' : 'Simulador Sandbox';
        setSuccessMsg(`Sincronização concluída via ${modeLabel}! ${syncMsg}`);
        await fetchConnectionInfo();
        await fetchLogs();
      }
    } catch (err) {
      setErrorMsg('Falha de conexão ao tentar sincronizar diretamente com o Itaú.');
    } finally {
      setSyncing(false);
    }
  };

  // -------------------------------------------------------------------------
  // Formatação de data para exibição
  // -------------------------------------------------------------------------

  const formatLogDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('pt-BR', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  const getLogSourceLabel = (log: OperationLog) => {
    if (log.file_name) return log.file_name;
    if (log.source_type === 'sms') return 'SMS via iOS Shortcuts';
    return 'Lançamento';
  };

  const getLogVolume = (log: OperationLog) => {
    if (log.records_synced != null && log.records_synced > 0) {
      return `${log.records_synced} tx${log.records_synced !== 1 ? 's' : ''}`;
    }
    if (log.records_duplicate != null && log.records_duplicate > 0) {
      return `${log.records_duplicate} dup.`;
    }
    return '0 txs';
  };

  const getLogMessage = (log: OperationLog) => {
    if (log.status === 'failed') return log.error_message || 'Falha no processamento.';
    const parts = [];
    if (log.records_synced) parts.push(`${log.records_synced} importado(s)`);
    if (log.records_duplicate) parts.push(`${log.records_duplicate} duplicata(s)`);
    if (parts.length > 0) return parts.join(', ') + '.';
    return 'Processado com sucesso.';
  };

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <main className="flex-1 overflow-y-auto p-8 no-scrollbar relative h-full bg-slate-950 text-slate-100">
      <div className="max-w-4xl mx-auto space-y-8 animate-in">

        {/* Header */}
        <div className="flex justify-between items-center bg-slate-900/40 backdrop-blur-md p-8 rounded-[32px] border border-white/5 shadow-xl">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-gradient-to-tr from-orange-500 to-amber-500 rounded-3xl flex items-center justify-center text-white shadow-xl shadow-orange-500/10">
              <Link2 className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-xl font-black text-white tracking-tight">Fontes de Dados</h3>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mt-1">
                Integrações de extrato via Webhook e Importação Manual
              </p>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-white/5 border border-white/5 text-[10px] font-black text-slate-300 uppercase tracking-widest">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Ingestão Ativa
          </div>
        </div>

        {/* Alertas */}
        {errorMsg && (
          <div className="p-5 bg-red-500/10 border border-red-500/20 text-red-400 rounded-3xl flex items-start gap-3 text-sm animate-in">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-black uppercase tracking-wider text-xs">Erro de Processamento</p>
              <p>{errorMsg}</p>
            </div>
          </div>
        )}

        {successMsg && (
          <div className="p-5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-3xl flex items-start gap-3 text-sm animate-in">
            <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-black uppercase tracking-wider text-xs">Importação Concluída</p>
              <p>{successMsg}</p>
            </div>
          </div>
        )}

        {/* Grid Principal */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Coluna Esquerda */}
          <div className="lg:col-span-2 space-y-8">

            {/* Bloco 0: Conexão Direta Itaú */}
            <div className="bg-slate-900/60 backdrop-blur-md p-8 rounded-[40px] border border-white/5 shadow-lg relative overflow-hidden">
              <div className="absolute right-0 top-0 w-32 h-32 bg-orange-500/5 rounded-full blur-2xl pointer-events-none"></div>

              <div className="flex justify-between items-start mb-6">
                <div>
                  <h4 className="font-black text-lg text-white">Conexão Bancária Direta (Itaú)</h4>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Integração segura via mTLS / Open Finance</p>
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[9px] font-black text-emerald-400 uppercase tracking-wider">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    Ativa
                  </div>
                  {connectionInfo && (
                    <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md border ${
                      connectionInfo.isRealSync 
                        ? 'bg-emerald-950 text-emerald-400 border-emerald-500/10' 
                        : 'bg-amber-950 text-amber-400 border-amber-500/10'
                    }`}>
                      {connectionInfo.isRealSync ? 'Produção mTLS' : 'Simulador Sandbox'}
                    </span>
                  )}
                </div>
              </div>

              <p className="text-xs text-slate-400 leading-relaxed mb-6">
                Sincronize sua conta Itaú diretamente sem precisar fazer upload manual de arquivos. O canal utiliza chaves de segurança ponta a ponta e chapa mTLS.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-slate-950/40 p-6 rounded-3xl border border-white/5 mb-6">
                <div>
                  <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-1">Dados da Conta</span>
                  <p className="text-xs font-mono font-bold text-slate-200">
                    Agência: {connectionInfo?.agency || '4290'} | Conta: {connectionInfo?.accountNumber || '47209-1'}
                  </p>
                </div>
                <div>
                  <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-1">Última Sincronização</span>
                  <p className="text-xs font-mono font-bold text-slate-200">
                    {connectionInfo?.lastSyncedAt 
                      ? formatLogDate(connectionInfo.lastSyncedAt) 
                      : 'Nunca sincronizado'}
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-4">
                <button
                  onClick={handleDirectSync}
                  disabled={syncing}
                  className="w-full sm:w-auto px-8 py-3.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white text-xs font-black rounded-2xl uppercase tracking-widest shadow-xl shadow-orange-500/20 transition-all duration-300 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 active:scale-95 shrink-0"
                >
                  {syncing ? (
                    <>
                      <div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-white border-t-transparent"></div>
                      <span>Sincronizando...</span>
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Sincronizar Agora</span>
                    </>
                  )}
                </button>
                <div className="text-[10px] text-slate-500 leading-normal sm:text-left text-center">
                  O sistema de reconciliação ajusta automaticamente saldos e despesas assim que novos lançamentos entram no banco.
                </div>
              </div>
            </div>

            {/* Bloco 1: SMS Webhook */}
            <div className="bg-slate-900/60 backdrop-blur-md p-8 rounded-[40px] border border-white/5 shadow-lg relative overflow-hidden">
              <div className="absolute right-0 top-0 w-32 h-32 bg-orange-500/5 rounded-full blur-2xl pointer-events-none"></div>

              <div className="flex justify-between items-start mb-6">
                <div>
                  <h4 className="font-black text-lg text-white">Gateway de Captura (SMS)</h4>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Automação via Edge Function do Supabase</p>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/20 text-[9px] font-black text-orange-400 uppercase tracking-wider">
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse"></span>
                  Aguardando payload...
                </div>
              </div>

              <p className="text-xs text-slate-400 leading-relaxed mb-6">
                Configure o <strong>Atalhos (Shortcuts) do iOS</strong> para capturar os SMS do Itaú e encaminhar automaticamente como payload HTTP POST para a URL personalizada abaixo.
              </p>

              <div className="space-y-2 mb-8">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Sua URL do Webhook (Contém seu Token/User ID)</label>
                <div className="flex gap-2">
                  <div className="flex-1 min-w-0 bg-slate-950 border border-white/5 rounded-2xl px-4 py-3.5 flex items-center">
                    <input
                      type="text"
                      readOnly
                      value={webhookUrl}
                      className="w-full bg-transparent text-xs font-mono text-slate-300 focus:outline-none select-all"
                    />
                  </div>
                  <button
                    onClick={handleCopyUrl}
                    className="px-5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white rounded-2xl transition-all duration-300 shadow-lg shadow-orange-500/10 cursor-pointer flex items-center justify-center gap-2 shrink-0 group active:scale-95"
                    title="Copiar URL"
                  >
                    {copied ? (
                      <>
                        <Check className="w-4 h-4 text-white animate-bounce" />
                        <span className="text-xs font-black uppercase tracking-wider hidden sm:inline">Copiado</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4 group-hover:scale-110 transition-transform" />
                        <span className="text-xs font-black uppercase tracking-wider hidden sm:inline">Copiar URL</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-white/5 mb-6">
                <div className="flex gap-3">
                  <div className="p-2 bg-orange-500/10 text-orange-400 rounded-xl shrink-0 h-9 w-9 flex items-center justify-center">
                    <span className="text-xs font-black">01</span>
                  </div>
                  <div>
                    <h5 className="text-xs font-black text-slate-200">Gatilho no Atalhos</h5>
                    <p className="text-[11px] text-slate-400 mt-0.5 leading-normal">
                      Crie uma automação pessoal no iOS para disparar "Ao receber mensagem de 290-40".
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="p-2 bg-orange-500/10 text-orange-400 rounded-xl shrink-0 h-9 w-9 flex items-center justify-center">
                    <span className="text-xs font-black">02</span>
                  </div>
                  <div>
                    <h5 className="text-xs font-black text-slate-200">Ação de Envio (POST)</h5>
                    <p className="text-[11px] text-slate-400 mt-0.5 leading-normal">
                      Use &quot;Obter Conteúdo de URL&quot;, clique em &quot;&gt;&quot;, configure como <strong>POST</strong>, e no corpo envie o <strong>Texto do Atalho (Mensagem)</strong>.
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-white/5 space-y-4">
                <div>
                  <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-2">Método Recomendado (Texto Puro)</span>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Basta colar a URL copiada acima e enviar o texto bruto do SMS como o corpo da requisição POST (Request Body: File/Text). A Edge Function identifica seu usuário pela URL e faz o parse do texto automaticamente.
                  </p>
                </div>
                
                <div className="space-y-2">
                  <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block">Método Alternativo (Payload JSON)</span>
                  <div className="relative">
                    <pre className="text-[10px] font-mono text-emerald-400 select-all overflow-x-auto whitespace-pre bg-slate-950 p-4 rounded-2xl border border-white/5 leading-relaxed">
{`{
  "texto_sms": "Itaucard: compra aprovada no MASTER BLACK... R$ 100,00"
}`}
                    </pre>
                  </div>
                  <p className="text-[10px] text-slate-500 leading-normal">
                    Se preferir enviar JSON, use o formato acima. O cabeçalho <code className="text-slate-400 font-mono">Content-Type</code> deve ser <code className="text-slate-400 font-mono">application/json</code>.
                  </p>
                </div>
              </div>
            </div>

            {/* Bloco 2: Upload de Arquivo */}
            <div className="bg-slate-900/60 backdrop-blur-md p-8 rounded-[40px] border border-white/5 shadow-lg">
              <h4 className="font-black text-lg text-white mb-2">Importação de Arquivos</h4>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-6">Processamento de extratos bancários</p>

              <div
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                onClick={!selectedFile && !processingFile ? () => fileInputRef.current?.click() : undefined}
                className={`relative border-2 border-dashed rounded-[32px] p-10 flex flex-col items-center justify-center gap-4 transition-all duration-300 ${
                  selectedFile
                    ? 'border-emerald-500/30 bg-emerald-500/5 cursor-default'
                    : dragActive
                      ? 'border-orange-500 bg-orange-500/5 scale-[0.99] cursor-pointer'
                      : 'border-slate-800 hover:border-orange-500/40 hover:bg-slate-900/80 bg-slate-950/40 cursor-pointer'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.ofx,.csv"
                  onChange={handleFileChange}
                  className="hidden"
                  disabled={processingFile}
                />

                {!selectedFile ? (
                  <>
                    <div className="w-16 h-16 rounded-full bg-slate-900 border border-white/5 flex items-center justify-center text-slate-400 shadow-inner">
                      <UploadCloud className={`w-8 h-8 ${dragActive ? 'text-orange-500 animate-bounce' : 'text-slate-400'}`} />
                    </div>
                    <div className="text-center space-y-1">
                      <p className="text-sm font-black text-slate-200">
                        {dragActive ? 'Solte o arquivo para carregar' : 'Arraste seu extrato PDF do Itaú aqui ou clique para buscar'}
                      </p>
                      <p className="text-xs text-slate-500">
                        Suporta formatos padronizados de extrato Itaú (.PDF, .OFX ou .CSV)
                      </p>
                    </div>
                  </>
                ) : (
                  <div className="w-full flex flex-col items-center gap-6">
                    <div className="flex items-center gap-4 bg-slate-950 p-4 rounded-2xl border border-white/5 w-full max-w-md">
                      <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl">
                        {selectedFile.name.toLowerCase().endsWith('.pdf') ? (
                          <FileText className="w-6 h-6" />
                        ) : selectedFile.name.toLowerCase().endsWith('.ofx') ? (
                          <FileCode className="w-6 h-6" />
                        ) : (
                          <FileSpreadsheet className="w-6 h-6" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-black text-slate-200 truncate">{selectedFile.name}</p>
                        <p className="text-[10px] text-slate-500 font-bold uppercase mt-0.5">
                          {(selectedFile.size / 1024).toFixed(1)} KB | Extrato Bancário
                        </p>
                      </div>
                      {!processingFile && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleClearFile(); }}
                          className="p-2 hover:bg-white/5 text-slate-400 hover:text-red-400 rounded-xl transition-colors cursor-pointer"
                          title="Remover arquivo"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    {processingFile ? (
                      <div className="flex flex-col items-center gap-3">
                        <div className="animate-spin rounded-full h-8 w-8 border-2 border-orange-500 border-t-transparent"></div>
                        <p className="text-[11px] font-bold uppercase text-orange-400 tracking-wider animate-pulse">
                          {fileProgressMsg}
                        </p>
                      </div>
                    ) : (
                      <div className="flex gap-3 justify-center w-full max-w-md">
                        <button
                          onClick={handleClearFile}
                          className="flex-1 py-3 border border-white/5 hover:bg-white/5 text-slate-300 text-xs font-black rounded-xl uppercase tracking-widest transition-all cursor-pointer active:scale-95 text-center"
                        >
                          Cancelar
                        </button>
                        <button
                          onClick={handleProcessFile}
                          className="flex-1 py-3 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white text-xs font-black rounded-xl uppercase tracking-widest shadow-xl shadow-orange-500/20 transition-all duration-300 cursor-pointer active:scale-95 text-center"
                        >
                          Processar Extrato
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="mt-6 flex items-start gap-2.5 p-4 bg-orange-500/5 rounded-2xl border border-orange-500/10">
                <HelpCircle className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" />
                <p className="text-[11px] text-slate-400 leading-normal">
                  Os extratos são processados diretamente no servidor e persistidos no Supabase. A deduplicação automática por SHA-256 garante que lançamentos já importados não sejam duplicados.
                </p>
              </div>
            </div>
          </div>

          {/* Coluna Direita */}
          <div className="space-y-8">

            {/* Informativo Zero-Trust */}
            <div className="bg-gradient-to-br from-slate-900 to-slate-900/40 p-6 rounded-[32px] border border-white/5 shadow-md">
              <h5 className="font-black text-slate-200 text-sm mb-2 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-orange-400" /> Modelo Zero-Trust
              </h5>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                G-Finance opera sob controle total do proprietário. Você decide exatamente quais transações entram no ecossistema — via arquivos offline ou automações locais do celular.
              </p>
            </div>

            {/* Log de Operações — dados reais */}
            <div className="bg-slate-900/60 backdrop-blur-md p-6 rounded-[32px] border border-white/5 shadow-lg">
              <div className="flex justify-between items-center mb-5">
                <h4 className="font-black text-sm text-white flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-orange-500" /> Log de Operações
                </h4>
                <button
                  onClick={fetchLogs}
                  disabled={logsLoading}
                  className="p-1.5 rounded-lg hover:bg-white/5 text-slate-500 hover:text-slate-300 transition-colors cursor-pointer disabled:opacity-40"
                  title="Atualizar logs"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${logsLoading ? 'animate-spin' : ''}`} />
                </button>
              </div>

              {logsLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="p-4 bg-slate-950/60 border border-white/5 rounded-2xl animate-pulse">
                      <div className="h-3 bg-slate-800 rounded w-3/4 mb-2"></div>
                      <div className="h-2 bg-slate-800/60 rounded w-1/2"></div>
                    </div>
                  ))}
                </div>
              ) : logs.length === 0 ? (
                <div className="text-center py-10 px-6 rounded-2xl border border-dashed border-white/5 bg-slate-950/20 space-y-3">
                  <HelpCircle className="w-8 h-8 text-slate-600 dark:text-slate-500 mx-auto stroke-[1.5]" />
                  <div className="space-y-1">
                    <p className="text-slate-400 text-xs font-black uppercase tracking-wider">Aguardando Lançamentos</p>
                    <p className="text-slate-500 text-[11px] leading-relaxed max-w-[240px] mx-auto">
                      Sua linha do tempo de sincronização está vazia. Importe um arquivo ou conecte sua conta para começar.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3.5">
                  {logs.map((log) => {
                    const isSuccess = log.status === 'success';
                    return (
                      <div
                        key={log.id}
                        className="p-4 bg-slate-950/60 border border-white/5 rounded-2xl space-y-3 hover:border-white/10 transition-colors"
                      >
                        <div className="flex justify-between items-start">
                          <div className="space-y-0.5">
                            {(() => {
                              const badge = getSourceBadgeDetails(log.source_type);
                              return (
                                <span className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-wider inline-flex items-center gap-1 ${badge.className}`}>
                                  {badge.label}
                                </span>
                              );
                            })()}
                            <span className="text-[9px] text-slate-500 block font-bold font-mono pt-1">
                              {formatLogDate(log.created_at)}
                            </span>
                          </div>
                          <span className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-wider ${
                            isSuccess
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/10'
                              : 'bg-red-500/10 text-red-400 border border-red-500/10'
                          }`}>
                            {isSuccess ? 'Sucesso' : 'Falha'}
                          </span>
                        </div>

                        <div className="space-y-1">
                          <p className="text-[11px] font-black text-slate-200 truncate" title={getLogSourceLabel(log)}>
                            {getLogSourceLabel(log)}
                          </p>
                          <p className="text-[10px] text-slate-400 leading-normal">
                            {getLogMessage(log)}
                          </p>
                        </div>

                        <div className="flex justify-between items-center pt-2 border-t border-white/5 text-[10px]">
                          <span className="text-slate-500 font-bold uppercase">Volume</span>
                          <span className="font-bold text-white font-mono">{getLogVolume(log)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
    </main>
  );
}
