'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { KeyRound, Mail, Sparkles, User, AlertCircle, Delete, Lock } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { decryptPassword } from '@/lib/crypto';

export default function AuthPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  // PIN login states
  const [hasPinBinding, setHasPinBinding] = useState(false);
  const [pinEmail, setPinEmail] = useState('');
  const [pinDigits, setPinDigits] = useState<string[]>([]);
  const [pinError, setPinError] = useState(false);
  const [showPinScreen, setShowPinScreen] = useState(false);

  useEffect(() => {
    // Check for OAuth error parameters in the URL
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('error') === 'oauth_failed') {
        setErrorMsg('Falha na autenticação com o Google. Tente novamente.');
      }
    }

    // Check if device is bound with an encrypted password for PIN login
    try {
      const storedEmail = localStorage.getItem('gfinance_user_email');
      const storedEncrypted = localStorage.getItem('gfinance_encrypted_pass');
      if (storedEmail && storedEncrypted) {
        setHasPinBinding(true);
        setPinEmail(storedEmail);
        setShowPinScreen(true);
      }
    } catch (e) {
      console.warn('LocalStorage not available');
    }
  }, []);

  useEffect(() => {
    setErrorMsg('');
    setSuccessMsg('');
  }, [isSignUp, showPinScreen]);

  // Physical keyboard listeners for PIN lockscreen (Expert Mode)
  useEffect(() => {
    if (!showPinScreen || loading) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') {
        return;
      }
      if (/^[0-9]$/.test(e.key)) {
        e.preventDefault();
        handlePinKey(e.key);
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        handlePinBackspace();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showPinScreen, pinDigits, loading]);

  // Handle standard email/password auth
  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setLoading(true);

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName }
          }
        });
        if (error) throw error;
        setSuccessMsg('Cadastro realizado com sucesso! Faça login abaixo.');
        setIsSignUp(false);
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        
        // Save email in localStorage for future PIN configurations
        try {
          localStorage.setItem('gfinance_last_email', email);
        } catch (e) {}

        router.push('/');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro na autenticação.');
    } finally {
      setLoading(false);
    }
  };

  // Handle PIN input key clicks
  const handlePinKey = (digit: string) => {
    if (pinDigits.length >= 4) return;
    const newDigits = [...pinDigits, digit];
    setPinDigits(newDigits);
    setPinError(false);

    if (newDigits.length === 4) {
      triggerPinAuth(newDigits.join(''));
    }
  };

  const handlePinBackspace = () => {
    setPinDigits(pinDigits.slice(0, -1));
    setPinError(false);
  };

  // Authenticate using the PIN to decrypt the password
  const triggerPinAuth = async (enteredPin: string) => {
    setLoading(true);
    setErrorMsg('');

    try {
      const storedEncrypted = localStorage.getItem('gfinance_encrypted_pass') || '';
      const decrypted = decryptPassword(storedEncrypted, enteredPin);

      if (!decrypted) {
        throw new Error('PIN incorreto. Tente novamente.');
      }

      const { error } = await supabase.auth.signInWithPassword({
        email: pinEmail,
        password: decrypted
      });

      if (error) throw error;

      router.push('/');
    } catch (err: any) {
      setPinError(true);
      setPinDigits([]);
      setErrorMsg(err.message || 'PIN inválido.');
    } finally {
      setLoading(false);
    }
  };

  // Reset PIN state and switch to standard login
  const handleSwitchToPassword = () => {
    setShowPinScreen(false);
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          scopes: 'https://www.googleapis.com/auth/cloud-platform openid email profile'
        }
      });
      if (error) throw error;
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao iniciar login com o Google.');
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center p-8 h-full min-h-screen relative z-10">
      <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-md p-10 rounded-[48px] border border-white/50 dark:border-white/5 shadow-2xl max-w-md w-full animate-in relative overflow-hidden">
        
        {/* Glow effects */}
        <div className="absolute -right-20 -top-20 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -left-20 -bottom-20 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 bg-emerald-500 rounded-2xl flex items-center justify-center text-white text-3xl font-black shadow-lg shadow-emerald-500/20 mb-4">
            G
          </div>
          <h2 className="text-2xl font-black dark:text-white tracking-tight">G-Finance</h2>
          <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mt-1">
            {showPinScreen ? 'Acesso rápido via PIN' : isSignUp ? 'Criar Conta Premium' : 'Central de Controle'}
          </p>
        </div>

        {errorMsg && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 rounded-2xl flex items-start gap-2 mb-6 text-sm">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-start gap-2 mb-6 text-sm">
            <Sparkles className="w-5 h-5 shrink-0 mt-0.5" />
            <span>{successMsg}</span>
          </div>
        )}

        {showPinScreen ? (
          /* --- PIN Lock Screen Interface --- */
          <div className="flex flex-col items-center space-y-8 animate-in">
            <div className="text-center">
              <p className="text-sm font-bold dark:text-white mb-1">{pinEmail}</p>
              <p className="text-xs text-slate-400">Digite seu PIN de 4 dígitos</p>
            </div>

            {/* PIN Dot Indicators */}
            <div className="flex flex-col items-center space-y-3">
              <div className={`flex justify-center gap-6 ${pinError ? 'animate-shake' : ''}`}>
                {[0, 1, 2, 3].map((index) => (
                  <div
                    key={index}
                    className={`w-4 h-4 rounded-full border-2 transition-all duration-200 ${
                      pinDigits[index] !== undefined
                        ? 'bg-emerald-500 border-emerald-500 scale-110 shadow-lg shadow-emerald-500/20'
                        : 'border-slate-300 dark:border-slate-600'
                    }`}
                  />
                ))}
              </div>
              {loading && (
                <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest animate-pulse">
                  Descriptografando Sessão Segura...
                </p>
              )}
            </div>

            {/* Numerical Keyboard */}
            <div className="grid grid-cols-3 gap-5 max-w-[280px] w-full">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => handlePinKey(num)}
                  disabled={loading}
                  className="w-16 h-16 rounded-full glass bg-white/40 dark:bg-slate-700/40 dark:text-white font-black text-xl hover:bg-emerald-500 hover:text-white transition-all duration-250 active:scale-95 flex items-center justify-center cursor-pointer disabled:opacity-50"
                >
                  {num}
                </button>
              ))}
              <button
                type="button"
                onClick={handleSwitchToPassword}
                className="w-16 h-16 rounded-full dark:text-white font-bold text-xs hover:text-emerald-500 transition-all flex items-center justify-center text-center cursor-pointer"
              >
                Senha
              </button>
              <button
                type="button"
                onClick={() => handlePinKey('0')}
                disabled={loading}
                className="w-16 h-16 rounded-full glass bg-white/40 dark:bg-slate-700/40 dark:text-white font-black text-xl hover:bg-emerald-500 hover:text-white transition-all duration-250 active:scale-95 flex items-center justify-center cursor-pointer disabled:opacity-50"
              >
                0
              </button>
              <button
                type="button"
                onClick={handlePinBackspace}
                disabled={loading}
                className="w-16 h-16 rounded-full dark:text-white hover:text-red-500 transition-all flex items-center justify-center cursor-pointer"
              >
                <Delete className="w-6 h-6" />
              </button>
            </div>

            <div className="text-center">
              <button
                onClick={handleSwitchToPassword}
                className="text-xs font-bold text-emerald-500 hover:underline cursor-pointer"
              >
                Entrar com e-mail e senha
              </button>
            </div>
          </div>
        ) : (
          /* --- Standard Email/Password Form --- */
          <form onSubmit={handleAuth} className="space-y-5">
            {isSignUp && (
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Nome Completo</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                  <input 
                    type="text" 
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Seu nome"
                    className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/5 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:text-white"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">E-mail</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                <input 
                  type="email" 
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu-email@exemplo.com"
                  className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/5 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:text-white"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Senha</label>
              <div className="relative">
                <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                <input 
                  type="password" 
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Sua senha secreta"
                  className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/5 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:text-white"
                />
              </div>
            </div>

            <button 
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-black rounded-2xl uppercase tracking-widest shadow-xl shadow-emerald-500/20 transition-all cursor-pointer flex justify-center items-center gap-2"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
              ) : isSignUp ? (
                'Criar Cadastro Premium'
              ) : (
                'Entrar na Plataforma'
              )}
            </button>

            <div className="relative my-6 flex items-center justify-center">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200 dark:border-white/5"></div>
              </div>
              <span className="relative px-4 bg-white dark:bg-slate-800 text-[10px] font-black uppercase tracking-widest text-slate-400">ou</span>
            </div>

            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full py-4 bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-900/80 text-slate-800 dark:text-white text-xs font-black rounded-2xl uppercase tracking-widest border border-slate-200 dark:border-white/5 transition-all cursor-pointer flex justify-center items-center gap-3 active:scale-98 shadow-sm animate-in"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                <path fill="#EA4335" d="M12 5.04c1.62 0 3.08.56 4.22 1.65l3.15-3.15C17.45 1.77 14.93 1 12 1 7.39 1 3.44 3.65 1.49 7.55l3.87 3C6.31 7.53 8.93 5.04 12 5.04z" />
                <path fill="#4285F4" d="M23.49 12.27c0-.81-.07-1.59-.2-2.35H12v4.45h6.44c-.28 1.47-1.11 2.71-2.36 3.55l3.66 2.84c2.14-1.97 3.39-4.87 3.39-8.49z" />
                <path fill="#FBBC05" d="M5.36 10.55c-.24-.72-.38-1.49-.38-2.28s.14-1.56.38-2.28L1.49 3C.54 4.9.01 7.03.01 9.27s.53 4.37 1.48 6.27l3.87-3z" />
                <path fill="#34A853" d="M12 23c3.24 0 5.97-1.07 7.96-2.91l-3.66-2.84c-1.01.68-2.31 1.08-3.9 1.08-3.07 0-5.69-2.49-6.62-5.51l-3.87 3C3.44 20.35 7.39 23 12 23z" />
              </svg>
              Entrar com o Google
            </button>

            <div className="text-center space-y-3 pt-2">
              <button
                type="button"
                onClick={() => setIsSignUp(!isSignUp)}
                className="text-xs font-bold text-emerald-500 hover:underline cursor-pointer block mx-auto"
              >
                {isSignUp ? 'Já tem uma conta? Faça login' : 'Primeira vez? Crie sua conta grátis'}
              </button>
              {hasPinBinding && (
                <button
                  type="button"
                  onClick={() => setShowPinScreen(true)}
                  className="text-xs font-bold text-slate-400 hover:text-emerald-500 hover:underline cursor-pointer block mx-auto"
                >
                  Voltar para login via PIN
                </button>
              )}
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
