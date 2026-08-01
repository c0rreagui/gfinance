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
  Layers,
  Paperclip,
  Search,
  Filter,
  Command,
  X,
  ChevronRight,
  ArrowUpRight,
  ArrowDownRight
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
  attachmentName?: string;
  extractedAttachment?: {
    filename: string;
    count: number;
    transactions: StagedTransaction[];
  };
}

const CHAT_SHORTCUTS = [
  { command: '/extrato', label: 'Anexar Extrato Bancário', description: 'Leitura multimodal de PDF/Imagem via visão computacional', icon: UploadCloud },
  { command: '/compact', label: 'Compactar Histórico', description: 'Consolidar aprendizados na memória permanente perene', icon: Layers },
  { command: '/saldo', label: 'Resumo de Saldos', description: 'Consultar posição consolidada de bancos e liquidez', icon: Calculator },
  { command: '/faturas', label: 'Faturas e Cartões', description: 'Auditar cartões de crédito e próximos vencimentos', icon: CreditCard },
  { command: '/reconciliar', label: 'Reconciliar Saldos', description: 'Forçar sincronização dos saldos em tempo real', icon: CheckCircle },
  { command: '/limpar', label: 'Opções de Limpeza', description: 'Limpar transações de teste ou histórico recente', icon: Trash2 },
];

const formatMessageText = (text: string): string => {
  if (!text) return '';
  return text.replace(/\*\*/g, '');
};

export default function GeminiBrainPage() {
  const [activeTab, setActiveTab] = useState<'importer' | 'chat'>('importer');
  
  // Importer State
  const [activeEngine, setActiveEngine] = useState<string>('Gemini 2.0 Flash Vision');
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState('');
  const [stagedTransactions, setStagedTransactions] = useState<StagedTransaction[]>([]);
  const [stagedFilter, setStagedFilter] = useState<'all' | 'income' | 'expense' | 'balances'>('all');
  const [stagedSearch, setStagedSearch] = useState('');
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
  const [chatAttachment, setChatAttachment] = useState<{
    file: File;
    name: string;
    size: number;
    type: string;
    base64: string;
  } | null>(null);
  const [showShortcutsMenu, setShowShortcutsMenu] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatTextareaRef = useRef<HTMLTextAreaElement>(null);
  const chatFileInputRef = useRef<HTMLInputElement>(null);

  // Auto-resize textarea height based on content
  useEffect(() => {
    const textarea = chatTextareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 160)}px`;
    }
  }, [inputMessage]);

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

  const handleSelectSession = (sid: string) => {
    setActiveSessionId(sid);
    fetchSessionMessages(sid);
  };

  const handleNewConversation = () => {
    setActiveSessionId(null);
    setChatMessages([]);
  };

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

      await fetchUserMemory();
      await fetchSessionMessages(activeSessionId);
    } catch (err: any) {
      setChatError(err.message || 'Falha ao compactar sessão.');
    } finally {
      setCompacting(false);
    }
  };

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

      if (data.engineName) {
        setActiveEngine(data.engineName);
      }

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

  // Alterar campo na Fila de Staging
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

  // Inverter o sinal de um lançamento (Receita <-> Despesa)
  const handleToggleSign = (id: string) => {
    setStagedTransactions((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          return { ...item, amount: -item.amount };
        }
        return item;
      })
    );
  };

  // Excluir item individual da Fila de Staging
  const handleRemoveStaged = (id: string) => {
    setStagedTransactions((prev) => prev.filter((item) => item.id !== id));
  };

  // Confirmar e Salvar no Supabase (Bulk Insert + Reconcile)
  const handleConfirmImport = async () => {
    if (!userId || stagedTransactions.length === 0) return;
    setImporting(true);
    setUploadError('');

    try {
      const transactionsToInsert = stagedTransactions.filter(item => !item.isBalance);

      const recordsToInsert = transactionsToInsert.map((item) => ({
        user_id: userId,
        description: item.description,
        amount: item.amount,
        category: item.category,
        date: new Date(item.date).toISOString(),
        icon: item.amount > 0 ? 'ArrowDownLeft' : 'CreditCard'
      }));

      if (recordsToInsert.length > 0) {
        const { error: insertError } = await supabase
          .from('transactions')
          .insert(recordsToInsert);

        if (insertError) throw insertError;
      }

      const reconcileResult = await reconcileBalances(supabase, userId);

      if (!reconcileResult.success) {
        throw new Error(reconcileResult.error || 'Erro ao recalcular os saldos da central.');
      }

      const incomeTotal = transactionsToInsert.filter(t => t.amount > 0).reduce((acc, t) => acc + t.amount, 0);
      const expenseTotal = transactionsToInsert.filter(t => t.amount < 0).reduce((acc, t) => acc + Math.abs(t.amount), 0);

      setImportStats({
        total: transactionsToInsert.length,
        income: incomeTotal,
        expense: expenseTotal
      });
      setImportSuccess(true);

      const balanceRows = stagedTransactions.filter(item => item.isBalance);
      const latestBalanceRow = balanceRows.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
      
      if (latestBalanceRow) {
        const parsedTarget = latestBalanceRow.amount;
        
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

      setStagedTransactions([]);
    } catch (err: any) {
      console.error(err);
      setUploadError(err.message || 'Falha ao conciliar os lançamentos no banco de dados.');
    } font-sans
    finally {
      setImporting(false);
    }
  };

  // Ajustar Saldo Inicial de Partida do perfil do usuário
  const handleSyncInitialBalance = async () => {
    if (!userId || syncingInitialBalance) return;
    setSyncingInitialBalance(true);
    try {
      const newInitBalance = oldInitialBalance + initialBalanceDiff;

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ initial_balance: newInitBalance })
        .eq('id', userId);

      if (updateError) throw updateError;

      const reconcileResult = await reconcileBalances(supabase, userId);
      if (!reconcileResult.success) throw new Error(reconcileResult.error);

      setMismatchDetected(false);
      setCurrentTotal(reconcileResult.data?.total || targetBalance);
    } catch (err: any) {
      console.error(err);
      alert(`Erro ao ajustar saldo inicial: ${err.message}`);
    } finally {
      setSyncingInitialBalance(false);
    }
  };

  // Handlers para Anexo no Chat
  const handleChatFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (evt) => {
        const result = evt.target?.result as string;
        const base64 = result.split(',')[1] || '';
        setChatAttachment({
          file,
          name: file.name,
          size: file.size,
          type: file.type,
          base64
        });
      };
      reader.readAsDataURL(file);
    }
  };

  // Carregar lançamentos extraídos do chat para a tabela de staging
  const handleLoadChatAttachmentToStaging = (txs: any[]) => {
    const parsed = (txs || []).map((t: any, idx: number) => ({
      id: `staged-chat-${Date.now()}-${idx}`,
      date: t.date || new Date().toISOString().split('T')[0],
      description: t.description || 'Lançamento sem descrição',
      amount: Number(t.amount) || 0,
      category: t.category || 'Outros',
      isBalance: !!t.isBalance
    }));
    setStagedTransactions(parsed);
    setActiveTab('importer');
  };

  // Enviar Mensagem no Chat Conversacional
  const handleSendChatMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if ((!inputMessage.trim() && !chatAttachment) || chatLoading || compacting) return;

    setChatError('');
    setShowShortcutsMenu(false);
    const userQuery = inputMessage.trim() || (chatAttachment ? `Por favor, analise o extrato em anexo (${chatAttachment.name})` : '');
    const currentAttachment = chatAttachment;

    setInputMessage('');
    setChatAttachment(null);
    setChatLoading(true);

    const userMessage: ChatMessage = {
      id: `chat-temp-${Date.now()}-user`,
      role: 'user',
      parts: [{ text: userQuery }],
      attachmentName: currentAttachment?.name
    };

    setChatMessages((prev) => [...prev, userMessage]);

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
          message: userQuery,
          sessionId: activeSessionId,
          attachment: currentAttachment ? {
            filename: currentAttachment.name,
            mimeType: currentAttachment.type,
            base64: currentAttachment.base64
          } : undefined
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro de conexão.');
      }

      const hasNewSession = data.sessionId && data.sessionId !== activeSessionId;
      const targetSessionId = data.sessionId || activeSessionId;

      if (hasNewSession) {
        setActiveSessionId(data.sessionId);
        await fetchChatSessions();
      }

      const modelMessage: ChatMessage = {
        id: `chat-temp-${Date.now()}-model`,
        role: 'model',
        parts: [{ text: data.response }],
        extractedAttachment: data.extractedAttachment
      };

      setChatMessages((prev) => {
        const filtered = prev.filter(m => !m.id.startsWith('chat-temp-'));
        return [...filtered, userMessage, modelMessage];
      });

      if (data.compacted || data.autoCompacted) {
        await fetchUserMemory();
        if (targetSessionId) {
          await fetchSessionMessages(targetSessionId);
        }
      }

    } catch (err: any) {
      console.error(err);
      setChatError(err.message || 'O Gemini Brain encontrou uma instabilidade ao responder.');
      setChatMessages((prev) => prev.filter(m => !m.id.startsWith('chat-temp-')));
    } finally {
      setChatLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendChatMessage();
    }
  };

  const handleShortcutSelect = (shortcut: typeof CHAT_SHORTCUTS[0]) => {
    setShowShortcutsMenu(false);
    if (shortcut.command === '/extrato') {
      chatFileInputRef.current?.click();
    } else if (shortcut.command === '/compact') {
      handleCompactSession();
    } else {
      setInputMessage(shortcut.command + ' ');
      chatTextareaRef.current?.focus();
    }
  };

  // Separação de lançamentos reais vs instantâneos de saldo do extrato
  const realTransactions = stagedTransactions.filter((t) => !t.isBalance);
  const balanceSnapshots = stagedTransactions.filter((t) => t.isBalance);

  const filteredRealTransactions = realTransactions.filter((tx) => {
    if (stagedFilter === 'income' && tx.amount <= 0) return false;
    if (stagedFilter === 'expense' && tx.amount >= 0) return false;
    if (stagedSearch.trim()) {
      const query = stagedSearch.toLowerCase();
      return (
        tx.description.toLowerCase().includes(query) ||
        tx.category.toLowerCase().includes(query)
      );
    }
    return true;
  });

  const totalStagedIncome = realTransactions
    .filter((t) => t.amount > 0)
    .reduce((sum, t) => sum + t.amount, 0);

  const totalStagedExpense = realTransactions
    .filter((t) => t.amount < 0)
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);

  const netCashflow = totalStagedIncome - totalStagedExpense;

  return (
    <div className="flex-1 flex flex-col overflow-hidden relative h-full bg-slate-950 text-slate-100">
      {/* Radial glow background */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(16,185,129,0.08),rgba(255,255,255,0))] pointer-events-none z-0"></div>

      {/* Main Header */}
      <header className="border-b border-white/5 bg-slate-900/40 backdrop-blur-md px-8 py-5 flex items-center justify-between z-10 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
            <Sparkles className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-black tracking-tight uppercase">Central Gemini Brain</h1>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[9px] font-black uppercase tracking-wider">
                {activeEngine}
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
              Inteligência Computacional & Conciliação Financeira
            </p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1.5 bg-slate-900/80 p-1.5 rounded-xl border border-white/5">
          <button
            onClick={() => setActiveTab('importer')}
            className={`px-5 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'importer'
                ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <UploadCloud className="w-4 h-4" /> Importador Extratos
          </button>
          <button
            onClick={() => setActiveTab('chat')}
            className={`px-5 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'chat'
                ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20'
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
                className={`glass border-2 border-dashed rounded-[32px] p-8 flex flex-col items-center justify-center text-center transition-all min-h-[280px] relative ${
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
                  <div className="space-y-4 w-full px-4 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mx-auto animate-bounce shadow-lg shadow-emerald-500/10">
                      <Sparkles className="w-8 h-8" />
                    </div>
                    <div>
                      <p className="text-xs font-black uppercase tracking-wider text-emerald-400">Lendo extrato com {activeEngine}</p>
                      <p className="text-[10px] text-slate-400 uppercase tracking-widest mt-1">Extraindo lançamentos estruturados...</p>
                    </div>
                    {/* Elegant progress bar */}
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

              {/* Informative Instructions Box */}
              <div className="glass bg-slate-900/40 rounded-[28px] border border-white/5 p-6 space-y-4">
                <h3 className="text-xs font-black uppercase tracking-widest flex items-center gap-2 text-emerald-400">
                  <Calculator className="w-4 h-4" /> Diretrizes do Motor IA
                </h3>
                <ul className="text-xs space-y-3 text-slate-400 leading-relaxed">
                  <li className="flex gap-2">
                    <span className="text-emerald-500 font-bold">✓</span>
                    <span>Visão Multimodal nativa de última geração ({activeEngine}).</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-emerald-500 font-bold">✓</span>
                    <span>Identificação automática de faturas, transferências Pix e tarifas.</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-emerald-500 font-bold">✓</span>
                    <span>Separação cirúrgica entre movimentações e saldos diários de conciliação.</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Right Interactive Staging Queue & Conciliation Table */}
            <div className="flex-1 flex flex-col overflow-hidden glass rounded-[36px] border border-white/5 bg-slate-900/20">
              
              {/* Alert Feedback Messages */}
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
                        Foram salvos **{importStats.total} lançamentos** (Receitas: {importStats.income.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} | Despesas: {importStats.expense.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}). Os saldos globais foram recalculados.
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
                          O saldo final do extrato é de <span className="font-bold text-white">{targetBalance.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>, mas o saldo no G-Finance ficou em <span className="font-bold text-white">{currentTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>.
                        </p>
                        <p className="text-xs text-slate-500 max-w-md">
                          Deseja ajustar automaticamente seu saldo inicial de partida para <span className="font-bold text-emerald-400">{(oldInitialBalance + initialBalanceDiff).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>?
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
                            Ajustar Saldo Inicial (R$ {initialBalanceDiff > 0 ? '+' : ''}{initialBalanceDiff.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
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
                  <p className="text-sm font-black uppercase tracking-wider">Fila de Conciliação Vazia</p>
                  <p className="text-xs text-slate-500 mt-2 max-w-sm">
                    Faça upload de um arquivo PDF ou imagem para popular esta tabela de conciliação.
                  </p>
                </div>
              ) : (
                <div className="flex-1 flex flex-col overflow-hidden">
                  
                  {/* Summary Header Metrics Bar */}
                  <div className="p-6 border-b border-white/5 flex flex-col sm:flex-row gap-4 justify-between items-center bg-slate-900/60 backdrop-blur-sm shrink-0">
                    <div className="flex flex-wrap items-center gap-6">
                      <div>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Lançamentos Reais</p>
                        <p className="text-lg font-black dark:text-white mt-0.5">
                          {realTransactions.length}
                        </p>
                      </div>
                      <div className="h-8 w-px bg-white/10 hidden sm:block"></div>
                      <div>
                        <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest flex items-center gap-1">
                          <TrendingUp className="w-3.5 h-3.5" /> Entradas
                        </p>
                        <p className="text-sm font-black text-emerald-400 mt-0.5">
                          {totalStagedIncome.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </p>
                      </div>
                      <div className="h-8 w-px bg-white/10 hidden sm:block"></div>
                      <div>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest flex items-center gap-1">
                          <TrendingDown className="w-3.5 h-3.5" /> Saídas
                        </p>
                        <p className="text-sm font-black text-slate-300 mt-0.5">
                          {totalStagedExpense.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </p>
                      </div>
                      <div className="h-8 w-px bg-white/10 hidden sm:block"></div>
                      <div>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Resultado Líquido</p>
                        <p className={`text-sm font-black mt-0.5 ${netCashflow >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {netCashflow.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={handleConfirmImport}
                      disabled={importing || realTransactions.length === 0}
                      className="w-full sm:w-auto px-6 py-3.5 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-800 disabled:text-slate-500 text-white text-xs font-black rounded-xl uppercase tracking-widest shadow-xl shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer border border-emerald-400 border-none disabled:border-none"
                    >
                      {importing ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white"></div>
                          Conciliando...
                        </>
                      ) : (
                        <>
                          <Check className="w-4 h-4" /> Conciliar e Importar {realTransactions.length} Lançamentos
                        </>
                      )}
                    </button>
                  </div>

                  {/* Filter & Search Bar */}
                  <div className="px-6 py-3 border-b border-white/5 bg-slate-950/40 flex flex-wrap items-center justify-between gap-4 shrink-0">
                    {/* Filter Pills */}
                    <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-white/5">
                      <button
                        onClick={() => setStagedFilter('all')}
                        className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
                          stagedFilter === 'all' ? 'bg-emerald-500 text-white' : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        Todas ({realTransactions.length})
                      </button>
                      <button
                        onClick={() => setStagedFilter('income')}
                        className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
                          stagedFilter === 'income' ? 'bg-emerald-500 text-white' : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        Receitas ({realTransactions.filter(t => t.amount > 0).length})
                      </button>
                      <button
                        onClick={() => setStagedFilter('expense')}
                        className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
                          stagedFilter === 'expense' ? 'bg-emerald-500 text-white' : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        Despesas ({realTransactions.filter(t => t.amount < 0).length})
                      </button>
                    </div>

                    {/* Search Input */}
                    <div className="relative flex-1 max-w-xs">
                      <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Buscar nos lançamentos..."
                        value={stagedSearch}
                        onChange={(e) => setStagedSearch(e.target.value)}
                        className="w-full bg-slate-900 border border-white/5 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500/30 transition-all placeholder:text-slate-600"
                      />
                      {stagedSearch && (
                        <button
                          onClick={() => setStagedSearch('')}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Main Split View: Table (Left) + Daily Balances Audit (Right) */}
                  <div className="flex-1 flex overflow-hidden">
                    
                    {/* Left: Main Transaction Ledger Table */}
                    <div className="flex-1 overflow-auto">
                      <table className="w-full text-left border-collapse">
                        <thead className="sticky top-0 z-10 bg-slate-900/90 backdrop-blur-md border-b border-white/5">
                          <tr>
                            <th className="px-6 py-3.5 text-[9px] font-black text-slate-400 uppercase tracking-widest">Data</th>
                            <th className="px-6 py-3.5 text-[9px] font-black text-slate-400 uppercase tracking-widest">Descrição</th>
                            <th className="px-6 py-3.5 text-[9px] font-black text-slate-400 uppercase tracking-widest">Categoria</th>
                            <th className="px-6 py-3.5 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Tipo / Fluxo</th>
                            <th className="px-6 py-3.5 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Valor (R$)</th>
                            <th className="px-6 py-3.5 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Ações</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {filteredRealTransactions.map((tx) => {
                            const IconComponent = categoryIcons[tx.category] || Activity;
                            const isIncome = tx.amount > 0;
                            return (
                              <tr 
                                key={tx.id} 
                                className="hover:bg-white/[0.03] transition-colors group"
                              >
                                {/* Date Input */}
                                <td className="px-6 py-3.5">
                                  <input
                                    type="date"
                                    value={tx.date}
                                    onChange={(e) => handleStagedChange(tx.id, 'date', e.target.value)}
                                    className="bg-transparent border-0 font-bold text-xs text-slate-300 w-32 focus:outline-none focus:ring-1 focus:ring-emerald-500/20 rounded px-2 py-1 focus:bg-slate-950 transition-all cursor-pointer"
                                  />
                                </td>
                                {/* Description Input */}
                                <td className="px-6 py-3.5">
                                  <input
                                    type="text"
                                    value={tx.description}
                                    onChange={(e) => handleStagedChange(tx.id, 'description', e.target.value)}
                                    className="bg-transparent border-0 font-bold text-xs text-slate-100 w-full min-w-[220px] focus:outline-none focus:ring-1 focus:ring-emerald-500/20 rounded px-2 py-1 focus:bg-slate-950 transition-all"
                                  />
                                </td>
                                {/* Category Select */}
                                <td className="px-6 py-3.5">
                                  <div className="flex items-center gap-2 bg-slate-950/60 border border-white/5 rounded-xl px-3 py-1.5 w-max">
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
                                      <option value="Outros">Outros</option>
                                    </select>
                                  </div>
                                </td>
                                {/* Fluxo Badge (Toggleable) */}
                                <td className="px-6 py-3.5 text-center">
                                  <button
                                    type="button"
                                    onClick={() => handleToggleSign(tx.id)}
                                    title="Clique para alternar Receita / Despesa"
                                    className={`px-3 py-1 rounded-xl text-[9px] font-black uppercase tracking-wider flex items-center gap-1.5 mx-auto transition-all border cursor-pointer active:scale-95 ${
                                      isIncome 
                                        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20' 
                                        : 'bg-slate-800 border-white/5 text-slate-300 hover:bg-slate-700'
                                    }`}
                                  >
                                    {isIncome ? (
                                      <>
                                        <TrendingUp className="w-3 h-3 text-emerald-400" />
                                        <span>+ RECEITA</span>
                                      </>
                                    ) : (
                                      <>
                                        <TrendingDown className="w-3 h-3 text-slate-400" />
                                        <span>- DESPESA</span>
                                      </>
                                    )}
                                  </button>
                                </td>
                                {/* Amount Input */}
                                <td className="px-6 py-3.5 text-right">
                                  <input
                                    type="number"
                                    step="0.01"
                                    value={Math.abs(tx.amount)}
                                    onChange={(e) => {
                                      const absVal = Math.abs(parseFloat(e.target.value) || 0);
                                      const finalVal = isIncome ? absVal : -absVal;
                                      handleStagedChange(tx.id, 'amount', finalVal);
                                    }}
                                    className={`bg-transparent border-0 font-mono font-bold text-xs text-right w-28 focus:outline-none focus:ring-1 focus:ring-emerald-500/20 rounded px-2 py-1 focus:bg-slate-950 transition-all ${
                                      isIncome ? 'text-emerald-400 font-black' : 'text-slate-200'
                                    }`}
                                  />
                                </td>
                                {/* Actions */}
                                <td className="px-6 py-3.5 text-center">
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveStaged(tx.id)}
                                    className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all cursor-pointer"
                                    title="Remover lançamento"
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

                    {/* Right: Daily Balances Audit Panel (Dedicated Sidebar Card) */}
                    {balanceSnapshots.length > 0 && (
                      <div className="w-80 border-l border-white/5 bg-slate-900/30 p-6 shrink-0 flex flex-col overflow-y-auto no-scrollbar">
                        <div className="flex items-center gap-2 mb-4">
                          <Calculator className="w-4 h-4 text-emerald-400" />
                          <h4 className="text-xs font-black uppercase tracking-wider text-slate-200">
                            Auditoria de Saldos ({balanceSnapshots.length})
                          </h4>
                        </div>
                        <p className="text-[10px] text-slate-400 leading-relaxed mb-4">
                          Estes valores representam os instantâneos de saldo diário extraídos do extrato para conferência.
                        </p>
                        <div className="space-y-3">
                          {balanceSnapshots.map((snapshot) => (
                            <div 
                              key={snapshot.id}
                              className="p-3.5 rounded-2xl bg-slate-950/60 border border-white/5 flex items-center justify-between"
                            >
                              <div>
                                <span className="text-[10px] font-bold text-slate-400 block">{snapshot.date}</span>
                                <span className="text-xs font-black text-slate-200 uppercase tracking-wider">Saldo do Dia</span>
                              </div>
                              <span className="font-mono text-xs font-bold text-emerald-400">
                                {snapshot.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                  </div>

                </div>
              )}

            </div>
          </div>
        )}

        {/* Tab 2: Chat Consultivo Section */}
        {activeTab === 'chat' && (
          <div className="flex-1 flex overflow-hidden p-8 gap-8 animate-in">
            
            {/* Left Conversations Sidebar */}
            <div className="w-80 flex flex-col glass rounded-[36px] border border-white/5 bg-slate-900/30 p-6 shrink-0 overflow-hidden">
              <button
                onClick={handleNewConversation}
                className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 cursor-pointer border border-emerald-400"
              >
                <Plus className="w-4 h-4" /> Nova Conversa
              </button>

              <div className="mt-6 flex items-center justify-between text-slate-400 px-1">
                <span className="text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5">
                  <History className="w-3.5 h-3.5" /> Conversas Recentes
                </span>
              </div>

              <div className="mt-4 flex-1 overflow-y-auto space-y-2 no-scrollbar">
                {loadingSessions ? (
                  <div className="p-4 text-center text-xs text-slate-500 uppercase tracking-wider font-bold">
                    Carregando...
                  </div>
                ) : chatSessions.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-500">
                    Nenhuma conversa salva ainda.
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
              
              {/* Conversation Header */}
              <div className="px-8 py-5 border-b border-white/5 bg-slate-900/40 backdrop-blur-md flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400 border border-emerald-500/10">
                    <Bot className="w-4.5 h-4.5" />
                  </div>
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-wider text-white">Gemini Conversational Brain</h3>
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Visão & Consultoria Financeira Ativa</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setShowMemoryModal(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-violet-500/10 border border-violet-500/20 text-[9px] font-black text-violet-400 uppercase tracking-widest cursor-pointer hover:bg-violet-500/20 transition-all active:scale-95"
                    title="Ver consciência permanente consolidada"
                  >
                    <Brain className="w-3.5 h-3.5 animate-pulse" />
                    <span>Memória Perene</span>
                  </button>

                  {activeSessionId && chatMessages.length > 0 && (
                    <button
                      onClick={handleCompactSession}
                      disabled={chatLoading || compacting}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-[9px] font-black text-emerald-400 uppercase tracking-widest cursor-pointer hover:bg-emerald-500/20 transition-all active:scale-95 disabled:opacity-50"
                      title="Compactar histórico desta sessão (/compact)"
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
                        Envie extratos em PDF/imagem no chat ou faça perguntas sobre seus saldos. A IA lê e executa ações diretamente no banco de dados.
                      </p>
                      <div className="mt-6 flex flex-wrap gap-2 justify-center max-w-lg mx-auto">
                        <button
                          onClick={() => chatFileInputRef.current?.click()}
                          className="text-[9px] font-black uppercase tracking-widest px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-emerald-400 hover:bg-emerald-500/20 transition-all flex items-center gap-1.5 cursor-pointer"
                        >
                          <Paperclip className="w-3 h-3" /> Anexar Extrato PDF/Imagem
                        </button>
                        <button
                          onClick={() => setInputMessage('/saldo')}
                          className="text-[9px] font-black uppercase tracking-widest px-3 py-1.5 bg-slate-900 border border-white/5 rounded-full text-slate-400 hover:text-slate-200 transition-all cursor-pointer"
                        >
                          /saldo
                        </button>
                        <button
                          onClick={() => setInputMessage('/reconciliar')}
                          className="text-[9px] font-black uppercase tracking-widest px-3 py-1.5 bg-slate-900 border border-white/5 rounded-full text-slate-400 hover:text-slate-200 transition-all cursor-pointer"
                        >
                          /reconciliar
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {chatMessages.map((msg) => {
                      const isModel = msg.role === 'model';
                      const isCompacted = msg.isCompacted;
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
                          <div className="relative group max-w-[550px]">
                            
                            {/* User Message Attachment Badge */}
                            {!isModel && msg.attachmentName && (
                              <div className="mb-2 flex justify-end">
                                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-800 border border-white/10 text-xs font-bold text-slate-300">
                                  <Paperclip className="w-3.5 h-3.5 text-emerald-400" />
                                  <span>{msg.attachmentName}</span>
                                </div>
                              </div>
                            )}

                            <div className={`p-5 rounded-3xl text-sm leading-relaxed relative ${
                              isModel 
                                ? 'bg-slate-900 border border-white/5 text-slate-200 rounded-tl-sm' 
                                : 'bg-emerald-500 text-white font-medium rounded-tr-sm shadow-lg shadow-emerald-500/10'
                            }`}>
                              {formatMessageText(msg.parts[0].text)}
                              
                              {/* Extracted Attachment Action Card in Model Message */}
                              {isModel && msg.extractedAttachment && (
                                <div className="mt-4 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 space-y-3">
                                  <div className="flex items-center justify-between">
                                    <span className="text-xs font-black uppercase tracking-wider flex items-center gap-1.5 text-emerald-400">
                                      <Sparkles className="w-4 h-4" /> Extrato Analisado
                                    </span>
                                    <span className="text-[10px] font-bold opacity-80">{msg.extractedAttachment.filename}</span>
                                  </div>
                                  <p className="text-xs text-slate-300">
                                    Foram extraídos <strong>{msg.extractedAttachment.count} lançamentos</strong> via visão computacional.
                                  </p>
                                  <button
                                    onClick={() => handleLoadChatAttachmentToStaging(msg.extractedAttachment!.transactions)}
                                    className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-md shadow-emerald-500/20 flex items-center justify-center gap-2 cursor-pointer border border-emerald-400"
                                  >
                                    <CheckCircle className="w-3.5 h-3.5" /> Abrir na Tabela de Conciliação
                                  </button>
                                </div>
                              )}

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
                      Analisando com Visão Computacional...
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

              {/* Chat Input Footer Form & Attachment Bar */}
              <div className="p-6 border-t border-white/5 bg-slate-900/40 backdrop-blur-md relative shrink-0">
                
                {/* Hidden File Input for Chat Attachment */}
                <input
                  type="file"
                  ref={chatFileInputRef}
                  onChange={handleChatFileSelect}
                  accept=".pdf,.png,.jpg,.jpeg"
                  className="hidden"
                />

                {/* Shortcuts Popup Menu */}
                {showShortcutsMenu && (
                  <div className="absolute bottom-full mb-3 left-6 right-6 bg-slate-900/95 border border-white/10 rounded-2xl p-3 shadow-2xl backdrop-blur-md z-30 animate-in fade-in zoom-in-95 duration-200">
                    <div className="flex items-center justify-between px-3 py-1.5 border-b border-white/5 mb-2">
                      <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 flex items-center gap-1.5">
                        <Command className="w-3.5 h-3.5" /> Atalhos do Gemini Brain
                      </span>
                      <button
                        onClick={() => setShowShortcutsMenu(false)}
                        className="text-slate-500 hover:text-slate-300"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
                      {CHAT_SHORTCUTS.map((sc) => {
                        const Icon = sc.icon;
                        return (
                          <button
                            key={sc.command}
                            type="button"
                            onClick={() => handleShortcutSelect(sc)}
                            className="p-2.5 rounded-xl hover:bg-white/5 flex items-start gap-3 text-left transition-all group cursor-pointer"
                          >
                            <div className="w-7 h-7 rounded-lg bg-slate-800 border border-white/5 flex items-center justify-center text-slate-400 group-hover:bg-emerald-500 group-hover:text-white transition-all shrink-0">
                              <Icon className="w-3.5 h-3.5" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-black text-white font-mono">{sc.command}</span>
                                <span className="text-[10px] font-bold text-slate-400">— {sc.label}</span>
                              </div>
                              <p className="text-[10px] text-slate-500 mt-0.5">{sc.description}</p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Attached File Preview Pill */}
                {chatAttachment && (
                  <div className="mb-3 flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 px-3.5 py-2 rounded-xl text-xs text-emerald-300 w-max animate-in">
                    <Paperclip className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="font-bold truncate max-w-xs">{chatAttachment.name}</span>
                    <span className="text-[10px] opacity-70">({(chatAttachment.size / 1024).toFixed(0)} KB)</span>
                    <button
                      type="button"
                      onClick={() => setChatAttachment(null)}
                      className="ml-2 text-slate-400 hover:text-red-400 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                <form 
                  onSubmit={handleSendChatMessage}
                  className="flex items-end gap-3"
                >
                  {/* Attachment Button */}
                  <button
                    type="button"
                    onClick={() => chatFileInputRef.current?.click()}
                    className="p-4 bg-slate-900 hover:bg-slate-850 text-slate-400 hover:text-emerald-400 border border-white/5 rounded-2xl transition-all cursor-pointer shrink-0"
                    title="Anexar extrato bancário (PDF / PNG / JPEG)"
                  >
                    <Paperclip className="w-5 h-5" />
                  </button>

                  {/* Textarea Input */}
                  <div className="flex-1 min-w-0 bg-slate-955 border border-white/5 rounded-2xl px-5 py-3.5 flex items-center shadow-inner focus-within:border-emerald-500/20 focus-within:bg-slate-950 transition-all duration-300">
                    <textarea
                      ref={chatTextareaRef}
                      rows={1}
                      value={inputMessage}
                      onChange={(e) => {
                        setInputMessage(e.target.value);
                        if (e.target.value.startsWith('/')) {
                          setShowShortcutsMenu(true);
                        }
                      }}
                      onKeyDown={handleKeyDown}
                      placeholder={
                        activeSessionId 
                          ? "Pergunte sobre seus saldos ou digite / para atalhos (ou anexe um PDF)..."
                          : "Digite sua pergunta ou digite / para atalhos e anexar extrato..."
                      }
                      className="w-full bg-transparent text-sm text-slate-200 focus:outline-none placeholder:text-slate-500 disabled:opacity-40 resize-none max-h-32 py-0.5 overflow-y-auto no-scrollbar"
                    />
                  </div>

                  {/* Shortcuts Button */}
                  <button
                    type="button"
                    onClick={() => setShowShortcutsMenu(!showShortcutsMenu)}
                    className="p-4 bg-slate-900 hover:bg-slate-850 text-slate-400 hover:text-emerald-400 border border-white/5 rounded-2xl transition-all cursor-pointer shrink-0 text-xs font-mono font-bold"
                    title="Menu de atalhos (/)"
                  >
                    /
                  </button>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={(!inputMessage.trim() && !chatAttachment) || chatLoading || compacting}
                    className="p-4 bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-500/30 text-white rounded-2xl shadow-xl shadow-emerald-500/20 transition-all flex items-center justify-center cursor-pointer border border-emerald-400 shrink-0"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </form>
              </div>

            </div>

            {/* Global Memory Modal */}
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
