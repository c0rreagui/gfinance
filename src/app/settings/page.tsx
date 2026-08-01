'use client';

import React, { useState, useEffect, useRef } from 'react';
import { User, Shield, Bell, Eye, KeyRound, CheckCircle, HelpCircle, AlertCircle, Brain, Trash2, Check, SlidersHorizontal } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { encryptPassword } from '@/lib/crypto';
import { reconcileBalances } from '@/lib/reconcile';

interface Profile {
  id: string;
  full_name: string;
  avatar_url: string;
  pin: string | null;
  initial_balance?: number;
}
const PRESETS_MODELS = {
  ollama: [
    { label: 'Qwen 2.5 Vision (Multimodal)', value: 'qwen2.5-vl' },
    { label: 'Qwen 2 VL (Vision)', value: 'qwen2-vl' },
    { label: 'LLaVA (Vision)', value: 'llava' },
    { label: 'Qwen 2.5 Coder', value: 'qwen2.5-coder' },
    { label: 'Qwen 2 7B', value: 'qwen2:7b' },
    { label: 'Qwen 2', value: 'qwen2' },
    { label: 'Llama 3.3 70B', value: 'llama3.3:70b' },
    { label: 'Llama 3 (Padrão)', value: 'llama3' },
    { label: 'Llama 3 8B', value: 'llama3:8b' },
    { label: 'Gemma 2 (Padrão)', value: 'gemma2' },
    { label: 'Gemma 2 9B', value: 'gemma2:9b' },
    { label: 'Mistral 7B', value: 'mistral' },
    { label: 'Phi 3', value: 'phi3' },
  ],
  openai: [
    { label: 'GPT-4o (Flagship)', value: 'gpt-4o' },
    { label: 'GPT-4o Mini (Fast & Cheap)', value: 'gpt-4o-mini' },
    { label: 'GPT-4 Turbo', value: 'gpt-4-turbo' },
    { label: 'GPT-4', value: 'gpt-4' },
    { label: 'GPT-3.5 Turbo', value: 'gpt-3.5-turbo' },
  ]
};

export default function Settings() {
  const [profile, setProfile] = useState<Profile>({ id: '', full_name: '', avatar_url: '', pin: null, initial_balance: 0 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [email, setEmail] = useState('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Custom toggles
  const [pushNotif, setPushNotif] = useState(true);
  const [twoFactor, setTwoFactor] = useState(false);

  // PIN settings state
  const [newPin, setNewPin] = useState('');
  const [verifyPassword, setVerifyPassword] = useState('');
  const [pinSavedOnDevice, setPinSavedOnDevice] = useState(false);
  const [pinError, setPinError] = useState('');
  const [pinSuccess, setPinSuccess] = useState('');

  // Profile banner feedback states
  const [profileError, setProfileError] = useState('');
  const [profileSuccess, setProfileSuccess] = useState('');

  // Google OAuth identities linking states
  const [identities, setIdentities] = useState<any[]>([]);
  const [linkingError, setLinkingError] = useState('');
  const [linkingSuccess, setLinkingSuccess] = useState('');
  const [oauthSessionToSync, setOauthSessionToSync] = useState<any>(null);

  // Google Drive sync states
  const [folders, setFolders] = useState<{ id: string; name: string }[]>([]);
  const [foldersLoading, setFoldersLoading] = useState(false);
  const [foldersError, setFoldersError] = useState('');
  const [driveFolderId, setDriveFolderId] = useState('');
  const [driveFolderName, setDriveFolderName] = useState('');
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncSuccessMsg, setSyncSuccessMsg] = useState('');
  const [syncErrorMsg, setSyncErrorMsg] = useState('');
  const [folderSearch, setFolderSearch] = useState('');

  // AI Agent Memory states
  const [activeAiTab, setActiveAiTab] = useState<'persona' | 'alma' | 'funcoes' | 'contexto' | 'dynamic'>('persona');
  const [staticContent, setStaticContent] = useState('');
  const [staticLoading, setStaticLoading] = useState(false);
  const [staticSuccess, setStaticSuccess] = useState('');
  const [staticError, setStaticError] = useState('');
  const [dynamicMemories, setDynamicMemories] = useState<any[]>([]);
  const [dynamicLoading, setDynamicLoading] = useState(false);

  // Custom LLM Settings states
  const [llmProvider, setLlmProvider] = useState<'gemini' | 'ollama' | 'openai' | 'custom'>('gemini');
  const [llmApiUrl, setLlmApiUrl] = useState('');
  const [llmApiKey, setLlmApiKey] = useState('');
  const [llmModel, setLlmModel] = useState('');
  const [testingLlm, setTestingLlm] = useState(false);
  const [llmTestResult, setLlmTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isCustomModel, setIsCustomModel] = useState(false);

  const fetchStaticMemory = async (type: string) => {
    setStaticLoading(true);
    setStaticError('');
    setStaticSuccess('');
    try {
      const res = await fetch(`/api/tasks/memories/static?type=${type}`);
      if (!res.ok) throw new Error('Falha ao ler arquivo de memória.');
      const data = await res.json();
      setStaticContent(data.content || '');
    } catch (err: any) {
      setStaticError(err.message || 'Erro ao carregar memória estática.');
    } finally {
      setStaticLoading(false);
    }
  };

  const fetchDynamicMemories = async () => {
    setDynamicLoading(true);
    setStaticError('');
    setStaticSuccess('');
    try {
      const res = await fetch('/api/tasks/memories/dynamic?onlyActive=false');
      if (!res.ok) throw new Error('Falha ao buscar aprendizados.');
      const data = await res.json();
      setDynamicMemories(data.memories || []);
    } catch (err: any) {
      setStaticError(err.message || 'Erro ao carregar memórias dinâmicas.');
    } finally {
      setDynamicLoading(false);
    }
  };

  const handleSaveStatic = async () => {
    setStaticLoading(true);
    setStaticError('');
    setStaticSuccess('');
    try {
      const res = await fetch('/api/tasks/memories/static', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: activeAiTab, content: staticContent })
      });
      if (!res.ok) throw new Error('Falha ao salvar arquivo.');
      setStaticSuccess('Arquivo de memória salvo com sucesso localmente!');
    } catch (err: any) {
      setStaticError(err.message || 'Erro ao salvar memória estática.');
    } finally {
      setStaticLoading(false);
    }
  };

  const handleDeleteDynamic = async (id: string) => {
    if (!confirm('Deseja excluir permanentemente esta diretriz da memória do agente?')) return;
    try {
      const res = await fetch(`/api/tasks/memories/dynamic?id=${id}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error('Falha ao excluir aprendizado.');
      setDynamicMemories(prev => prev.filter(m => m.id !== id));
      setStaticSuccess('Diretriz removida da memória do agente.');
    } catch (err: any) {
      setStaticError(err.message || 'Erro ao excluir aprendizado.');
    }
  };

  const handleToggleDynamic = async (id: string, active: boolean) => {
    try {
      const res = await fetch('/api/tasks/memories/dynamic', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, is_active: active })
      });
      if (!res.ok) throw new Error('Falha ao atualizar status da diretriz.');
      setDynamicMemories(prev => prev.map(m => m.id === id ? { ...m, is_active: active } : m));
    } catch (err: any) {
      setStaticError(err.message || 'Erro ao atualizar status da diretriz.');
    }
  };

  useEffect(() => {
    if (activeAiTab === 'dynamic') {
      fetchDynamicMemories();
    } else {
      fetchStaticMemory(activeAiTab);
    }
  }, [activeAiTab]);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setEmail(user.email || '');
        setIdentities(user.identities || []);
        
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        let currentProfile = data;

        // Auto-sync Google credentials if the user has Google linked but public.profiles has empty/missing details
        const hasGoogle = user.identities?.some((id: any) => id.provider === 'google') ?? false;
        if (hasGoogle && user.user_metadata?.avatar_url && (!data || !data.avatar_url)) {
          const updatedAvatar = data?.avatar_url || user.user_metadata.avatar_url;
          const updatedName = data?.full_name || user.user_metadata.full_name || 'Guilherme R.';
          
          await supabase
            .from('profiles')
            .upsert({
              id: user.id,
              full_name: updatedName,
              avatar_url: updatedAvatar,
              updated_at: new Date().toISOString()
            });
            
          currentProfile = {
            id: user.id,
            full_name: updatedName,
            avatar_url: updatedAvatar,
            pin: data?.pin || null,
            initial_balance: Number(data?.initial_balance) || 0
          };
        }

        if (error && !currentProfile) {
          const defaultProfile = {
            id: user.id,
            full_name: user.user_metadata?.full_name || 'Guilherme R.',
            avatar_url: user.user_metadata?.avatar_url || '',
            pin: null,
            initial_balance: 0
          };
          setProfile(defaultProfile);
        } else {
          if (currentProfile) {
            currentProfile.initial_balance = Number(currentProfile.initial_balance) || 0;
            setPushNotif(currentProfile.push_notifications_enabled !== false);
            setTwoFactor(!!currentProfile.two_factor_enabled);
            setDriveFolderId(currentProfile.google_drive_folder_id || '');
            setDriveFolderName(currentProfile.google_drive_folder_name || '');
            setLastSyncAt(currentProfile.google_drive_last_sync_at || null);
            const provider = currentProfile.llm_provider || 'gemini';
            const modelVal = currentProfile.llm_model || '';
            setLlmProvider(provider as any);
            setLlmApiUrl(currentProfile.llm_api_url || '');
            setLlmApiKey(currentProfile.llm_api_key || '');
            setLlmModel(modelVal);

            // Determine if model is custom
            const presets = PRESETS_MODELS[provider as 'ollama' | 'openai'] || [];
            const isPreset = presets.some(m => m.value === modelVal);
            setIsCustomModel(modelVal !== '' && !isPreset);
          }
          setProfile(currentProfile);
        }

        // Check if device already has a bound PIN
        try {
          const storedEmail = localStorage.getItem('gfinance_user_email');
          const storedEncrypted = localStorage.getItem('gfinance_encrypted_pass');
          if (storedEmail && storedEncrypted && storedEmail === user.email) {
            setPinSavedOnDevice(true);
          }
        } catch (e) {}
      }
    } catch (err) {
      console.error('Error fetching user profile:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();

    // Listener síncrono para evitar deadlocks de Web Lock no Supabase SDK
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.provider_token) {
        setOauthSessionToSync(session);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Efeito secundário para executar operações assíncronas fora do lock do onAuthStateChange
  useEffect(() => {
    if (!oauthSessionToSync) return;

    const persistOauthTokens = async () => {
      const session = oauthSessionToSync;
      setOauthSessionToSync(null); // Consome a sessão imediatamente para evitar loops

      const expiresAt = new Date(Date.now() + 3600 * 1000).toISOString();
      const updateData: {
        google_access_token: string;
        google_token_expires_at: string;
        updated_at: string;
        google_refresh_token?: string;
      } = {
        google_access_token: session.provider_token,
        google_token_expires_at: expiresAt,
        updated_at: new Date().toISOString(),
      };

      if (session.provider_refresh_token) {
        updateData.google_refresh_token = session.provider_refresh_token;
      }

      try {
        const { error: updateError } = await supabase
          .from('profiles')
          .update(updateData)
          .eq('id', session.user.id);
        
        if (updateError) {
          console.error('[OAuth Client Sync Settings] Failed to update profile tokens:', updateError.message);
        } else {
          console.log('[OAuth Client Sync Settings] Successfully persisted Google tokens client-side!');
          fetchProfile();
        }
      } catch (err) {
        console.error('[OAuth Client Sync Settings] Exception during token sync:', err);
      }
    };

    const timer = setTimeout(() => {
      persistOauthTokens();
    }, 0);

    return () => clearTimeout(timer);
  }, [oauthSessionToSync]);

  const fetchFolders = async (search = '') => {
    setFoldersLoading(true);
    setFoldersError('');
    try {
      const res = await fetch(`/api/auth/google-drive/folders?search=${encodeURIComponent(search)}`);
      if (!res.ok) {
        throw new Error('Falha ao obter pastas do Google Drive');
      }
      const data = await res.json();
      setFolders(data.folders || []);
    } catch (err: any) {
      setFoldersError(err.message || 'Erro ao carregar pastas');
    } finally {
      setFoldersLoading(false);
    }
  };

  useEffect(() => {
    const hasGoogle = identities.some((id: any) => id.provider === 'google');
    if (!hasGoogle) return;

    const delayDebounce = setTimeout(() => {
      fetchFolders(folderSearch);
    }, 500);

    return () => clearTimeout(delayDebounce);
  }, [folderSearch, identities]);

  const handleFolderChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const folderId = e.target.value;
    const folderName = folders.find(f => f.id === folderId)?.name || '';
    setDriveFolderId(folderId);
    setDriveFolderName(folderName);

    // Auto-salvar no banco de dados imediatamente ao alterar a pasta
    if (profile.id && folderId) {
      try {
        const { error } = await supabase
          .from('profiles')
          .update({
            google_drive_folder_id: folderId,
            google_drive_folder_name: folderName,
            updated_at: new Date().toISOString()
          })
          .eq('id', profile.id);

        if (error) throw error;
      } catch (err: any) {
        console.error('[Google Drive settings] Erro ao auto-salvar pasta:', err.message);
      }
    }
  };

  const handleSyncDrive = async () => {
    if (syncing) return;
    setSyncing(true);
    setSyncSuccessMsg('');
    setSyncErrorMsg('');
    try {
      const res = await fetch('/api/tasks/sync-drive', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          folderId: driveFolderId,
          folderName: driveFolderName,
        }),
      });
      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || 'Erro ao sincronizar');
      }
      if (result.success) {
        setSyncSuccessMsg(`Sincronização concluída! ${result.filesImported} novos arquivos importados (${result.filesScanned} escaneados na pasta "${result.folderName}").`);
        setLastSyncAt(result.lastSyncAt);
      } else {
        setSyncErrorMsg(result.message || 'Falha na sincronização.');
      }
    } catch (err: any) {
      setSyncErrorMsg(err.message || 'Erro de rede ao sincronizar');
    } finally {
      setSyncing(false);
    }
  };

  const handleLinkGoogle = async () => {
    setLinkingError('');
    setLinkingSuccess('');
    try {
      const hasGoogle = identities.some((id: any) => id.provider === 'google');
      if (hasGoogle) {
        // Se já possui Google vinculado, re-autentica via OAuth para obter os novos escopos
        const { error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: `${window.location.origin}/auth/callback?next=/settings`,
            scopes: 'https://www.googleapis.com/auth/cloud-platform openid email profile https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/calendar.events',
            queryParams: {
              access_type: 'offline',
              prompt: 'consent',
            }
          }
        });
        if (error) throw error;
      } else {
        // Se não tem Google vinculado, faz a vinculação normal
        const { error } = await supabase.auth.linkIdentity({
          provider: 'google',
          options: {
            redirectTo: `${window.location.origin}/auth/callback?next=/settings`,
            scopes: 'https://www.googleapis.com/auth/cloud-platform openid email profile https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/calendar.events',
            queryParams: {
              access_type: 'offline',
              prompt: 'consent',
            }
          }
        });
        if (error) throw error;
      }
    } catch (err: any) {
      setLinkingError(err.message || 'Erro ao iniciar vinculação da conta Google.');
    }
  };

  const handleUnlinkGoogle = async () => {
    setLinkingError('');
    setLinkingSuccess('');
    try {
      const googleIdentity = identities.find((id: any) => id.provider === 'google');
      if (!googleIdentity) {
        setLinkingError('Conta Google não vinculada ou não encontrada.');
        return;
      }
      
      const { error } = await supabase.auth.unlinkIdentity(googleIdentity);
      if (error) throw error;

      setLinkingSuccess('Conta Google desvinculada com sucesso.');
      await fetchProfile();
    } catch (err: any) {
      setLinkingError(err.message || 'Erro ao desvincular conta Google. Certifique-se de que possui uma senha válida.');
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile.id) return;
    setProfileError('');
    setProfileSuccess('');
    
    try {
      setSaving(true);
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: profile.id,
          full_name: profile.full_name,
          avatar_url: profile.avatar_url,
          initial_balance: profile.initial_balance || 0,
          push_notifications_enabled: pushNotif,
          two_factor_enabled: twoFactor,
          google_drive_folder_id: driveFolderId,
          google_drive_folder_name: driveFolderName,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;
      
      // Dynamic on-the-fly reconciliation
      await reconcileBalances(supabase, profile.id);
      
      setProfileSuccess('Perfil atualizado e saldos reconciliados com sucesso!');
    } catch (err: any) {
      setProfileError(`Erro ao salvar perfil: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveLLMSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile.id) return;
    setProfileError('');
    setProfileSuccess('');
    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          llm_provider: llmProvider,
          llm_api_url: llmApiUrl || null,
          llm_api_key: llmApiKey || null,
          llm_model: llmModel || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', profile.id);

      if (error) throw error;
      setProfileSuccess('Configurações de inteligência artificial salvas com sucesso!');
      await fetchProfile();
    } catch (err: any) {
      setProfileError(`Erro ao salvar configurações de LLM: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleTestLLMConnection = async () => {
    setTestingLlm(true);
    setLlmTestResult(null);
    try {
      const res = await fetch('/api/ai/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: llmProvider,
          apiUrl: llmApiUrl,
          apiKey: llmApiKey,
          model: llmModel
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setLlmTestResult({ success: true, message: 'Conexão estabelecida com sucesso!' });
      } else {
        setLlmTestResult({ success: false, message: data.error || 'Erro desconhecido na resposta.' });
      }
    } catch (err: any) {
      setLlmTestResult({ success: false, message: err.message || 'Erro de rede ao testar conexão.' });
    } finally {
      setTestingLlm(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setProfileError('');
    setProfileSuccess('');
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setProfileError('A imagem deve ter no máximo 2MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setProfile({ ...profile, avatar_url: event.target.result as string });
        setProfileSuccess('Foto carregada localmente. Clique em "Salvar Alterações" para salvar definitivamente.');
      }
    };
    reader.readAsDataURL(file);
  };

  // Configure fast PIN login on this device
  const handleSetupPin = async (e: React.FormEvent) => {
    e.preventDefault();
    setPinError('');
    setPinSuccess('');

    if (!/^\d{4}$/.test(newPin)) {
      setPinError('O PIN deve conter exatamente 4 números.');
      return;
    }

    if (!verifyPassword) {
      setPinError('Você deve digitar a sua senha atual para fins de validação.');
      return;
    }

    try {
      setSaving(true);
      // 1. Verify password by attempting to sign in
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password: verifyPassword
      });

      if (signInError) {
        throw new Error(`Erro de validação: ${signInError.message} (Verifique se a senha está correta ou se sua conta utiliza login social como Google/GitHub).`);
      }

      // 2. Encrypt password locally using PIN as the key
      const encrypted = encryptPassword(verifyPassword, newPin);
      localStorage.setItem('gfinance_user_email', email);
      localStorage.setItem('gfinance_encrypted_pass', encrypted);

      // 3. Save hashed/flag pin in public.profiles table
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ pin: newPin })
        .eq('id', profile.id);

      if (updateError) throw updateError;

      setPinSavedOnDevice(true);
      setVerifyPassword('');
      setNewPin('');
      setPinSuccess('PIN ativado e configurado com sucesso neste dispositivo!');
      
      // Update local profile state
      setProfile({ ...profile, pin: newPin });
    } catch (err: any) {
      setPinError(err.message || 'Erro ao configurar PIN.');
    } finally {
      setSaving(false);
    }
  };

  // Deactivate PIN login
  const handleDeactivatePin = async () => {
    setPinError('');
    setPinSuccess('');
    try {
      setSaving(true);
      
      // 1. Remove database entry
      const { error } = await supabase
        .from('profiles')
        .update({ pin: null })
        .eq('id', profile.id);

      if (error) throw error;

      // 2. Remove local credentials bindings
      localStorage.removeItem('gfinance_user_email');
      localStorage.removeItem('gfinance_encrypted_pass');

      setPinSavedOnDevice(false);
      setProfile({ ...profile, pin: null });
      setPinSuccess('PIN desativado com sucesso neste dispositivo.');
    } catch (err: any) {
      setPinError(err.message || 'Erro ao desativar PIN.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden relative h-full">
      <main className="flex-1 overflow-y-auto p-8 no-scrollbar relative z-0">
        <div className="max-w-4xl mx-auto space-y-8 animate-in">
          
          {/* User Profile Panel */}
          <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-md p-10 rounded-[48px] border border-white/50 dark:border-white/5 shadow-sm">
            <h4 className="font-black text-xl mb-8 dark:text-white">Perfil do Usuário</h4>
            {loading ? (
              <div className="flex justify-center items-center py-10">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-emerald-500"></div>
              </div>
            ) : (
              <form onSubmit={handleSaveProfile}>
                {profileError && (
                  <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 rounded-2xl flex items-start gap-2 mb-6 text-sm">
                    <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                    <span>{profileError}</span>
                  </div>
                )}

                {profileSuccess && (
                  <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-start gap-2 mb-6 text-sm">
                    <CheckCircle className="w-5 h-5 shrink-0 mt-0.5" />
                    <span>{profileSuccess}</span>
                  </div>
                )}

                <div className="flex items-center gap-8 mb-10">
                  <div className="w-24 h-24 rounded-3xl bg-slate-100 dark:bg-slate-800/50 border-4 border-white dark:border-slate-700 shadow-xl flex items-center justify-center text-slate-300 overflow-hidden relative group">
                    {profile.avatar_url ? (
                      <img 
                        src={profile.avatar_url} 
                        alt="Avatar" 
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" 
                      />
                    ) : (
                      <User className="w-12 h-12 text-slate-400" />
                    )}
                  </div>
                  <div className="space-y-2">
                    <button 
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-6 py-2.5 bg-slate-900 text-white text-[10px] font-black rounded-xl uppercase tracking-widest hover:bg-slate-800 transition-all cursor-pointer"
                    >
                      Alterar Foto
                    </button>
                    <input 
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      accept="image/*"
                      className="hidden"
                    />
                    <p className="text-xs text-slate-400">JPG, PNG ou GIF. Tamanho máximo 2MB.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Nome Completo</label>
                    <input 
                      type="text" 
                      value={profile.full_name}
                      onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                      className="w-full px-6 py-4 bg-white/40 dark:bg-slate-800/40 border border-slate-200 dark:border-white/5 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all font-bold text-slate-700 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">E-mail</label>
                    <input 
                      type="email" 
                      disabled
                      value={email}
                      className="w-full px-6 py-4 bg-slate-100/50 dark:bg-slate-900/50 border border-slate-200 dark:border-white/5 rounded-2xl font-bold text-slate-400 dark:text-slate-500 cursor-not-allowed"
                    />
                  </div>
                  <div className="md:col-span-2 mt-4">
                    <div className="p-6 bg-slate-500/5 dark:bg-slate-900/40 rounded-3xl border border-slate-100 dark:border-white/5 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Saldo Inicial da Conta</label>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Ajuste o saldo de partida da sua conta. Esse valor será somado às suas receitas e despesas para consolidar o saldo total exibido no painel principal.
                        </p>
                      </div>
                      <div className="relative w-full md:w-64">
                        <span className="absolute left-6 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">R$</span>
                        <input 
                          type="number" 
                          step="0.01"
                          placeholder="0,00"
                          value={profile.initial_balance !== undefined ? profile.initial_balance : ''}
                          onChange={(e) => setProfile({ ...profile, initial_balance: e.target.value !== '' ? parseFloat(e.target.value) : 0 })}
                          className="w-full pl-12 pr-6 py-4 bg-white/40 dark:bg-slate-800/40 border border-slate-200 dark:border-white/5 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all font-bold text-slate-700 dark:text-white"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-10 pt-10 border-t border-slate-100 dark:border-white/5 flex justify-end">
                  <button 
                    type="submit"
                    disabled={saving}
                    className="px-10 py-4 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-black rounded-2xl uppercase tracking-widest shadow-xl shadow-emerald-500/20 transition-all cursor-pointer disabled:opacity-50"
                  >
                    {saving ? 'Salvando...' : 'Salvar Alterações'}
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Linked Accounts Panel */}
          <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-md p-10 rounded-[48px] border border-white/50 dark:border-white/5 shadow-sm">
            <h4 className="font-black text-xl mb-4 dark:text-white flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0"></span> Contas Vinculadas
            </h4>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-8">
              Conecte sua conta do Google para importar automaticamente sua foto de perfil, sincronizar seu nome completo e permitir login com um clique.
            </p>

            {linkingError && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 rounded-2xl flex items-start gap-2 mb-6 text-sm">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <span>{linkingError}</span>
              </div>
            )}

            {linkingSuccess && (
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-start gap-2 mb-6 text-sm">
                <CheckCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <span>{linkingSuccess}</span>
              </div>
            )}

            {identities.some((id: any) => id.provider === 'google') ? (
              <div className="p-6 rounded-3xl bg-slate-100/50 dark:bg-slate-900/40 border border-slate-200 dark:border-white/5 flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-white dark:bg-slate-800 flex items-center justify-center border border-slate-200 dark:border-white/10 shadow-sm shrink-0">
                    <svg className="w-6 h-6 text-slate-800 dark:text-white" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12.24 10.285V14.4h6.887c-.648 2.41-2.519 4.114-5.18 4.114-3.553 0-6.438-2.885-6.438-6.437 0-3.553 2.885-6.438 6.437-6.438 1.54 0 2.947.55 4.054 1.45l3.078-3.078C19.23 2.38 15.973 1 12.24 1 6.033 1 1 6.033 1 12.24s5.033 11.24 11.24 11.24c6.478 0 11.24-4.555 11.24-11.24 0-.79-.08-1.384-.24-1.955H12.24z"/>
                    </svg>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h5 className="font-black text-slate-900 dark:text-white text-sm">Google</h5>
                      <span className="text-[9px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-500 px-2 py-0.5 rounded-md">Vinculado</span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Conectado como {email}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleUnlinkGoogle}
                  className="px-5 py-2.5 bg-slate-900 text-white text-[10px] font-black rounded-xl uppercase tracking-widest hover:bg-slate-800 transition-all cursor-pointer shadow-sm border border-slate-800 dark:border-white/5 shrink-0"
                >
                  Desvincular
                </button>
              </div>
            ) : (
              <div className="p-6 rounded-3xl bg-slate-100/50 dark:bg-slate-900/40 border border-slate-200 dark:border-white/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-white dark:bg-slate-800/30 flex items-center justify-center border border-slate-200 dark:border-white/5 shrink-0">
                    <svg className="w-6 h-6 text-slate-400 dark:text-slate-500" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12.24 10.285V14.4h6.887c-.648 2.41-2.519 4.114-5.18 4.114-3.553 0-6.438-2.885-6.438-6.437 0-3.553 2.885-6.438 6.437-6.438 1.54 0 2.947.55 4.054 1.45l3.078-3.078C19.23 2.38 15.973 1 12.24 1 6.033 1 1 6.033 1 12.24s5.033 11.24 11.24 11.24c6.478 0 11.24-4.555 11.24-11.24 0-.79-.08-1.384-.24-1.955H12.24z"/>
                    </svg>
                  </div>
                  <div>
                    <h5 className="font-black text-slate-900 dark:text-white text-sm">Google</h5>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Conecte sua conta do Google de forma segura.</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleLinkGoogle}
                  className="px-6 py-3 bg-slate-900 hover:bg-slate-800 dark:bg-slate-950 dark:hover:bg-slate-900 border border-slate-800/80 dark:border-white/10 text-white text-[10px] font-black rounded-xl uppercase tracking-widest transition-all cursor-pointer shadow-md self-stretch sm:self-auto text-center shrink-0"
                >
                  Vincular Conta Google
                </button>
              </div>
            )}
          </div>

          {/* Google Drive Folder Sync Panel */}
          <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-md p-10 rounded-[48px] border border-white/50 dark:border-white/5 shadow-sm space-y-6">
            <div>
              <h4 className="font-black text-xl dark:text-white flex items-center gap-2.5">
                <svg className="w-6 h-6 text-blue-500" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19.43 12.98c.04-.32.07-.64.07-.98s-.03-.66-.07-.98l2.11-1.65c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.3-.61-.22l-2.49 1c-.52-.4-1.08-.73-1.69-.98l-.38-2.65C14.46.2 14.22 0 13.95 0h-4c-.27 0-.52.2-.57.47L9 3.12c-.61.25-1.17.59-1.69.98l-2.49-1c-.23-.09-.49 0-.61.22l-2 3.46c-.13.22-.07.49.12.64l2.11 1.65c-.04.32-.07.65-.07.98s.03.66.07.98l-2.11 1.65c-.19.15-.24.42-.12.64l2 3.46c.12.22.39.3.61.22l2.49-1c.52.4 1.08.73 1.69.98l.38 2.65c.05.27.3.47.57.47h4c.27 0 .52-.2.57-.47l.38-2.65c.61-.25 1.17-.59 1.69-.98l2.49 1c.23.09.49 0 .61-.22l2-3.46c.12-.22.07-.49-.12-.64l-2.11-1.65zM12 15.5c-1.93 0-3.5-1.57-3.5-3.5s1.57-3.5 3.5-3.5 3.5 1.57 3.5 3.5-1.57 3.5-3.5 3.5z" />
                </svg>
                Monitoramento do Google Drive (G-Work)
              </h4>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
                Selecione uma pasta do seu Google Drive para monitorar. O G-Work fará a varredura automática de arquivos de transcrição <code className="text-xs bg-slate-100 dark:bg-slate-900 px-1 py-0.5 rounded font-mono text-blue-500">.md</code> para alimentar sua base de conhecimento e organizar suas tarefas.
              </p>
            </div>

            {!identities.some((id: any) => id.provider === 'google') ? (
              <div className="p-6 rounded-3xl bg-slate-100/50 dark:bg-slate-900/40 border border-slate-200 dark:border-white/5 text-center space-y-3">
                <p className="text-xs text-slate-400 dark:text-slate-500">
                  Você precisa vincular sua conta do Google acima com a permissão de leitura de arquivos para ativar a sincronização do Drive.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {syncSuccessMsg && (
                  <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-start gap-2 text-sm font-semibold">
                    <CheckCircle className="w-5 h-5 shrink-0 mt-0.5" />
                    <span>{syncSuccessMsg}</span>
                  </div>
                )}

                {syncErrorMsg && (
                  <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 rounded-2xl flex items-start gap-2 text-sm font-semibold">
                    <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                    <span>{syncErrorMsg}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Pasta do Drive para Monitorar</label>
                    
                    <input
                      type="text"
                      placeholder="Pesquisar pasta pelo nome... (Ex: Drive Local)"
                      value={folderSearch}
                      onChange={(e) => setFolderSearch(e.target.value)}
                      className="w-full px-5 py-3 border border-slate-200 dark:border-white/5 bg-white/20 dark:bg-slate-950/20 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500/20 focus:outline-none dark:text-white font-medium"
                    />

                    {foldersLoading ? (
                      <div className="w-full px-6 py-4 bg-white/40 dark:bg-slate-800/40 border border-slate-200 dark:border-white/5 rounded-2xl text-xs text-slate-400 font-bold flex items-center gap-2">
                        <div className="animate-spin rounded-full h-3 w-3 border-t-2 border-emerald-500"></div>
                        Buscando pastas no seu Drive...
                      </div>
                    ) : foldersError ? (
                      <div className="w-full px-6 py-4 bg-red-500/5 border border-red-500/10 rounded-2xl text-xs text-red-500 font-bold">
                        {foldersError}. Reconecte seu Google.
                      </div>
                    ) : (
                      <select
                        value={driveFolderId}
                        onChange={handleFolderChange}
                        className="w-full px-6 py-4 bg-white/40 dark:bg-slate-800/40 border border-slate-200 dark:border-white/5 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all font-bold text-slate-700 dark:text-white text-xs cursor-pointer"
                      >
                        <option value="">Selecione uma pasta...</option>
                        {folders.map(f => (
                          <option key={f.id} value={f.id}>{f.name}</option>
                        ))}
                      </select>
                    )}
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3">
                    <button
                      type="button"
                      onClick={handleSyncDrive}
                      disabled={syncing || !driveFolderId}
                      className="flex-1 py-4 px-6 bg-slate-900 hover:bg-slate-800 dark:bg-slate-950 dark:hover:bg-slate-900 border border-slate-800 dark:border-white/5 text-white text-[10px] font-black rounded-xl uppercase tracking-widest transition-all cursor-pointer disabled:opacity-50 text-center flex items-center justify-center gap-2"
                    >
                      {syncing ? (
                        <>
                          <div className="animate-spin rounded-full h-3.5 w-3.5 border-t-2 border-white"></div>
                          <span>Sincronizando...</span>
                        </>
                      ) : (
                        <span>Sincronizar Agora</span>
                      )}
                    </button>
                  </div>
                </div>

                {lastSyncAt && (
                  <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500">
                    Última Sincronização: {new Date(lastSyncAt).toLocaleString('pt-BR')}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Personalização de LLM Panel */}
          <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-md p-10 rounded-[48px] border border-white/50 dark:border-white/5 shadow-sm space-y-8 animate-in">
            <div>
              <h4 className="font-black text-xl dark:text-white flex items-center gap-2.5">
                <SlidersHorizontal className="w-6 h-6 text-indigo-500" />
                Personalização de Inteligência Artificial (LLM)
              </h4>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
                Configure e personalize a inteligência dos assistentes do ecossistema G-Hub. Escolha o Gemini padrão ou aponte para um provedor externo compatível com OpenAI (como Ollama Cloud ou Ollama Local).
              </p>
            </div>

            <form onSubmit={handleSaveLLMSettings} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Provedor de LLM</label>
                  <select
                    value={llmProvider}
                    onChange={(e) => {
                      const prov = e.target.value as any;
                      setLlmProvider(prov);
                      setIsCustomModel(prov === 'custom');
                      setLlmModel('');
                    }}
                    className="w-full px-6 py-4 bg-white/40 dark:bg-slate-800/40 border border-slate-200 dark:border-white/5 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all font-bold text-slate-700 dark:text-white text-sm cursor-pointer"
                  >
                    <option value="gemini">Google Gemini (Nativo)</option>
                    <option value="ollama">Ollama Cloud / Local</option>
                    <option value="openai">OpenAI (GPT Models)</option>
                    <option value="custom">API Customizada (Compatível com OpenAI)</option>
                  </select>
                </div>

                {llmProvider !== 'gemini' && (
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Nome do Modelo (Model ID)</label>
                    <select
                      value={isCustomModel ? 'custom' : llmModel}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === 'custom') {
                          setIsCustomModel(true);
                          setLlmModel('');
                        } else {
                          setIsCustomModel(false);
                          setLlmModel(val);
                        }
                      }}
                      className="w-full px-6 py-4 bg-white/40 dark:bg-slate-800/40 border border-slate-200 dark:border-white/5 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all font-bold text-slate-700 dark:text-white text-sm cursor-pointer"
                      required
                    >
                      <option value="">Selecione um modelo...</option>
                      {llmProvider === 'ollama' && (
                        <optgroup label="Modelos Ollama">
                          {PRESETS_MODELS.ollama.map(m => (
                            <option key={m.value} value={m.value}>{m.label}</option>
                          ))}
                        </optgroup>
                      )}
                      {llmProvider === 'openai' && (
                        <optgroup label="Modelos OpenAI">
                          {PRESETS_MODELS.openai.map(m => (
                            <option key={m.value} value={m.value}>{m.label}</option>
                          ))}
                        </optgroup>
                      )}
                      <option value="custom">Outro (Especificar ID personalizado)...</option>
                    </select>
                  </div>
                )}

                {llmProvider !== 'gemini' && isCustomModel && (
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Model ID Personalizado</label>
                    <input
                      type="text"
                      placeholder="Ex: mistral-nemo, gemma2:2b"
                      value={llmModel}
                      onChange={(e) => setLlmModel(e.target.value)}
                      className="w-full px-6 py-4 bg-white/40 dark:bg-slate-800/40 border border-slate-200 dark:border-white/5 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all font-bold text-slate-700 dark:text-white"
                      required
                    />
                  </div>
                )}

                {llmProvider !== 'gemini' && (
                  <div className="md:col-span-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">URL Base da API (Opcional)</label>
                    <input
                      type="url"
                      placeholder={llmProvider === 'ollama' ? 'https://ollama.com' : llmProvider === 'openai' ? 'https://api.openai.com' : 'https://api.seumodelo.com'}
                      value={llmApiUrl}
                      onChange={(e) => setLlmApiUrl(e.target.value)}
                      className="w-full px-6 py-4 bg-white/40 dark:bg-slate-800/40 border border-slate-200 dark:border-white/5 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all font-bold text-slate-700 dark:text-white"
                    />
                    <p className="text-[10px] text-slate-400 mt-2">
                      Dica: Adicione o endereço raiz da API (ex: <code className="text-indigo-400">https://ollama.com</code>). O endpoint de chat completions (/v1/chat/completions) será resolvido automaticamente se omitido.
                    </p>
                  </div>
                )}

                {llmProvider !== 'gemini' && (
                  <div className="md:col-span-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">API Key (Chave de Autenticação)</label>
                    <input
                      type="password"
                      placeholder="Digite a chave de autenticação (API Key)"
                      value={llmApiKey}
                      onChange={(e) => setLlmApiKey(e.target.value)}
                      className="w-full px-6 py-4 bg-white/40 dark:bg-slate-800/40 border border-slate-200 dark:border-white/5 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all font-bold text-slate-700 dark:text-white"
                      required
                    />
                  </div>
                )}
              </div>

              {llmTestResult && (
                <div className={`p-4 rounded-2xl border text-sm font-semibold flex items-start gap-2 ${
                  llmTestResult.success
                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                    : 'bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400'
                }`}>
                  {llmTestResult.success ? (
                    <CheckCircle className="w-5 h-5 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                  )}
                  <span>{llmTestResult.message}</span>
                </div>
              )}

              <div className="pt-4 flex flex-col sm:flex-row justify-end gap-3">
                <button
                  type="button"
                  onClick={handleTestLLMConnection}
                  disabled={testingLlm || (llmProvider === 'custom' && !llmApiUrl)}
                  className="px-6 py-4 bg-slate-900 text-white dark:bg-slate-950 dark:hover:bg-slate-900 hover:bg-slate-800 border border-slate-800 dark:border-white/5 text-xs font-black rounded-2xl uppercase tracking-widest transition-all cursor-pointer disabled:opacity-50 text-center flex items-center justify-center gap-2"
                >
                  {testingLlm ? (
                    <>
                      <div className="animate-spin rounded-full h-3.5 w-3.5 border-t-2 border-white"></div>
                      <span>Testando Conexão...</span>
                    </>
                  ) : (
                    <span>Testar Conexão</span>
                  )}
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="px-10 py-4 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black rounded-2xl uppercase tracking-widest shadow-xl shadow-indigo-600/20 transition-all cursor-pointer disabled:opacity-50"
                >
                  {saving ? 'Salvando...' : 'Salvar Ajustes de IA'}
                </button>
              </div>
            </form>
          </div>

          {/* Agente IA (G-Work) Panel */}
          <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-md p-10 rounded-[48px] border border-white/50 dark:border-white/5 shadow-sm space-y-6 animate-in">
            <div>
              <h4 className="font-black text-xl dark:text-white flex items-center gap-2.5">
                <Brain className="w-6 h-6 text-indigo-500" />
                Agente de Inteligência G-Work
              </h4>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
                Gerencie e edite a persona, os valores (alma) e as regras operacionais do seu assistente de IA tático, além de revisar os aprendizados e memórias dinâmicas.
              </p>
            </div>

            {/* AI Settings Sub-tabs */}
            <div className="flex border-b border-slate-200 dark:border-white/5 text-xs font-bold gap-4">
              <button
                type="button"
                onClick={() => setActiveAiTab('persona')}
                className={`pb-3 border-b-2 transition-colors cursor-pointer ${
                  activeAiTab === 'persona' 
                    ? 'border-indigo-500 text-indigo-500' 
                    : 'border-transparent text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
              >
                Persona (.md)
              </button>
              <button
                type="button"
                onClick={() => setActiveAiTab('alma')}
                className={`pb-3 border-b-2 transition-colors cursor-pointer ${
                  activeAiTab === 'alma' 
                    ? 'border-indigo-500 text-indigo-500' 
                    : 'border-transparent text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
              >
                Alma (.md)
              </button>
              <button
                type="button"
                onClick={() => setActiveAiTab('funcoes')}
                className={`pb-3 border-b-2 transition-colors cursor-pointer ${
                  activeAiTab === 'funcoes' 
                    ? 'border-indigo-500 text-indigo-500' 
                    : 'border-transparent text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
              >
                Funções (.md)
              </button>
              <button
                type="button"
                onClick={() => setActiveAiTab('contexto')}
                className={`pb-3 border-b-2 transition-colors cursor-pointer ${
                  activeAiTab === 'contexto' 
                    ? 'border-indigo-500 text-indigo-500' 
                    : 'border-transparent text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
              >
                Guilherme (.md)
              </button>
              <button
                type="button"
                onClick={() => setActiveAiTab('dynamic')}
                className={`pb-3 border-b-2 transition-colors cursor-pointer ${
                  activeAiTab === 'dynamic' 
                    ? 'border-indigo-500 text-indigo-500' 
                    : 'border-transparent text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
              >
                Memória Aprendida
              </button>
            </div>

            {/* Editor feedback notifications */}
            {staticSuccess && (
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-start gap-2 text-sm font-semibold">
                <CheckCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <span>{staticSuccess}</span>
              </div>
            )}

            {staticError && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 rounded-2xl flex items-start gap-2 text-sm font-semibold">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <span>{staticError}</span>
              </div>
            )}

            {/* Content areas */}
            {activeAiTab !== 'dynamic' ? (
              <div className="space-y-4 animate-in fade-in duration-200">
                {staticLoading ? (
                  <div className="w-full h-64 bg-slate-100/50 dark:bg-slate-950/20 border border-slate-200 dark:border-white/5 rounded-2xl flex items-center justify-center text-xs text-slate-400 font-bold gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-indigo-500"></div>
                    Carregando arquivo...
                  </div>
                ) : (
                  <div className="space-y-4">
                    <textarea
                      value={staticContent}
                      onChange={(e) => setStaticContent(e.target.value)}
                      className="w-full h-72 px-5 py-4 bg-slate-100/50 dark:bg-slate-950/20 border border-slate-200 dark:border-white/5 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all font-mono text-xs text-slate-800 dark:text-slate-200 leading-relaxed no-scrollbar"
                      placeholder="Carregando conteúdo..."
                    />
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={handleSaveStatic}
                        className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-black rounded-xl uppercase tracking-widest transition-all cursor-pointer shadow-md flex items-center gap-1.5"
                      >
                        <Check className="w-3.5 h-3.5" /> Salvar Arquivo
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4 animate-in fade-in duration-200">
                {dynamicLoading ? (
                  <div className="w-full h-32 bg-slate-100/50 dark:bg-slate-950/20 border border-slate-200 dark:border-white/5 rounded-2xl flex items-center justify-center text-xs text-slate-400 font-bold gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-indigo-500"></div>
                    Carregando diretrizes...
                  </div>
                ) : dynamicMemories.length === 0 ? (
                  <p className="text-xs text-slate-400 dark:text-slate-500 italic text-center py-8 bg-slate-100/50 dark:bg-slate-950/20 border border-dashed border-slate-200 dark:border-white/5 rounded-2xl">
                    Nenhum aprendizado dinâmico cadastrado ou ativo. Dispare análises de IA para sugerir memórias.
                  </p>
                ) : (
                  <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1 no-scrollbar">
                    {dynamicMemories.map((m) => (
                      <div 
                        key={m.id}
                        className={`p-4 rounded-2xl border transition-all duration-200 flex justify-between items-center gap-4 ${
                          m.is_active 
                            ? 'bg-slate-50 dark:bg-slate-950/30 border-slate-200 dark:border-white/5 shadow-sm' 
                            : 'bg-transparent border-transparent opacity-50'
                        }`}
                      >
                        <div className="flex-1 min-w-0 pr-2">
                          <p className="text-xs font-bold text-slate-800 dark:text-slate-200 leading-normal break-words">
                            {m.content}
                          </p>
                          <span className="text-[9px] font-medium text-slate-400">
                            Adicionado em: {new Date(m.created_at).toLocaleDateString('pt-BR')}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          {/* Toggle switch for is_active */}
                          <button
                            type="button"
                            onClick={() => handleToggleDynamic(m.id, !m.is_active)}
                            className={`w-10 h-6 rounded-full transition-all relative cursor-pointer ${
                              m.is_active ? 'bg-indigo-500' : 'bg-slate-200 dark:bg-slate-700'
                            }`}
                          >
                            <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-all shadow-md ${
                              m.is_active ? 'right-0.5' : 'left-0.5'
                            }`}></div>
                          </button>
                          {/* Delete button */}
                          <button
                            type="button"
                            onClick={() => handleDeleteDynamic(m.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer"
                            title="Remover aprendizado"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Secure 4-Digit PIN Access Panel */}
          <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-md p-10 rounded-[48px] border border-white/50 dark:border-white/5 shadow-sm">
            <h4 className="font-black text-xl mb-4 dark:text-white flex items-center gap-2">
              <Shield className="w-6 h-6 text-emerald-500" /> Acesso Rápido por PIN
            </h4>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-8">
              Ative o login rápido por PIN de 4 dígitos para este dispositivo, permitindo acessar a plataforma sem digitar e-mail e senha.
            </p>

            {pinError && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 rounded-2xl flex items-start gap-2 mb-6 text-sm">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <span>{pinError}</span>
              </div>
            )}

            {pinSuccess && (
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-start gap-2 mb-6 text-sm">
                <CheckCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <span>{pinSuccess}</span>
              </div>
            )}

            {pinSavedOnDevice ? (
              <div className="space-y-6">
                <div className="p-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-emerald-500 text-white flex items-center justify-center">
                    <KeyRound className="w-6 h-6" />
                  </div>
                  <div>
                    <h5 className="font-black text-emerald-800 dark:text-emerald-400">PIN Ativo</h5>
                    <p className="text-xs text-emerald-700/80 dark:text-emerald-500">Este dispositivo está configurado para logar com o seu PIN de 4 dígitos.</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleDeactivatePin}
                  disabled={saving}
                  className="px-6 py-3.5 bg-red-500 hover:bg-red-600 text-white text-xs font-black rounded-xl uppercase tracking-widest transition-all cursor-pointer disabled:opacity-50"
                >
                  Desativar Acesso por PIN
                </button>
              </div>
            ) : (
              <form onSubmit={handleSetupPin} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Definir Novo PIN (4 números)</label>
                    <input 
                      type="password" 
                      maxLength={4}
                      required
                      value={newPin}
                      onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
                      placeholder="Ex: 1234"
                      className="w-full px-6 py-4 bg-white/40 dark:bg-slate-800/40 border border-slate-200 dark:border-white/5 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all font-bold text-center tracking-[1em] text-slate-700 dark:text-white text-lg"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Confirmar com sua Senha Atual</label>
                    <input 
                      type="password" 
                      required
                      value={verifyPassword}
                      onChange={(e) => setVerifyPassword(e.target.value)}
                      placeholder="Sua senha secreta"
                      className="w-full px-6 py-4 bg-white/40 dark:bg-slate-800/40 border border-slate-200 dark:border-white/5 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all font-bold text-slate-700 dark:text-white"
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <button 
                    type="submit"
                    disabled={saving}
                    className="px-8 py-4 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-black rounded-2xl uppercase tracking-widest shadow-xl shadow-emerald-500/20 transition-all cursor-pointer disabled:opacity-50"
                  >
                    Ativar Acesso por PIN
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Gemini AI Brain Capabilities & Tools */}
          <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-md p-10 rounded-[48px] border border-white/50 dark:border-white/5 shadow-sm space-y-6">
            <div>
              <h4 className="font-black text-xl dark:text-white flex items-center gap-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>
                Recursos do Gemini AI Brain
              </h4>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
                O assistente de IA possui permissões de agente para ler, estruturar e manipular o banco de dados local com segurança sob comando de voz ou texto.
              </p>
            </div>

            <div className="p-6 rounded-3xl bg-slate-100/50 dark:bg-slate-900/40 border border-slate-200 dark:border-white/5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 dark:border-white/5 pb-4">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Motor Cognitivo</p>
                  <p className="text-sm font-black text-slate-700 dark:text-white mt-0.5">gemini-flash-latest</p>
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-left sm:text-right">Permissão Global</p>
                  <span className="inline-block mt-0.5 px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-[9px] font-black rounded-lg uppercase tracking-widest">
                    Agente Operacional Ativo
                  </span>
                </div>
              </div>

              <div className="space-y-4">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Ferramentas & Permissões Declaradas
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    {
                      category: 'Transações & Movimentações',
                      tools: [
                        { name: 'list_user_transactions', desc: 'Pesquisa e filtra o histórico completo de transações reais.', perm: 'Leitura', color: 'text-blue-400 bg-blue-500/10' },
                        { name: 'create_user_transaction', desc: 'Insere novos lançamentos monetários (receitas/despesas).', perm: 'Escrita', color: 'text-emerald-400 bg-emerald-500/10' },
                        { name: 'update_user_transaction', desc: 'Corrige valores, categorias ou descrições no banco de dados.', perm: 'Escrita', color: 'text-amber-400 bg-amber-500/10' },
                        { name: 'delete_user_transactions', desc: 'Remove registros específicos ou limpa o histórico em lote.', perm: 'Exclusão', color: 'text-red-400 bg-red-500/10' },
                      ]
                    },
                    {
                      category: 'Compromissos & Assinaturas',
                      tools: [
                        { name: 'list_user_reminders', desc: 'Consulta compromissos futuros ou assinaturas fixas mensais.', perm: 'Leitura', color: 'text-blue-400 bg-blue-500/10' },
                        { name: 'create_user_reminder', desc: 'Registra novas contas, parcelas ou assinaturas periódicas.', perm: 'Escrita', color: 'text-emerald-400 bg-emerald-500/10' },
                        { name: 'update_user_reminder', desc: 'Marca compromissos como pagos ou reprograma vencimentos.', perm: 'Escrita', color: 'text-amber-400 bg-amber-500/10' },
                        { name: 'delete_user_reminder', desc: 'Apaga compromissos ou cancela cobranças recorrentes.', perm: 'Exclusão', color: 'text-red-400 bg-red-500/10' },
                      ]
                    },
                    {
                      category: 'Investimentos & Metas',
                      tools: [
                        { name: 'list_user_goals', desc: 'Analisa objetivos de acúmulo e patrimônio cadastrados.', perm: 'Leitura', color: 'text-blue-400 bg-blue-500/10' },
                        { name: 'create_user_goal', desc: 'Adiciona novos alvos financeiros com cores e metas.', perm: 'Escrita', color: 'text-emerald-400 bg-emerald-500/10' },
                        { name: 'update_user_goal', desc: 'Atualiza aportes e quantias acumuladas em investimentos.', perm: 'Escrita', color: 'text-amber-400 bg-amber-500/10' },
                        { name: 'delete_user_goal', desc: 'Apaga metas e objetivos de alocação de capital.', perm: 'Exclusão', color: 'text-red-400 bg-red-500/10' },
                      ]
                    },
                    {
                      category: 'Segurança & Reconciliação',
                      tools: [
                        { name: 'reconcileBalances', desc: 'Recalcula receitas, despesas e saldo líquido consolidado a cada modificação.', perm: 'Segurança', color: 'text-violet-400 bg-violet-500/10' },
                      ]
                    }
                  ].map((cat, idx) => (
                    <div key={idx} className="p-4 bg-slate-100/50 dark:bg-slate-950/40 rounded-2xl border border-slate-200/50 dark:border-white/5 space-y-3">
                      <p className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest border-b border-slate-200/50 dark:border-white/5 pb-1.5">
                        {cat.category}
                      </p>
                      <div className="space-y-2">
                        {cat.tools.map((tool) => (
                          <div key={tool.name} className="space-y-1">
                            <div className="flex justify-between items-center gap-2">
                              <span className="font-mono text-[9px] text-slate-800 dark:text-slate-200 font-bold bg-white/60 dark:bg-slate-800/80 px-2 py-0.5 rounded border border-slate-200/60 dark:border-white/5 shrink-0 select-all">
                                {tool.name}
                              </span>
                              <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-widest shrink-0 ${tool.color}`}>
                                {tool.perm}
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-normal pl-0.5">
                              {tool.desc}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* System Preferences */}
          <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-md p-10 rounded-[48px] border border-white/50 dark:border-white/5 shadow-sm">
            <h4 className="font-black text-xl mb-8 dark:text-white">Preferências do Sistema</h4>
            <div className="space-y-6">
              {/* Push notifications */}
              <div className="flex justify-between items-center group">
                <div className="max-w-md">
                  <h5 className="font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <Bell className="w-4 h-4 text-emerald-500" /> Notificações Push
                  </h5>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Receba alertas de gastos e vencimentos em tempo real.</p>
                </div>
                <button 
                  onClick={() => setPushNotif(!pushNotif)}
                  className={`w-14 h-8 rounded-full transition-all relative cursor-pointer ${
                    pushNotif ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-700'
                  }`}
                >
                  <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all shadow-md ${
                    pushNotif ? 'right-1' : 'left-1'
                  }`}></div>
                </button>
              </div>

              {/* Autenticação de dois fatores */}
              <div className="flex justify-between items-center group">
                <div className="max-w-md">
                  <h5 className="font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <Shield className="w-4 h-4 text-emerald-500" /> Autenticação em Duas Etapas
                  </h5>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Camada extra de segurança para suas transações.</p>
                </div>
                <button 
                  onClick={() => setTwoFactor(!twoFactor)}
                  className={`w-14 h-8 rounded-full transition-all relative cursor-pointer ${
                    twoFactor ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-700'
                  }`}
                >
                  <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all shadow-md ${
                    twoFactor ? 'right-1' : 'left-1'
                  }`}></div>
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
