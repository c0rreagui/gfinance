// Interactive View: Itaú Connect Hub
// Path: src/app/integrations/page.tsx
// Built under G-Finance World-Class design aesthetics (glassmorphic cards, HSL tailwind color schemes)

'use client';

import React, { useState, useEffect } from 'react';
import { 
  Link2, 
  RefreshCw, 
  CheckCircle, 
  AlertCircle, 
  HelpCircle, 
  FileText, 
  Database,
  Building,
  Key,
  ShieldCheck,
  ExternalLink
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface Connection {
  agency: string;
  account_number: string;
  client_id: string;
  last_synced_at: string | null;
}

interface SyncLog {
  id: string;
  status: string;
  records_synced: number;
  error_message: string | null;
  created_at: string;
}

export default function Integrations() {
  const [connection, setConnection] = useState<Connection>({
    agency: '4290',
    account_number: '47209-1',
    client_id: 'sandbox-client-id-4290',
    last_synced_at: null
  });
  const [logs, setLogs] = useState<SyncLog[]>([]);
  
  // Loading and feedback states
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Editable form inputs
  const [agencyInput, setAgencyInput] = useState('4290');
  const [accountInput, setAccountInput] = useState('47209-1');
  const [clientIdInput, setClientIdInput] = useState('sandbox-client-id-4290');
  const [savingSettings, setSavingSettings] = useState(false);

  const fetchConnectionAndLogs = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // 1. Fetch connection details
        const { data: conn } = await supabase
          .from('itau_connections')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (conn) {
          setConnection(conn);
          setAgencyInput(conn.agency);
          setAccountInput(conn.account_number);
          setClientIdInput(conn.client_id);
        }

        // 2. Fetch sync logs
        const { data: syncLogs } = await supabase
          .from('itau_sync_logs')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(5);

        setLogs(syncLogs || []);
      }
    } catch (e) {
      console.error('Error loading integration details:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConnectionAndLogs();
  }, []);

  // Sincronizar via gateway server action
  const handleSync = async () => {
    setErrorMsg('');
    setSuccessMsg('');
    setSyncing(true);

    try {
      const response = await fetch('/api/itau/sync', {
        method: 'POST'
      });

      const data = await response.json();

      if (!response.ok || data.error) {
        throw new Error(data.error || 'Erro inesperado na sincronização.');
      }

      setSuccessMsg(`Extrato sincronizado com sucesso no modo: ${data.mode}. ${data.syncedRecords} novas transações adicionadas!`);
      
      // Reload everything
      await fetchConnectionAndLogs();
    } catch (err: any) {
      setErrorMsg(err.message || 'Falha de comunicação com a API do Itaú.');
    } finally {
      setSyncing(false);
    }
  };

  // Salvar configurações locais de conta
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setSavingSettings(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado.');

      const { error } = await supabase
        .from('itau_connections')
        .upsert({
          user_id: user.id,
          agency: agencyInput,
          account_number: accountInput,
          client_id: clientIdInput,
          created_at: new Date().toISOString()
        });

      if (error) throw error;
      
      setSuccessMsg('Configurações de integração atualizadas com sucesso!');
      await fetchConnectionAndLogs();
    } catch (err: any) {
      setErrorMsg(err.message || 'Falha ao salvar preferências de conexão.');
    } finally {
      setSavingSettings(false);
    }
  };

  return (
    <main className="flex-1 overflow-y-auto p-8 no-scrollbar relative h-full">
      <div className="max-w-4xl mx-auto space-y-8 animate-in">
        
        {/* Title Hub Header */}
        <div className="flex justify-between items-center bg-white/40 dark:bg-slate-800/40 p-8 rounded-[32px] border border-white/50 dark:border-white/5 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-orange-500 rounded-3xl flex items-center justify-center text-white shadow-xl shadow-orange-500/20">
              <Link2 className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-xl font-black dark:text-white">Itaú Connect</h3>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mt-1">
                Integração BaaS & Open Finance Corporativo
              </p>
            </div>
          </div>
          <a 
            href="https://devportal.itau.com.br/baas/#/" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="flex items-center gap-1 text-[10px] font-black text-orange-500 hover:text-orange-600 transition-colors uppercase tracking-widest cursor-pointer"
          >
            Itaú Portal <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

        {/* Status Alerts Banners */}
        {errorMsg && (
          <div className="p-5 bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 rounded-3xl flex items-start gap-3 text-sm animate-in">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-black uppercase tracking-wider text-xs">Erro de Integração</p>
              <p>{errorMsg}</p>
            </div>
          </div>
        )}

        {successMsg && (
          <div className="p-5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-3xl flex items-start gap-3 text-sm animate-in">
            <CheckCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-black uppercase tracking-wider text-xs">Ação Concluída</p>
              <p>{successMsg}</p>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Left Column: Sincronizador & Configurações */}
            <div className="lg:col-span-2 space-y-8">
              
              {/* Synchronize Action Panel */}
              <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-md p-8 rounded-[40px] border border-white/50 dark:border-white/5 shadow-sm relative overflow-hidden">
                <div className="absolute right-0 top-0 w-32 h-32 bg-orange-500/5 rounded-full blur-2xl pointer-events-none"></div>
                
                <h4 className="font-black text-lg mb-2 dark:text-white">Central de Sincronização</h4>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-6">Execução do extrato bancário</p>

                <div className="bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-white/5 rounded-3xl p-6 mb-8 flex justify-between items-center">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      <span className="text-xs font-black dark:text-white uppercase tracking-wider">Gateway Prontificado</span>
                    </div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase">
                      Última sincronização: {connection.last_synced_at ? new Date(connection.last_synced_at).toLocaleString('pt-BR') : 'Nunca sincronizado'}
                    </p>
                  </div>
                  <button
                    onClick={handleSync}
                    disabled={syncing}
                    className="px-6 py-4 bg-orange-500 hover:bg-orange-600 text-white text-xs font-black rounded-2xl uppercase tracking-widest shadow-xl shadow-orange-500/20 transition-all duration-300 disabled:opacity-50 cursor-pointer flex items-center gap-2"
                  >
                    <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
                    {syncing ? 'Sincronizando...' : 'Sincronizar Agora'}
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="flex gap-4">
                    <div className="p-3.5 bg-orange-500/10 text-orange-600 rounded-2xl shrink-0">
                      <Building className="w-6 h-6" />
                    </div>
                    <div>
                      <h5 className="text-sm font-black dark:text-white">Conexão BaaS Mapeada</h5>
                      <p className="text-xs text-slate-400 mt-1">
                        Agência: **{connection.agency}** | Conta: **{connection.account_number}**
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="p-3.5 bg-orange-500/10 text-orange-600 rounded-2xl shrink-0">
                      <ShieldCheck className="w-6 h-6" />
                    </div>
                    <div>
                      <h5 className="text-sm font-black dark:text-white">Validação Antiduplicidade Ativa</h5>
                      <p className="text-xs text-slate-400 mt-1">
                        Chave hash determinística ativa no gateway. Sem riscos de lançamentos duplicados no dashboard.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Edit Agency & Account Config Card */}
              <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-md p-8 rounded-[40px] border border-white/50 dark:border-white/5 shadow-sm">
                <h4 className="font-black text-lg mb-6 dark:text-white">Ajustes da Conta Itaú</h4>
                
                <form onSubmit={handleSaveSettings} className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Agência</label>
                      <input 
                        type="text" 
                        required
                        value={agencyInput}
                        onChange={(e) => setAgencyInput(e.target.value)}
                        placeholder="Ex: 4290"
                        className="w-full px-4 py-3.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 dark:text-white font-bold"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Conta Corrente</label>
                      <input 
                        type="text" 
                        required
                        value={accountInput}
                        onChange={(e) => setAccountInput(e.target.value)}
                        placeholder="Ex: 47209-1"
                        className="w-full px-4 py-3.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 dark:text-white font-bold"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Client ID (Sandbox / Prod)</label>
                    <div className="relative">
                      <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                      <input 
                        type="text" 
                        required
                        value={clientIdInput}
                        onChange={(e) => setClientIdInput(e.target.value)}
                        placeholder="Insira seu client_id do Itaú Portal"
                        className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 dark:text-white font-mono"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button 
                      type="submit"
                      disabled={savingSettings}
                      className="px-8 py-3.5 bg-slate-900 hover:bg-slate-800 text-white text-[10px] font-black rounded-xl uppercase tracking-widest transition-all cursor-pointer disabled:opacity-50"
                    >
                      {savingSettings ? 'Salvando...' : 'Salvar Preferências'}
                    </button>
                  </div>
                </form>
              </div>

            </div>

            {/* Right Column: Histórico de Sincronizações Logs */}
            <div className="space-y-8">
              
              {/* Info guidelines box */}
              <div className="bg-gradient-to-br from-orange-500/10 via-amber-500/5 to-transparent p-6 rounded-[32px] border border-orange-500/10">
                <h5 className="font-black text-orange-800 dark:text-orange-400 text-sm mb-2 flex items-center gap-1.5">
                  <Database className="w-4 h-4" /> Sandbox Integrado
                </h5>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  Sem os certificados PEM configurados no servidor, a API opera no **Modo Simulador de Sandbox**. Ele insere lançamentos de e-CNPJ realistas para validação de dashboard de forma segura e autônoma.
                </p>
              </div>

              {/* Sync History Logs Table */}
              <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-md p-6 rounded-[32px] border border-white/50 dark:border-white/5 shadow-sm">
                <h4 className="font-black text-sm mb-4 dark:text-white flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-orange-500" /> Histórico de Sync
                </h4>

                {logs.length === 0 ? (
                  <div className="text-center py-8 text-slate-400 text-xs">
                    Nenhum registro de sync localizado no banco.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {logs.map((log) => {
                      const isSuccess = log.status === 'success';
                      return (
                        <div key={log.id} className="p-3.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-white/5 rounded-2xl flex justify-between items-center">
                          <div className="space-y-0.5">
                            <span className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-wider ${
                              isSuccess ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400' : 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-400'
                            }`}>
                              {log.status === 'success' ? 'Sucesso' : 'Falha'}
                            </span>
                            <p className="text-[8px] text-slate-400 mt-1">
                              {new Date(log.created_at).toLocaleString('pt-BR')}
                            </p>
                          </div>
                          <span className="text-xs font-black dark:text-white">
                            {isSuccess ? `+${log.records_synced} txs` : 'Erro API'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

            </div>

          </div>
        )}

      </div>
    </main>
  );
}
