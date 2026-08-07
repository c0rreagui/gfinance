'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

function AuthorizeForm() {
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [sessionChecked, setSessionChecked] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setIsLoggedIn(!!data.session);
      setSessionChecked(true);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsLoggedIn(!!session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleAuthorize = () => {
    setLoading(true);
    const qs = searchParams.toString();
    window.location.href = `/api/oauth/authorize?${qs}&user_approved=true`;
  };

  if (!sessionChecked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-950 text-emerald-500 font-sans">
        Carregando...
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-950 p-4 font-sans text-gray-200">
      <div className="w-full max-w-md rounded-2xl border border-gray-800 bg-gray-900 p-8 shadow-2xl">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10">
            <svg className="h-8 w-8 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white">G-Finance</h1>
          <p className="mt-2 text-sm text-gray-400">Solicitação de Autorização MCP</p>
        </div>

        {!isLoggedIn ? (
          <div className="text-center">
            <p className="mb-6 text-gray-300">Você precisa estar logado no G-Hub para continuar.</p>
            <Link 
              href={`/login?next=${encodeURIComponent(`/authorize?${searchParams.toString()}`)}`}
              className="inline-flex w-full justify-center rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600"
            >
              Fazer Login
            </Link>
          </div>
        ) : (
          <div>
            <div className="mb-6 rounded-lg bg-gray-950 p-4 text-sm">
              <p className="font-medium text-gray-200">Um aplicativo de terceiros (como Gemini Spark) deseja:</p>
              <ul className="mt-3 list-inside list-disc space-y-1 text-gray-400">
                <li>Ler e gravar dados das suas finanças</li>
                <li>Executar operações via protocolo MCP</li>
              </ul>
            </div>
            
            <button
              onClick={handleAuthorize}
              disabled={loading}
              className="flex w-full justify-center rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 disabled:opacity-50"
            >
              {loading ? 'Autorizando...' : 'Autorizar Acesso ao G-Finance'}
            </button>
            <div className="mt-4 text-center">
              <button 
                onClick={() => window.history.back()}
                className="text-sm text-gray-500 hover:text-gray-300"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AuthorizePage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-gray-950 text-emerald-500 font-sans">Carregando...</div>}>
      <AuthorizeForm />
    </Suspense>
  );
}
