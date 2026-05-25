'use client';

import React, { useState, useEffect } from 'react';
import { User, Shield, Bell, Eye } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface Profile {
  id: string;
  full_name: string;
  avatar_url: string;
}

export default function Settings() {
  const [profile, setProfile] = useState<Profile>({ id: '', full_name: '', avatar_url: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [email, setEmail] = useState('');
  
  // Custom toggles
  const [pushNotif, setPushNotif] = useState(true);
  const [twoFactor, setTwoFactor] = useState(false);

  useEffect(() => {
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
            // If profile does not exist yet, initialize it
            const defaultProfile = {
              id: user.id,
              full_name: user.user_metadata?.full_name || 'Guilherme R.',
              avatar_url: user.user_metadata?.avatar_url || ''
            };
            setProfile(defaultProfile);
          } else {
            setProfile(data);
          }
        }
      } catch (err) {
        console.error('Error fetching user profile:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile.id) return;
    
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
      alert('Perfil atualizado com sucesso!');
    } catch (err: any) {
      alert(`Erro ao salvar perfil: ${err.message}`);
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
                <div className="flex items-center gap-8 mb-10">
                  <div className="w-24 h-24 rounded-3xl bg-slate-100 dark:bg-slate-800/50 border-4 border-white dark:border-slate-700 shadow-xl flex items-center justify-center text-slate-300">
                    <User className="w-12 h-12 text-slate-400" />
                  </div>
                  <div className="space-y-2">
                    <button 
                      type="button"
                      className="px-6 py-2.5 bg-slate-900 text-white text-[10px] font-black rounded-xl uppercase tracking-widest hover:bg-slate-800 transition-all cursor-pointer"
                    >
                      Alterar Foto
                    </button>
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
