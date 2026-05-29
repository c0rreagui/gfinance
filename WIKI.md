# G-Hub — Central Developer Wiki

Este documento serve como a Wiki centralizada de desenvolvimento do **G-Hub**, registrando configurações de APIs, credenciais integradas de terceiros e guias de infraestrutura do ecossistema que unifica o **G-Finance** e o **G-Work**.

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

# Gemini AI Studio (Analista de Inteligência do G-Work)
GEMINI_API_KEY=your-gemini-key-here
```

---

## 📊 Estrutura do Hub e Módulos Integrados

O **G-Hub** é o ecossistema centralizado que unifica o controle patrimonial (**G-Finance**) com a gestão operacional e AI-assisted de trabalho (**G-Work**).

### 1. Novas Rotas do Sistema
* **`/` (Portal/Hub)**: Tela inicial com visual Glassmorphic cinematográfico escuro-editorial para escolher o aplicativo de destino (**G-Finance** ou **G-Work**).
* **`/finance` (G-Finance)**: Painel completo de wealth management (extrato, investimentos, spline interactivo, etc.).
* **`/tasks` (G-Work)**: Gerenciador de trabalho com Kanban, visualizador de transcrições do Drive e IA Gemini para geração automática de planos de ação.
* **`/auth`**: Autenticação unificada via Supabase com suporte a login social do Google e PIN rápido de 4 dígitos.

### 2. Esquema do Banco de Dados (Supabase)
As seguintes tabelas foram integradas com suporte a **Row-Level Security (RLS)** rigoroso (`auth.uid() = user_id`):
* `public.tasks_projects`: Projetos, canais de mídia ou clientes ativos de Guilherme.
* `public.tasks`: Kanban de atividades por projeto com status (`todo`, `in_progress`, `completed`), prioridade (`low`, `medium`, `high`) e datas de vencimento.
* `public.transcriptions`: Logs de áudios gerados pelo microfone, salvos no Google Drive e integrados ao Gemini AI Parser para geração de tarefas em lote.

---

*Última atualização: 29 de maio de 2026 por Antigravity.*
