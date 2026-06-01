'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Sparkles, 
  UploadCloud, 
  Trash2, 
  Check, 
  TrendingDown, 
  TrendingUp, 
  Send, 
  Bot, 
  User, 
  FileText,
  AlertCircle,
  HelpCircle,
  FolderMinus,
  CheckCircle,
  Calculator,
  Shuffle,
  Plus,
  MessageSquare,
  History,
  Brain,
  Layers
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { reconcileBalances } from '@/lib/reconcile';

// Ícones correspondentes para cada categoria
import { 
  ShoppingCart, // Alimentação
  Wallet, // Salário, Transferências
  CreditCard, // Cartão
  Zap, // Utilidades
  Car, // Transporte
  Tv, // Assinaturas
  FileText as FileIcon, // Boleto
  Activity, // Rendimentos, Outros
  Heart // Saúde
} from 'lucide-react';

const categoryIcons: { [key: string]: React.ComponentType<any> } = {
  'Alimentação': ShoppingCart,
  'Salário': Wallet,
  'Cartão': CreditCard,
  'Utilidades': Zap,
  'Transporte': Car,
  'Assinaturas': Tv,
  'Boleto': FileIcon,
  'Rendimentos': Activity,
  'Transferência': Wallet,
  'Saúde': Heart,
  'Saldo': Calculator,
  'Outros': Activity
};

interface StagedTransaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  category: string;
  isBalance?: boolean;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  parts: { text: string }[];
  isCompacted?: boolean;
}

const formatMessageText = (text: string): string => {
  if (!text) return '';
  return text.replace(/\*\*/g, '');
};

export default function GeminiBrainPage() {
  const [activeTab, setActiveTab] = useState<'importer' | 'chat'>('importer');
  
  // Importer State
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState('');
  const [stagedTransactions, setStagedTransactions] = useState<StagedTransaction[]>([]);
  const [importing, setImporting] = useState(false);
  const [importSuccess, setImportSuccess] = useState(false);
  const [importStats, setImportStats] = useState({ total: 0, income: 0, expense: 0 });

  // Mismatch & Sync States
  const [mismatchDetected, setMismatchDetected] = useState(false);
  const [targetBalance, setTargetBalance] = useState(0);
  const [currentTotal, setCurrentTotal] = useState(0);
  const [initialBalanceDiff, setInitialBalanceDiff] = useState(0);
  const [oldInitialBalance, setOldInitialBalance] = useState(0);
  const [syncingInitialBalance, setSyncingInitialBalance] = useState(false);

  // Chat State
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Persistent Chat Sessions and Memory State
  const [chatSessions, setChatSessions] = useState<{ id: string; title: string; created_at: string }[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [compacting, setCompacting] = useState(false);
  const [aiMemory, setAiMemory] = useState<string>('');
  const [showMemoryModal, setShowMemoryModal] = useState(false);

  // Auth Info
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setUserId(user.id);
    };
    fetchUser();
  }, []);

  // Auto-scroll chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, chatLoading]);

  // Carregar sessões de chat do banco de dados
  const fetchChatSessions = async () => {
    setLoadingSessions(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const response = await fetch('/api/ai/sessions', {
        headers: {
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      });
      if (response.ok) {
        const data = await response.json();
        setChatSessions(data.sessions || []);
        // Seleciona a primeira sessão se nenhuma estiver ativa
        if (data.sessions && data.sessions.length > 0 && !activeSessionId) {
          handleSelectSession(data.sessions[0].id);
        }
      }
    } catch (err) {
      console.error('Erro ao carregar sessões:', err);
    } finally {
      setLoadingSessions(false);
    }
  };

  // Carregar mensagens de uma sessão específica
  const fetchSessionMessages = async (sid: string) => {
    setChatLoading(true);
    setChatError('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const response = await fetch(`/api/ai/sessions/${sid}`, {
        headers: {
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      });
      if (response.ok) {
        const data = await response.json();
        const formatted = (data.messages || []).map((m: any) => ({
          id: m.id,
          role: m.role,
          parts: [{ text: m.content }],
          isCompacted: !!m.is_compacted
        }));
        setChatMessages(formatted);
        setActiveSessionId(sid);
      } else {
        setChatError('Falha ao carregar mensagens desta conversa.');
      }
    } catch (err) {
      setChatError('Erro de conexão ao carregar conversa.');
    } finally {
      setChatLoading(false);
    }
  };

  // Buscar memória global do usuário
  const fetchUserMemory = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('ai_memory')
          .eq('id', user.id)
          .single();
        setAiMemory(profile?.ai_memory || '');
      }
    } catch (err) {
      console.error('Erro ao carregar memória global:', err);
    }
  };

  // Switch de sessão ativa
  const handleSelectSession = (sid: string) => {
    setActiveSessionId(sid);
    fetchSessionMessages(sid);
  };

  // Iniciar nova conversa (POST /api/ai/sessions)
  const handleNewConversation = async () => {
    setChatLoading(true);
    setChatError('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const response = await fetch('/api/ai/sessions', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ title: 'Nova Conversa' })
      });
      if (response.ok) {
        const data = await response.json();
        setChatSessions(prev => [data.session, ...prev]);
        setActiveSessionId(data.session.id);
        setChatMessages([]);
      } else {
        setChatError('Erro ao instanciar nova conversa.');
      }
    } catch {
      setChatError('Falha de conexão.');
    } finally {
      setChatLoading(false);
    }
  };

  // Excluir conversa permanentemente
  const handleDeleteSession = async (sid: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Deseja excluir esta conversa permanentemente?')) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const response = await fetch(`/api/ai/sessions/${sid}`, {
        method: 'DELETE',
        headers: {
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      });
      if (response.ok) {
        setChatSessions(prev => prev.filter(s => s.id !== sid));
        if (activeSessionId === sid) {
          setChatMessages([]);
          setActiveSessionId(null);
        }
      }
    } catch {
      console.error('Erro ao excluir conversa.');
    }
  };

  // Forçar compactação manual (/compact)
  const handleCompactSession = async () => {
    if (!activeSessionId || chatLoading || compacting) return;
    setCompacting(true);
    setChatError('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          message: '/compact',
          sessionId: activeSessionId
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Erro ao rodar compactação.');
      }

      // Recarrega mensagens e a memória do usuário
      await fetchUserMemory();
      await fetchSessionMessages(activeSessionId);
    } catch (err: any) {
      setChatError(err.message || 'Falha ao compactar sessão.');
    } finally {
      setCompacting(false);
    }
  };

  // Efeito para carregar as sessões e a memória perene do usuário ao alternar para o chat
  useEffect(() => {
    if (activeTab === 'chat') {
      fetchChatSessions();
      fetchUserMemory();
    }
  }, [activeTab]);

  // Importer Drag & Drop Handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      await processFile(e.target.files[0]);
    }
  };

  // Enviar extrato ao backend Route Handler
  const processFile = async (file: File) => {
    setUploading(true);
    setUploadError('');
    setImportSuccess(false);

    // Mock de animação de progresso para a IA
    const interval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 90) {
          clearInterval(interval);
          return 90;
        }
        return prev + 10;
      });
    }, 150);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/ai/parse-statement', {
        method: 'POST',
        headers: {
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: formData,
      });

      const data = await response.json();

      clearInterval(interval);
      setUploadProgress(100);

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao processar arquivo.');
      }

      // Atribui ID local único para permitir edições na fila
      const parsedTransactions = (data.transactions || []).map((t: any, idx: number) => ({
        id: `staged-${Date.now()}-${idx}`,
        date: t.date || new Date().toISOString().split('T')[0],
        description: t.description || 'Transação sem descrição',
        amount: Number(t.amount) || 0,
        category: t.category || 'Outros',
        isBalance: !!t.isBalance
      }));

      setStagedTransactions(parsedTransactions);
    } catch (err: any) {
      console.error(err);
      setUploadError(err.message || 'Falha técnica ao extrair dados do extrato bancário.');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  // Modificar campo na Fila de Staging
  const handleStagedChange = (id: string, field: keyof StagedTransaction, value: any) => {
    setStagedTransactions((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          if (field === 'amount') {
            return { ...item, amount: parseFloat(value) || 0 };
          }
          return { ...item, [field]: value };
        }
        return item;
      })
    );
  };

  // Excluir item individual da Fila de Staging
  const handleRemoveStaged = (id: string) => {
    setStagedTransactions((prev) => prev.filter((item) => item.id !== id));
  };

  // Confirmar e Salvar no Supabase (Batch Insert + Reconcile)
  const handleConfirmImport = async () => {
    if (!userId || stagedTransactions.length === 0) return;
    setImporting(true);
    setUploadError('');

    try {
      // Filtrar lançamentos de saldo para não poluir o livro-caixa/ledger
      const transactionsToInsert = stagedTransactions.filter(item => !item.isBalance);

      const recordsToInsert = transactionsToInsert.map((item) => ({
        user_id: userId,
        description: item.description,
        amount: item.amount,
        category: item.category,
        date: new Date(item.date).toISOString(),
        icon: item.amount > 0 ? 'ArrowDownLeft' : 'CreditCard' // Ícone genérico de fluxo
      }));

      if (recordsToInsert.length > 0) {
        // 1. Bulk insert no Supabase
        const { error: insertError } = await supabase
          .from('transactions')
          .insert(recordsToInsert);

        if (insertError) throw insertError;
      }

      // 2. Chamar utilitário de reconciliação de saldos
      const reconcileResult = await reconcileBalances(supabase, userId);

      if (!reconcileResult.success) {
        throw new Error(reconcileResult.error || 'Erro ao recalcular os saldos da central.');
      }

      // Check if there was any balance snapshot parsed in stagedTransactions
      const balanceRows = stagedTransactions.filter(item => item.isBalance);
      // Sort deterministicamente por data decrescente (saldo mais recente primeiro)
      const latestBalanceRow = balanceRows.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
      
      if (latestBalanceRow) {
        const parsedTarget = latestBalanceRow.amount;
        
        // Fetch current profile to get old initial_balance
        const { data: profile } = await supabase
          .from('profiles')
          .select('initial_balance')
          .eq('id', userId)
          .single();
          
        const oldInit = Number(profile?.initial_balance) || 0;
        const currentCalcTotal = reconcileResult.data?.total || 0;
        
        if (Math.abs(currentCalcTotal - parsedTarget) > 0.01) {
          const diff = parsedTarget - currentCalcTotal;
          setMismatchDetected(true);
          setTargetBalance(parsedTarget);
          setCurrentTotal(currentCalcTotal);
          setInitialBalanceDiff(diff);
          setOldInitialBalance(oldInit);
        } else {
          setMismatchDetected(false);
        }
      } else {
        setMismatchDetected(false);
      }

      // Salvar estatísticas para o modal de sucesso (excluindo os saldos diários do montante acumulado)
      let totalIncome = 0;
      let totalExpense = 0;
      transactionsToInsert.forEach(t => {
        if (t.amount > 0) totalIncome += t.amount;
        else totalExpense += Math.abs(t.amount);
      });

      setImportStats({
        total: transactionsToInsert.length,
        income: totalIncome,
        expense: totalExpense
      });

      setStagedTransactions([]);
      setImportSuccess(true);
    } catch (err: any) {
      console.error(err);
      setUploadError(err.message || 'Erro crítico ao conciliar transações.');
    } finally {
      setImporting(false);
    }
  };

  // Ajustar e Sincronizar o Saldo Inicial de partida
  const handleSyncInitialBalance = async () => {
    if (!userId || !mismatchDetected) return;
    setSyncingInitialBalance(true);
    setUploadError('');
    try {
      const newInitBalance = oldInitialBalance + initialBalanceDiff;
      
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ initial_balance: newInitBalance })
        .eq('id', userId);
        
      if (updateError) throw updateError;
      
      // Re-reconcile
      const reconcileResult = await reconcileBalances(supabase, userId);
      if (!reconcileResult.success) throw new Error(reconcileResult.error);
      
      setMismatchDetected(false);
      setCurrentTotal(reconcileResult.data?.total || 0);
    } catch (err: any) {
      console.error(err);
      setUploadError(err.message || 'Falha ao sincronizar o saldo inicial.');
    } finally {
      setSyncingInitialBalance(false);
    }
  };

  // Enviar Mensagem no Chat Conversacional
  const handleSendChatMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputMessage.trim() || chatLoading || compacting) return;

    setChatError('');
    const userQuery = inputMessage.trim();
    setInputMessage('');
    setChatLoading(true);

    const userMessage: ChatMessage = {
      id: `chat-temp-${Date.now()}-user`,
      role: 'user',
      parts: [{ text: userQuery }]
    };

    setChatMessages((prev) => [...prev, userMessage]);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      // Executa chamada para a rota de chat com a sessão atual
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          message: userQuery,
          sessionId: activeSessionId // Envia o id da sessão ativa se houver
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro de conexão.');
      }

      // Se a resposta retornou uma nova sessão (ex: primeiro prompt), atualizamos a UI
      const hasNewSession = data.sessionId && data.sessionId !== activeSessionId;
      const targetSessionId = data.sessionId || activeSessionId;

      if (hasNewSession) {
        setActiveSessionId(data.sessionId);
        await fetchChatSessions(); // Recarrega sessões para exibir o título correto
      }

      const modelMessage: ChatMessage = {
        id: `chat-temp-${Date.now()}-model`,
        role: 'model',
        parts: [{ text: data.response }]
      };

      setChatMessages((prev) => {
        // Remove mensagens temporárias e adiciona a real retornada
        const filtered = prev.filter(m => !m.id.startsWith('chat-temp-'));
        return [...filtered, userMessage, modelMessage];
      });

      // Recarrega memória global e mensagens caso tenha havido compactação (manual ou automática)
      if (data.compacted || data.autoCompacted) {
        await fetchUserMemory();
        if (targetSessionId) {
          await fetchSessionMessages(targetSessionId); // recarrega histórico compactado
        }
      }

    } catch (err: any) {
      console.error(err);
      setChatError(err.message || 'O Gemini Brain encontrou uma instabilidade ao responder.');
      // Remove mensagens temporárias em caso de erro
      setChatMessages((prev) => prev.filter(m => !m.id.startsWith('chat-temp-')));
    } finally {
      setChatLoading(false);
    }
  };

  // Cálculos consolidados locais na Fila de Staging (excluindo saldos estáticos)
  const totalStagedIncome = stagedTransactions
    .filter((t) => !t.isBalance && t.amount > 0)
    .reduce((sum, t) => sum + t.amount, 0);

  const totalStagedExpense = stagedTransactions
    .filter((t) => !t.isBalance && t.amount < 0)
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);

  return (
    <div className="flex-1 flex flex-col overflow-hidden relative h-full bg-slate-950 text-slate-100">
      {/* Immersive backing grid */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(16,185,129,0.08),rgba(255,255,255,0))] pointer-events-none z-0"></div>

      {/* Main Header Container */}
      <header className="border-b border-white/5 bg-slate-900/40 backdrop-blur-md px-8 py-6 flex items-center justify-between z-10 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-emerald-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
            <Sparkles className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h1 className="text-lg font-black tracking-tight uppercase">Central Gemini Brain</h1>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
              Inteligência Artificial & Conciliação em Lote
            </p>
          </div>
        </div>

        {/* Custom Premium Tabs Switcher */}
        <div className="flex bg-slate-900 border border-white/5 p-1 rounded-xl shadow-inner">
          <button
            onClick={() => setActiveTab('importer')}
            className={`px-5 py-2.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'importer'
                ? 'bg-emerald-500 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <UploadCloud className="w-4 h-4" /> Importador Extratos
          </button>
          <button
            onClick={() => setActiveTab('chat')}
            className={`px-5 py-2.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'chat'
                ? 'bg-emerald-500 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Bot className="w-4 h-4" /> Chat Consultivo
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden relative z-0 flex flex-col">
        {/* Tab 1: Importer Section */}
        {activeTab === 'importer' && (
          <div className="flex-1 flex flex-col md:flex-row overflow-hidden p-8 gap-8 animate-in">
            {/* Left Upload Form Panel */}
            <div className="w-full md:w-96 flex flex-col gap-6 shrink-0 overflow-y-auto no-scrollbar">
              {/* Premium Drag and Drop Card */}
              <div 
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                className={`glass border-2 border-dashed rounded-[32px] p-8 flex flex-col items-center justify-center text-center transition-all min-h-[300px] relative ${
                  dragActive 
                    ? 'border-emerald-500 bg-emerald-500/5' 
                    : 'border-white/10 bg-slate-900/40 hover:border-white/20'
                }`}
              >
                <input 
                  type="file" 
                  id="statement-upload" 
                  accept=".pdf,.png,.jpg,.jpeg" 
                  onChange={handleFileChange}
                  className="hidden" 
                />
                
                {uploading ? (
                  <div className="space-y-4 w-full px-4">
                    <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 mx-auto animate-bounce">
                      <Sparkles className="w-8 h-8" />
                    </div>
                    <div>
                      <p className="text-sm font-black uppercase tracking-wider">Lendo com Gemini 3.5 Flash</p>
                      <p className="text-[10px] text-slate-400 uppercase tracking-widest mt-1">Extraindo lançamentos estruturados...</p>
                    </div>
                    {/* Simulated elegant progress bar */}
                    <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                      <div 
                        className="bg-emerald-500 h-full transition-all duration-300 rounded-full"
                        style={{ width: `${uploadProgress}%` }}
                      ></div>
                    </div>
                  </div>
                ) : (
                  <label 
                    htmlFor="statement-upload" 
                    className="cursor-pointer space-y-6 flex flex-col items-center group w-full"
                  >
                    <div className="w-16 h-16 rounded-2xl bg-slate-800 border border-white/5 flex items-center justify-center text-slate-400 group-hover:bg-emerald-500 group-hover:text-white transition-all shadow-md">
                      <UploadCloud className="w-8 h-8" />
                    </div>
                    <div>
                      <p className="text-sm font-black uppercase tracking-wider">Arraste seu extrato bancário</p>
                      <p className="text-xs text-slate-400 mt-2">PDF, PNG ou JPEG de qualquer banco</p>
                    </div>
                    <div className="px-5 py-3 bg-white/5 hover:bg-white/10 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all border border-white/5 shadow-sm">
                      Selecionar Arquivo
                    </div>
                  </label>
                )}
              </div>

              {/* Informative Curation Box */}
              <div className="glass bg-slate-900/40 rounded-[28px] border border-white/5 p-6 space-y-4">
                <h3 className="text-xs font-black uppercase tracking-widest flex items-center gap-2 text-emerald-400">
                  <Calculator className="w-4 h-4" /> Instruções de Importação
                </h3>
                <ul className="text-xs space-y-3 text-slate-400">
                  <li className="flex gap-2">
                    <span className="text-emerald-500">✓</span>
                    <span>Gemini processa extratos complexos de forma nativa e agrupa datas e valores.</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-emerald-500">✓</span>
                    <span>Tanto despesas comuns como faturas e transferências Pix são extraídas instantaneamente.</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-emerald-500">✓</span>
                    <span>Edite categorias ou delete qualquer lançamento fantasma antes de persistir fisicamente.</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Right Interactive Staging Queue */}
            <div className="flex-1 flex flex-col overflow-hidden glass rounded-[36px] border border-white/5 bg-slate-900/20">
              {/* Alert Message Cards */}
              {uploadError && (
                <div className="p-5 border-b border-red-500/20 bg-red-500/5 text-red-400 flex items-start gap-3 text-sm animate-in">
                  <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-black uppercase text-xs tracking-wider">Falha na análise</p>
                    <p className="text-xs opacity-80 mt-1">{uploadError}</p>
                  </div>
                </div>
              )}

              {importSuccess && (
                <div className="flex flex-col animate-in">
                  <div className="p-8 border-b border-emerald-500/20 bg-emerald-500/5 text-emerald-400 flex flex-col items-center text-center gap-4">
                    <div className="w-12 h-12 bg-emerald-500 rounded-full flex items-center justify-center text-white shadow-xl shadow-emerald-500/30">
                      <CheckCircle className="w-7 h-7" />
                    </div>
                    <div>
                      <h3 className="font-black uppercase text-sm tracking-wider">Conciliação Concluída com Sucesso!</h3>
                      <p className="text-xs text-slate-400 mt-2 max-w-md">
                        Foram salvas **{importStats.total} transações** (Receitas: {importStats.income.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} | Despesas: {importStats.expense.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}). Os saldos globais e cashflow foram atualizados em tempo real.
                      </p>
                    </div>
                  </div>

                  {mismatchDetected && (
                    <div className="p-8 border-b border-white/5 bg-white/[0.02] text-slate-100 flex flex-col gap-6 items-center text-center animate-in duration-500">
                      <div className="space-y-2">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800 border border-white/5 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                          💡 Sincronização Inteligente
                        </div>
                        <h4 className="font-black text-sm text-slate-200 mt-2">Diferença de Saldo Detectada</h4>
                        <p className="text-xs text-slate-400 max-w-lg leading-relaxed">
                          O saldo final do seu extrato bancário é de <span className="font-bold text-white">{targetBalance.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>, mas o saldo atualizado no G-Finance é de <span className="font-bold text-white">{currentTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>.
                        </p>
                        <p className="text-xs text-slate-500 max-w-md">
                          Isso ocorre porque seu saldo inicial de partida era de <span className="font-bold text-slate-400">{oldInitialBalance.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span> antes desse extrato. Deseja ajustar automaticamente seu saldo inicial para <span className="font-bold text-emerald-400">{(oldInitialBalance + initialBalanceDiff).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>?
                        </p>
                      </div>

                      <button
                        onClick={handleSyncInitialBalance}
                        disabled={syncingInitialBalance}
                        className="px-8 py-3.5 bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] font-black rounded-2xl uppercase tracking-widest transition-all cursor-pointer shadow-lg shadow-emerald-500/10 disabled:opacity-50 inline-flex items-center gap-2"
                      >
                        {syncingInitialBalance ? (
                          <>
                            <div className="animate-spin rounded-full h-3.5 w-3.5 border-t-2 border-b-2 border-white"></div>
                            Sincronizando...
                          </>
                        ) : (
                          <>
                            Ajustar Saldo Inicial de Partida (R$ {initialBalanceDiff > 0 ? '+' : ''}{initialBalanceDiff.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {stagedTransactions.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center text-slate-400 p-8">
                  <FolderMinus className="w-16 h-16 text-slate-600 mb-6 stroke-[1.5]" />
                  <p className="text-sm font-black uppercase tracking-wider">Fila de Revisão Vazia</p>
                  <p className="text-xs text-slate-500 mt-2 max-w-sm">
                    Faça upload de um arquivo na área ao lado para ler o extrato e popular esta tabela para conciliação.
                  </p>
                </div>
              ) : (
                <div className="flex-1 flex flex-col overflow-hidden">
                  {/* Summary & Import Actions Header */}
                  <div className="p-6 border-b border-white/5 flex flex-col sm:flex-row gap-4 justify-between items-center bg-slate-900/60 backdrop-blur-sm shrink-0">
                    <div className="flex flex-wrap items-center gap-6">
                      <div>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Total Transações</p>
                        <p className="text-lg font-black dark:text-white mt-1">
                          {stagedTransactions.filter(t => !t.isBalance).length}
                        </p>
                      </div>
                      <div className="h-8 w-px bg-white/10 hidden sm:block"></div>
                      <div>
                        <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest flex items-center gap-1">
                          <TrendingUp className="w-3.5 h-3.5" /> Receitas
                        </p>
                        <p className="text-sm font-black text-emerald-400 mt-1">
                          {totalStagedIncome.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </p>
                      </div>
                      <div className="h-8 w-px bg-white/10 hidden sm:block"></div>
                      <div>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest flex items-center gap-1">
                          <TrendingDown className="w-3.5 h-3.5" /> Despesas
                        </p>
                        <p className="text-sm font-black text-slate-300 mt-1">
                          {totalStagedExpense.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </p>
                      </div>
                      {stagedTransactions.some(t => t.isBalance) && (
                        <>
                          <div className="h-8 w-px bg-white/10 hidden sm:block"></div>
                          <div>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest flex items-center gap-1">
                              <Calculator className="w-3.5 h-3.5 text-slate-400" /> Saldos Diários
                            </p>
                            <p className="text-sm font-black text-slate-100 mt-1">
                              {stagedTransactions.filter(t => t.isBalance).length} reg.
                            </p>
                          </div>
                        </>
                      )}
                    </div>

                    <button
                      onClick={handleConfirmImport}
                      disabled={importing}
                      className="w-full sm:w-auto px-6 py-4 bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-500/50 text-white text-xs font-black rounded-xl uppercase tracking-widest shadow-xl shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer border border-emerald-400"
                    >
                      {importing ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white"></div>
                          Conciliando...
                        </>
                      ) : (
                        <>
                          <Check className="w-4 h-4" /> Conciliar e Importar
                        </>
                      )}
                    </button>
                  </div>

                  {/* Interactive Table Container */}
                  <div className="flex-1 overflow-auto">
                    <table className="w-full text-left border-collapse">
                      <thead className="sticky top-0 z-10 bg-slate-900 border-b border-white/5">
                        <tr>
                          <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Data</th>
                          <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Descrição</th>
                          <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Categoria</th>
                          <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Valor (R$)</th>
                          <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {stagedTransactions.map((tx) => {
                          const IconComponent = categoryIcons[tx.category] || Activity;
                          const isBalance = !!tx.isBalance;
                          const isIncome = tx.amount > 0;
                          return (
                            <tr 
                              key={tx.id} 
                              className={`transition-colors group ${
                                isBalance 
                                  ? 'bg-slate-900/40 hover:bg-slate-900/60 border-l-2 border-slate-500' 
                                  : 'hover:bg-white/[0.02] border-l-2 border-transparent'
                              }`}
                            >
                              {/* Date Input */}
                              <td className="px-6 py-4">
                                <input
                                  type="date"
                                  value={tx.date}
                                  onChange={(e) => handleStagedChange(tx.id, 'date', e.target.value)}
                                  className="bg-transparent border-0 font-bold text-xs text-slate-300 w-32 focus:outline-none focus:ring-1 focus:ring-emerald-500/20 rounded px-2 py-1.5 focus:bg-slate-950 transition-all cursor-pointer"
                                />
                              </td>
                              {/* Description Input */}
                              <td className="px-6 py-4">
                                <input
                                  type="text"
                                  value={tx.description}
                                  onChange={(e) => handleStagedChange(tx.id, 'description', e.target.value)}
                                  className="bg-transparent border-0 font-black text-xs text-slate-100 w-full min-w-[200px] focus:outline-none focus:ring-1 focus:ring-emerald-500/20 rounded px-2 py-1.5 focus:bg-slate-950 transition-all"
                                />
                              </td>
                              {/* Category Select */}
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-2 bg-slate-950/30 border border-white/5 rounded-xl px-3 py-1.5 w-max">
                                  <IconComponent className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-500 transition-colors" />
                                  <select
                                    value={tx.category}
                                    onChange={(e) => handleStagedChange(tx.id, 'category', e.target.value)}
                                    className="bg-transparent border-0 text-[10px] font-black text-slate-300 uppercase tracking-wider focus:outline-none cursor-pointer pr-1"
                                  >
                                    <option value="Alimentação">Alimentação</option>
                                    <option value="Salário">Salário</option>
                                    <option value="Cartão">Cartão</option>
                                    <option value="Utilidades">Utilidades</option>
                                    <option value="Transporte">Transporte</option>
                                    <option value="Assinaturas">Assinaturas</option>
                                    <option value="Boleto">Boleto</option>
                                    <option value="Rendimentos">Rendimentos</option>
                                    <option value="Transferência">Transferência</option>
                                    <option value="Saúde">Saúde</option>
                                    <option value="Saldo">Saldo</option>
                                    <option value="Outros">Outros</option>
                                  </select>
                                </div>
                              </td>
                              {/* Amount Input */}
                              <td className="px-6 py-4 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  {isBalance ? (
                                    <span className="text-[9px] font-black uppercase text-slate-450 bg-white/5 px-2 py-0.5 rounded border border-white/5 flex items-center gap-1">
                                      <Calculator className="w-3 h-3 text-slate-400" /> Saldo
                                    </span>
                                  ) : (
                                    <span className={`text-[10px] font-black uppercase ${isIncome ? 'text-emerald-500' : 'text-slate-400'}`}>
                                      {isIncome ? '+' : '-'}
                                    </span>
                                  )}
                                  <input
                                    type="number"
                                    step="0.01"
                                    value={isBalance ? tx.amount : Math.abs(tx.amount)}
                                    onChange={(e) => {
                                      const val = parseFloat(e.target.value) || 0;
                                      const absVal = Math.abs(val);
                                      const finalVal = isBalance ? val : (isIncome ? absVal : -absVal);
                                      handleStagedChange(tx.id, 'amount', finalVal);
                                    }}
                                    className={`bg-transparent border-0 font-black text-xs text-right w-24 focus:outline-none focus:ring-1 focus:ring-emerald-500/20 rounded px-2 py-1.5 focus:bg-slate-950 transition-all ${
                                      isBalance 
                                        ? 'text-slate-350 font-mono font-bold' 
                                        : isIncome 
                                          ? 'text-emerald-400' 
                                          : 'text-slate-200'
                                    }`}
                                  />
                                  {!isBalance && (
                                    <button
                                      type="button"
                                      onClick={() => handleStagedChange(tx.id, 'amount', -tx.amount)}
                                      title="Inverter fluxo (Receita / Despesa)"
                                      className="p-1 hover:bg-white/5 rounded text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
                                    >
                                      <Shuffle className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>
                              </td>
                              {/* Delete button */}
                              <td className="px-6 py-4 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleRemoveStaged(tx.id)}
                                  className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/5 rounded-xl transition-all cursor-pointer"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Chat Conversational Section */}
        {activeTab === 'chat' && (
          <div className="flex-1 flex overflow-hidden p-8 gap-8 animate-in relative">
            
            {/* Sidebar for Persistent Conversations (Sessões) */}
            <div className="w-80 flex flex-col gap-4 shrink-0 glass rounded-[32px] border border-white/5 bg-slate-900/40 p-5 overflow-hidden">
              <div className="flex items-center justify-between pb-3 border-b border-white/5">
                <div className="flex items-center gap-2">
                  <History className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-black uppercase tracking-wider text-slate-200">Conversas Recentes</span>
                </div>
                <button
                  onClick={handleNewConversation}
                  disabled={chatLoading}
                  className="p-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-xl transition-all cursor-pointer border border-emerald-500/20 active:scale-95 flex items-center justify-center"
                  title="Nova Conversa"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              {/* Sessions List */}
              <div className="flex-1 overflow-y-auto space-y-2 pr-1 no-scrollbar">
                {loadingSessions ? (
                  <div className="py-10 text-center space-y-2">
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-emerald-500 border-t-transparent mx-auto"></div>
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest font-black">Carregando Histórico...</p>
                  </div>
                ) : chatSessions.length === 0 ? (
                  <div className="py-10 text-center text-slate-500">
                    <MessageSquare className="w-8 h-8 mx-auto opacity-20 mb-2 stroke-[1.5]" />
                    <p className="text-[10px] uppercase tracking-widest font-black">Nenhum Chat Salvo</p>
                  </div>
                ) : (
                  chatSessions.map((session) => {
                    const isActive = session.id === activeSessionId;
                    return (
                      <div
                        key={session.id}
                        onClick={() => handleSelectSession(session.id)}
                        className={`flex items-center justify-between p-3.5 rounded-2xl cursor-pointer group transition-all border ${
                          isActive
                            ? 'bg-emerald-500/10 border-emerald-500/20 text-white'
                            : 'border-transparent hover:bg-white/[0.02] text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <MessageSquare className={`w-4 h-4 shrink-0 ${isActive ? 'text-emerald-400' : 'text-slate-500'}`} />
                          <span className="text-xs font-bold truncate pr-2">{session.title}</span>
                        </div>
                        <button
                          onClick={(e) => handleDeleteSession(session.id, e)}
                          className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-500/10 text-slate-500 hover:text-red-400 rounded-lg transition-all"
                          title="Excluir Conversa"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Main Conversation Window */}
            <div className="flex-1 flex flex-col glass rounded-[36px] border border-white/5 bg-slate-900/20 overflow-hidden relative">
              
              {/* Premium Conversation Header */}
              <div className="px-8 py-5 border-b border-white/5 bg-slate-900/40 backdrop-blur-md flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400 border border-emerald-500/10">
                    <Bot className="w-4.5 h-4.5" />
                  </div>
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-wider text-white">Gemini Conversational Brain</h3>
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Mente Integrada ao Banco de Dados</p>
                  </div>
                </div>

                {/* Right Actions: Perene Memory Badge & Compaction Button */}
                <div className="flex items-center gap-3">
                  {/* Global Memory Badge Indicator */}
                  <button
                    onClick={() => setShowMemoryModal(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-violet-500/10 border border-violet-500/20 text-[9px] font-black text-violet-400 uppercase tracking-widest cursor-pointer hover:bg-violet-500/20 transition-all active:scale-95"
                    title="Ver consciência permanente consolidada"
                  >
                    <Brain className="w-3.5 h-3.5 animate-pulse" />
                    <span>Memória Perene: Ativa</span>
                  </button>

                  {/* Claude-like Compaction button */}
                  {activeSessionId && chatMessages.length > 0 && (
                    <button
                      onClick={handleCompactSession}
                      disabled={chatLoading || compacting}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-[9px] font-black text-emerald-400 uppercase tracking-widest cursor-pointer hover:bg-emerald-500/20 transition-all active:scale-95 disabled:opacity-50"
                      title="Compactar histórico desta sessão e integrar consciência à memória global permanente (/compact)"
                    >
                      {compacting ? (
                        <>
                          <div className="animate-spin rounded-full h-3 w-3 border-2 border-emerald-400 border-t-transparent mx-auto"></div>
                          <span>Compactando...</span>
                        </>
                      ) : (
                        <>
                          <Layers className="w-3.5 h-3.5" />
                          <span>Compactar Contexto</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
              
              {/* Scrollable messages box */}
              <div className="flex-1 overflow-y-auto p-8 space-y-6 no-scrollbar">
                {chatMessages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-6">
                    <div className="w-16 h-16 bg-emerald-500 rounded-3xl flex items-center justify-center text-white shadow-xl shadow-emerald-500/20">
                      <Sparkles className="w-8 h-8" />
                    </div>
                    <div>
                      <h3 className="text-base font-black uppercase tracking-wider">Gemini Conversational Brain</h3>
                      <p className="text-xs text-slate-400 mt-2 max-w-md mx-auto leading-relaxed">
                        Faça perguntas complexas sobre saldos, metas e boletos. Toda a base financeira do G-Finance (Supabase) é integrada e contextualizada em tempo real.
                      </p>
                      <div className="mt-6 flex flex-wrap gap-2 justify-center max-w-lg mx-auto">
                        <span className="text-[9px] font-black uppercase tracking-widest px-2.5 py-1 bg-slate-900 border border-white/5 rounded-full text-slate-400"># Análise de Despesas</span>
                        <span className="text-[9px] font-black uppercase tracking-widest px-2.5 py-1 bg-slate-900 border border-white/5 rounded-full text-slate-400"># Projeção de Metas</span>
                        <span className="text-[9px] font-black uppercase tracking-widest px-2.5 py-1 bg-slate-900 border border-white/5 rounded-full text-slate-400"># Auditoria de Extratos</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {chatMessages.map((msg) => {
                      const isModel = msg.role === 'model';
                      const isCompacted = msg.isCompacted;
                      // Detect system notifications
                      const isSystemIndicator = msg.parts[0].text.startsWith('[Histórico compactado!');

                      if (isSystemIndicator) {
                        return (
                          <div key={msg.id} className="flex justify-center my-4 animate-in">
                            <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/5 border border-emerald-500/10 text-emerald-400 rounded-2xl text-[10px] font-black uppercase tracking-wider shadow-inner">
                              <Brain className="w-3.5 h-3.5 animate-pulse" />
                              <span>{msg.parts[0].text.replace(/^\[|\]$/g, '')}</span>
                            </div>
                          </div>
                        );
                      }

                      return (
                        <div 
                          key={msg.id} 
                          className={`flex items-start gap-4 ${isModel ? '' : 'justify-end'} ${isCompacted ? 'opacity-40 hover:opacity-100 transition-opacity' : ''}`}
                        >
                          {isModel && (
                            <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center text-white shrink-0 mt-1 shadow-md shadow-emerald-500/20">
                              <Bot className="w-4.5 h-4.5" />
                            </div>
                          )}
                          <div className="relative group">
                            <div className={`p-5 rounded-3xl text-sm max-w-[500px] leading-relaxed relative ${
                              isModel 
                                ? 'bg-slate-900 border border-white/5 text-slate-200 rounded-tl-sm' 
                                : 'bg-emerald-500 text-white font-medium rounded-tr-sm shadow-lg shadow-emerald-500/10'
                            }`}>
                              {formatMessageText(msg.parts[0].text)}
                              
                              {/* Compacted state indicator tag */}
                              {isCompacted && (
                                <span className="absolute bottom-2 right-3 text-[7px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded bg-white/5 border border-white/5 text-slate-500 select-none">
                                  Arquivado (Memória)
                                </span>
                              )}
                            </div>
                          </div>
                          {!isModel && (
                            <div className="w-8 h-8 rounded-lg bg-slate-800 border border-white/5 flex items-center justify-center text-slate-300 shrink-0 mt-1 shadow-sm">
                              <User className="w-4.5 h-4.5" />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {chatLoading && (
                  <div className="flex items-start gap-4 animate-pulse">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0 mt-1">
                      <Bot className="w-4.5 h-4.5 animate-spin" />
                    </div>
                    <div className="bg-slate-900/60 border border-white/5 rounded-3xl rounded-tl-sm p-5 text-xs text-slate-400 uppercase tracking-widest font-black flex items-center gap-2">
                      <div className="h-1.5 w-1.5 bg-emerald-500 rounded-full animate-bounce"></div>
                      <div className="h-1.5 w-1.5 bg-emerald-500 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                      <div className="h-1.5 w-1.5 bg-emerald-500 rounded-full animate-bounce [animation-delay:0.4s]"></div>
                      Pensando...
                    </div>
                  </div>
                )}

                {compacting && (
                  <div className="flex justify-center my-4 animate-pulse">
                    <div className="flex items-center gap-2 px-4 py-2 bg-violet-500/5 border border-violet-500/10 text-violet-400 rounded-2xl text-[10px] font-black uppercase tracking-wider">
                      <div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-violet-400 border-t-transparent animate-pulse"></div>
                      <span>Compactando consciência... Gravando na memória permanente</span>
                    </div>
                  </div>
                )}

                {chatError && (
                  <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl flex items-start gap-2 text-xs animate-in">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{chatError}</span>
                  </div>
                )}
                
                <div ref={messagesEndRef} />
              </div>

              {/* Chat Input Footer Form */}
              <form 
                onSubmit={handleSendChatMessage}
                className="p-6 border-t border-white/5 bg-slate-900/40 backdrop-blur-md flex items-center gap-4 shrink-0"
              >
                <input 
                  type="text" 
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  placeholder={
                    activeSessionId 
                      ? "Pergunte sobre seus saldos, despesas mensais ou investimentos... (digite /compact para comprimir histórico)"
                      : "Digite sua primeira pergunta para iniciar uma nova conversa persistente..."
                  }
                  className="flex-1 px-5 py-4 bg-slate-955 border border-white/5 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:bg-slate-950 transition-all placeholder:text-slate-500"
                />
                <button
                  type="submit"
                  disabled={!inputMessage.trim() || chatLoading || compacting}
                  className="p-4 bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-500/30 text-white rounded-2xl shadow-xl shadow-emerald-500/20 transition-all flex items-center justify-center cursor-pointer border border-emerald-400 shrink-0"
                >
                  <Send className="w-5 h-5" />
                </button>
              </form>
            </div>

            {/* Premium Global Memory Modal (Show User Memory) */}
            {showMemoryModal && (
              <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-50 p-8 animate-in fade-in duration-300">
                <div className="glass max-w-2xl w-full rounded-[36px] border border-white/10 bg-slate-900/90 shadow-2xl overflow-hidden flex flex-col max-h-[80%] animate-in zoom-in-95 duration-300">
                  <div className="p-6 border-b border-white/5 flex items-center justify-between bg-slate-950/40">
                    <div className="flex items-center gap-3">
                      <Brain className="w-5 h-5 text-violet-400" />
                      <div>
                        <h4 className="text-xs font-black uppercase tracking-wider text-white">Memória Cognitiva Permanente</h4>
                        <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">Visão de Consciência do Gemini Brain</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowMemoryModal(false)}
                      className="px-3 py-1.5 hover:bg-white/5 text-[10px] font-black uppercase text-slate-400 hover:text-slate-200 border border-white/5 hover:border-white/10 rounded-xl transition-all cursor-pointer"
                    >
                      Fechar
                    </button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-8 space-y-4 no-scrollbar">
                    {aiMemory ? (
                      <div className="space-y-4">
                        <p className="text-xs text-slate-400 leading-relaxed uppercase tracking-wider font-bold">
                          🧠 Esta é a bagagem acumulada cruzada de todas as sessões anteriores. O Gemini carrega este contexto permanentemente em todas as novas conversas:
                        </p>
                        <div className="bg-slate-950 p-6 rounded-2xl border border-white/5 leading-relaxed text-slate-350 font-mono text-[11px] whitespace-pre-wrap">
                          {aiMemory}
                        </div>
                      </div>
                    ) : (
                      <div className="py-12 text-center space-y-4">
                        <Brain className="w-12 h-12 mx-auto text-slate-700 stroke-[1.5] animate-pulse" />
                        <div className="space-y-2">
                          <p className="text-xs font-black text-slate-300 uppercase tracking-wider">Memória Permanente Vazia</p>
                          <p className="text-[11px] text-slate-500 max-w-sm mx-auto leading-relaxed">
                            Converse com a inteligência artificial normalmente ou clique em <strong>"Compactar Contexto"</strong> no cabeçalho do chat para sumarizar e consolidar seus primeiros aprendizados aqui!
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="p-6 border-t border-white/5 bg-slate-950/20 text-center">
                    <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">
                      G-Finance Cognition Unit — Sandbox & mTLS Security Verified
                    </p>
                  </div>
                </div>
              </div>
            )}

          </div>
        )}
      </div>
    </div>
  );
}
