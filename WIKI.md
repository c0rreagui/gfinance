# G-Finance — Central Developer Wiki

Este documento serve como a Wiki centralizada de desenvolvimento do **G-Finance**, registrando configurações de APIs, credenciais integradas de terceiros e guias de infraestrutura.

---

## 🔑 Credenciais do Google Cloud Console (OAuth 2.0)

As credenciais a seguir foram geradas no console do Google Cloud para habilitar o login social e a vinculação de contas com o provedor do Google (OAuth 2.0).

> [!IMPORTANT]
> **Segurança de Código (Secret Scanning)**:
> O Google Client Secret foi configurado com sucesso nas variáveis de ambiente da Vercel e do Supabase, mas foi **ocultado deste repositório** para obedecer às diretivas de proteção do GitHub (*Push Protection*). Nunca salve segredos em texto plano no repositório.

* **Google Client ID:** `47747863323-cmkdq8t20cuov1ddnhkgqemol13hleqg.apps.googleusercontent.com`
* **Google Client Secret:** `GOCSPX-Yz6CwTLXdcbsuyu9GiVM9...` (Salvo em seu gerenciador e configurado na Vercel/Supabase)

---

## 🌐 Configuração de URIs e Redirecionamentos

Para que o login e a vinculação de contas funcionem perfeitamente no Google e no Supabase, certifique-se de que os seguintes endereços estão cadastrados nos respectivos consoles:

### 1. Google Cloud Console > APIs & Services > Credentials
* **Origens JavaScript autorizadas:**
  * `http://localhost:3000` (Local)
  * `https://gfinance-lovat.vercel.app` (Produção Vercel)
* **URIs de redirecionamento autorizados:**
  * `https://jdliepgseoyoxfygmdet.supabase.co/auth/v1/callback` (Callback de Autenticação do Supabase)

### 2. Supabase Dashboard > Authentication > URL Configuration
* **Site URL:**  
  * `https://gfinance-lovat.vercel.app`
* **Redirect URLs (Allowed):**  
  * `http://localhost:3000/*`
  * `https://gfinance-lovat.vercel.app/*`
  * `https://gfinance-lovat.vercel.app/auth/callback*`

---

## 🛠️ Variáveis de Ambiente Necessárias (Vercel & Local)

As chaves abaixo devem estar no arquivo `.env.local` (local) e na aba **Environment Variables** da Vercel (produção):

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://jdliepgseoyoxfygmdet.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpkbGllcGdzZW95b3hmeWdtZGV0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk3Mzg0MzEsImV4cCI6MjA5NTMxNDQzMX0._TdK_iukApQ5zFbvzCROPWQnLaxMTxuxpvyOA4eStzg

# Gemini AI Studio (Analista de Inteligência)
GEMINI_API_KEY=your-gemini-key-here
```

---

*Última atualização: 26 de maio de 2026 por Antigravity.*
