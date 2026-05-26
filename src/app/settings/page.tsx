'use client';

import React, { useState, useEffect, useRef } from 'react';
import { User, Shield, Bell, Eye, KeyRound, CheckCircle, HelpCircle, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { encryptPassword } from '@/lib/crypto';

interface Profile {
  id: string;
  full_name: string;
  avatar_url: string;
  pin: string | null;
}

export default function Settings() {
  const [profile, setProfile] = useState<Profile>({ id: '', full_name: '', avatar_url: '', pin: null });
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

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setEmail(user.email || '');
        
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (error) {
          const defaultProfile = {
            id: user.id,
            full_name: user.user_metadata?.full_name || 'Guilherme R.',
            avatar_url: user.user_metadata?.avatar_url || '',
            pin: null
          };
          setProfile(defaultProfile);
        } else {
          setProfile(data);
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
  }, []);

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
          updated_at: new Date().toISOString()
        });

      if (error) throw error;
      setProfileSuccess('Perfil atualizado com sucesso!');
    } catch (err: any) {
      setProfileError(`Erro ao salvar perfil: ${err.message}`);
    } finally {
      setSaving(false);
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
