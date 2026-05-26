// Interactive View: Fontes de Dados (Data Sources Hub)
// Path: src/app/integrations/page.tsx
// Built under G-Finance World-Class design aesthetics (glassmorphic cards, HSL tailwind color schemes)

'use client';

import React, { useState, useRef } from 'react';
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
  ChevronRight,
  ArrowUpRight
} from 'lucide-react';

// Structure of Mock Operation Log representing simulated syncs
interface OperationLog {
  id: string;
  datetime: string;
  source: 'SMS' | 'Arquivo';
  sourceDetail: string;
  status: 'success' | 'error';
  message: string;
  amountOrRecords: string;
}

export default function DataSources() {
  // Configs
  const webhookUrl = 'https://fplozqwhxryomzndbvwk.supabase.co/functions/v1/sms-webhook';
  
  // State for Webhook URL copy feedback
  const [copied, setCopied] = useState(false);

  // States for interactive Dropzone
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [processingFile, setProcessingFile] = useState(false);
  const [fileProgressMsg, setFileProgressMsg] = useState('');

  // States for general feedback messages
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Mocked dynamic operations log
  const [logs, setLogs] = useState<OperationLog[]>([
    {
      id: 'log-1',
      datetime: '26/05/2026 12:45',
      source: 'SMS',
      sourceDetail: 'Pix Recebido - Itaú (via iOS Shortcuts)',
      status: 'success',
      message: 'Lançamento de crédito processado com sucesso.',
      amountOrRecords: 'R$ 1.250,00'
    },
    {
      id: 'log-2',
      datetime: '26/05/2026 11:20',
      source: 'Arquivo',
      sourceDetail: 'extrato_itaublack_maio.ofx',
      status: 'success',
      message: '14 transações importadas e reconciliadas.',
      amountOrRecords: '14 txs'
    },
    {
      id: 'log-3',
      datetime: '25/05/2026 18:10',
      source: 'SMS',
      sourceDetail: 'Compra Aprovada - Itaú (via iOS Shortcuts)',
      status: 'success',
      message: 'Lançamento de débito processado com sucesso.',
      amountOrRecords: 'R$ 89,90'
    },
    {
      id: 'log-4',
      datetime: '24/05/2026 14:02',
      source: 'Arquivo',
      sourceDetail: 'fatura_maio.csv',
      status: 'error',
      message: 'Falha ao processar cabeçalho do arquivo CSV.',
      amountOrRecords: '0 txs'
    },
    {
      id: 'log-5',
      datetime: '23/05/2026 09:30',
      source: 'SMS',
      sourceDetail: 'Pix Enviado - Itaú (via iOS Shortcuts)',
      status: 'success',
      message: 'Lançamento de débito processado com sucesso.',
      amountOrRecords: 'R$ 350,00'
    }
  ]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Copy webhook URL to clipboard
  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(webhookUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Falha ao copiar a URL:', err);
    }
  };

  // Drag and Drop handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      const extension = file.name.split('.').pop()?.toLowerCase();
      if (extension === 'ofx' || extension === 'csv' || extension === 'pdf') {
        setSelectedFile(file);
        setErrorMsg('');
      } else {
        setErrorMsg('Formato de arquivo inválido. Por favor, envie apenas arquivos .PDF, .OFX ou .CSV.');
        setSelectedFile(null);
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const extension = file.name.split('.').pop()?.toLowerCase();
      if (extension === 'ofx' || extension === 'csv' || extension === 'pdf') {
        setSelectedFile(file);
        setErrorMsg('');
      } else {
        setErrorMsg('Formato de arquivo inválido. Por favor, envie apenas arquivos .PDF, .OFX ou .CSV.');
        setSelectedFile(null);
      }
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  // Clear selected file
  const handleClearFile = () => {
    setSelectedFile(null);
    setFileProgressMsg('');
    setErrorMsg('');
    setSuccessMsg('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Simulate PDF/OFX/CSV upload and parsing
  const handleProcessFile = async () => {
    if (!selectedFile) return;
    setErrorMsg('');
    setSuccessMsg('');
    setProcessingFile(true);
    
    const isPdf = selectedFile.name.toLowerCase().endsWith('.pdf');
    setFileProgressMsg(isPdf ? 'Lendo PDF e executando OCR/extração de texto...' : 'Analisando cabeçalho...');

    // Phase 1 parsing simulation
    setTimeout(() => {
      setFileProgressMsg(isPdf ? 'Analisando tabela de extrato e aplicando regex...' : 'Processando registros e hashes antiduplicidade...');
      
      // Phase 2 insertion simulation
      setTimeout(() => {
        const isSuccess = Math.random() > 0.05; // 95% success rate simulation
        const now = new Date();
        const formattedDate = `${now.getDate().toString().padStart(2, '0')}/${(now.getMonth() + 1).toString().padStart(2, '0')}/${now.getFullYear()} ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
        
        if (isSuccess) {
          const generatedTxs = Math.floor(Math.random() * 18) + 3;
          const newLog: OperationLog = {
            id: `log-${Date.now()}`,
            datetime: formattedDate,
            source: 'Arquivo',
            sourceDetail: selectedFile.name,
            status: 'success',
            message: isPdf ? `${generatedTxs} lançamentos extraídos do PDF do Itaú.` : `${generatedTxs} transações importadas e reconciliadas.`,
            amountOrRecords: `${generatedTxs} txs`
          };
          setLogs(prev => [newLog, ...prev]);
          setSuccessMsg(`Extrato "${selectedFile.name}" processado com sucesso! ${generatedTxs} transações foram identificadas e adicionadas.`);
          setSelectedFile(null);
        } else {
          const newLog: OperationLog = {
            id: `log-${Date.now()}`,
            datetime: formattedDate,
            source: 'Arquivo',
            sourceDetail: selectedFile.name,
            status: 'error',
            message: isPdf ? 'Falha de legibilidade: PDF encriptado ou sem texto extraível.' : 'Falha estrutural: tags do arquivo OFX malformadas.',
            amountOrRecords: '0 txs'
          };
          setLogs(prev => [newLog, ...prev]);
          setErrorMsg(`Erro ao processar o extrato "${selectedFile.name}". Verifique a integridade do arquivo.`);
        }
        setProcessingFile(false);
        setFileProgressMsg('');
      }, 1500);
    }, 1000);
  };

  return (
    <main className="flex-1 overflow-y-auto p-8 no-scrollbar relative h-full bg-slate-950 text-slate-100">
      <div className="max-w-4xl mx-auto space-y-8 animate-in">
        
        {/* Title Hub Header */}
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
            Ingestão Prontificada
          </div>
        </div>

        {/* Status Alerts Banners */}
        {errorMsg && (
          <div className="p-5 bg-red-500/10 border border-red-500/20 text-red-400 rounded-3xl flex items-start gap-3 text-sm animate-in">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-black uppercase tracking-wider text-xs">Instabilidade de Entrada</p>
              <p>{errorMsg}</p>
            </div>
          </div>
        )}

        {successMsg && (
          <div className="p-5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-3xl flex items-start gap-3 text-sm animate-in">
            <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-black uppercase tracking-wider text-xs">Processamento Concluído</p>
              <p>{successMsg}</p>
            </div>
          </div>
        )}

        {/* Main Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column: Automation & Dropzone */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* Bloco 1: Gateway de Captura (SMS Webhook) */}
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

              {/* Description explanation */}
              <p className="text-xs text-slate-400 leading-relaxed mb-6">
                Integre seu dispositivo móvel diretamente ao seu banco de dados. Configure o aplicativo <strong>Atalhos (Shortcuts) do iOS</strong> para ler os SMS do Itaú e encaminhar a mensagem automaticamente como um payload HTTP POST para a URL abaixo.
              </p>

              {/* Webhook endpoint read-only area */}
              <div className="space-y-2 mb-8">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">URL de destino da Edge Function</label>
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

              {/* Automation guidelines */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-white/5">
                <div className="flex gap-3">
                  <div className="p-2 bg-orange-500/10 text-orange-400 rounded-xl shrink-0 h-9 w-9 flex items-center justify-center">
                    <span className="text-xs font-black">01</span>
                  </div>
                  <div>
                    <h5 className="text-xs font-black text-slate-200">Gatilho no Atalhos</h5>
                    <p className="text-[11px] text-slate-400 mt-0.5 leading-normal">
                      Crie uma automação pessoal baseada no recebimento de SMS contendo termos como &quot;itaucard&quot; ou &quot;Pix recebido&quot;.
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="p-2 bg-orange-500/10 text-orange-400 rounded-xl shrink-0 h-9 w-9 flex items-center justify-center">
                    <span className="text-xs font-black">02</span>
                  </div>
                  <div>
                    <h5 className="text-xs font-black text-slate-200">Requisição POST</h5>
                    <p className="text-[11px] text-slate-400 mt-0.5 leading-normal">
                      Adicione uma ação &quot;Obter Conteúdo de URL&quot; enviando o texto do SMS no body no formato JSON.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Bloco 2: Importação Manual (OFX / CSV Dropzone) */}
            <div className="bg-slate-900/60 backdrop-blur-md p-8 rounded-[40px] border border-white/5 shadow-lg">
              <h4 className="font-black text-lg text-white mb-2">Importação de Arquivos</h4>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-6">Processamento manual de extratos bancários</p>

              {/* The Interactive Dropzone Area */}
              <div
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                onClick={!selectedFile && !processingFile ? triggerFileInput : undefined}
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
                    <div className="w-16 h-16 rounded-full bg-slate-900 border border-white/5 flex items-center justify-center text-slate-400 shadow-inner group-hover:scale-105 transition-transform">
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
                          onClick={(e) => {
                            e.stopPropagation();
                            handleClearFile();
                          }}
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

              {/* Informative tips */}
              <div className="mt-6 flex items-start gap-2.5 p-4 bg-orange-500/5 rounded-2xl border border-orange-500/10">
                <HelpCircle className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" />
                <p className="text-[11px] text-slate-400 leading-normal">
                  Os extratos em PDF, OFX ou CSV são processados localmente e criptografados antes de serem persistidos no Supabase. O algoritmo realiza a deduplicação automática baseada na data, valor e descrição da transação.
                </p>
              </div>
            </div>

          </div>

          {/* Right Column: Operation History Log */}
          <div className="space-y-8">
            
            {/* Guidelines box */}
            <div className="bg-gradient-to-br from-slate-900 to-slate-900/40 p-6 rounded-[32px] border border-white/5 shadow-md">
              <h5 className="font-black text-slate-200 text-sm mb-2 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-orange-400" /> Fluxo Descentralizado
              </h5>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Ao abandonar integrações diretas de BaaS, sua privacidade financeira é preservada. G-Finance opera agora sob o modelo <strong>Zero-Trust</strong>, onde você controla exatamente quais transações entram no ecossistema através de arquivos offline ou automações locais do seu celular.
              </p>
            </div>

            {/* Bloco 3: Log de Operações (Histórico de Sync) */}
            <div className="bg-slate-900/60 backdrop-blur-md p-6 rounded-[32px] border border-white/5 shadow-lg">
              <div className="flex justify-between items-center mb-5">
                <h4 className="font-black text-sm text-white flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-orange-500" /> Log de Operações
                </h4>
                <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Filtrado por Recentes</span>
              </div>

              {logs.length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-xs">
                  Nenhum registro de sync localizado no banco.
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
                            <span className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-wider inline-flex items-center gap-1 ${
                              log.source === 'SMS' 
                                ? 'bg-cyan-950 text-cyan-400 border border-cyan-500/10' 
                                : 'bg-emerald-950 text-emerald-400 border border-emerald-500/10'
                            }`}>
                              {log.source}
                            </span>
                            <span className="text-[9px] text-slate-500 block font-bold font-mono">
                              {log.datetime}
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
                          <p className="text-[11px] font-black text-slate-200 truncate" title={log.sourceDetail}>
                            {log.sourceDetail}
                          </p>
                          <p className="text-[10px] text-slate-400 leading-normal">
                            {log.message}
                          </p>
                        </div>

                        <div className="flex justify-between items-center pt-2 border-t border-white/5 text-[10px]">
                          <span className="text-slate-500 font-bold uppercase">Volume</span>
                          <span className="font-bold text-white font-mono">{log.amountOrRecords}</span>
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
