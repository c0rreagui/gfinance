# Perfil do Usuário — Guilherme Corrêa

Este arquivo documenta quem é o Guilherme, seu papel profissional, suas empresas, seus projetos principais, sua stack de tecnologia preferencial e suas diretrizes de qualidade inegociáveis. O G-Work Intelligence Engine utiliza este contexto para mapear e classificar tarefas de forma rápida e assertiva.

---

## 👤 Quem eu sou
*   **Nome:** Guilherme Corrêa
*   **Papel:** Fundador, CTO e Arquiteto de Software.
*   **Filosofia:** Construo porque não consigo não construir. Penso em décadas, não em sprints. Eu dirijo, eu arquiteto, eu tomo as decisões técnicas cruciais.
*   **Padrão de Qualidade:** Inegociável. Padrão de design e engenharia Stripe, Apple, Vercel e Linear. Dark-first, tipografia editorial e sensibilidade cinematográfica.

---

## 🛠️ Ecossistema de Projetos Ativos

### 1. G-Hub (Command Center)
O portal central unificado que serve como cockpit digital pessoal do Guilherme, hospedando os módulos abaixo e servindo como ponto único de entrada (`/`).

### 2. G-Finance (Módulo Financeiro)
Sistema unificado de wealth management pessoal.
*   **Funcionalidades:** Controle patrimonial, conciliação em tempo real de saldos bancários, controle de cartões de crédito, fluxo de caixa projetado no Calendário Financeiro, investimentos, e relatórios analíticos de gastos.
*   **Tecnologia:** Next.js 15, Tailwind CSS v4, Supabase (Postgres + triggers automáticos de saldo RLS), API Gemini 2.5 Pro (CFO Persona) e captura de SMS de transações bancárias em tempo real.

### 3. G-Work (Módulo de Produtividade)
Gerenciador tático de tarefas e inteligência de reuniões.
*   **Funcionalidades:** Kanban interativo drag-and-drop, árvore hierárquica (padrão Azure DevOps: Épicos ➔ Features ➔ Stories ➔ Tasks), processador de transcrições e áudios de reuniões integrados ao Google Drive, curadoria interativa pré-publicação com chat de IA de refinamento, e banco de memórias dinâmica/estática.
*   **Tecnologia:** Next.js 15, React 19, @dnd-kit/core, Tailwind CSS v4, Gemini 2.5 Flash Lite/Pro.

---

## 💻 Tech Stack & Preferências Arquiteturais
Ao sugerir tarefas de código ou decisões de engenharia, respeite as preferências do Guilherme:
*   **Frontend:** Next.js (App Router), React, TypeScript estrito, CSS puro ou Tailwind CSS (versão v4 de preferência).
*   **Backend & DB:** Supabase, PostgreSQL estrito, Row-Level Security (RLS) obrigatório em todas as tabelas. Triggers e funções PL/pgSQL no banco de dados para garantir consistência de dados e regras de negócio críticas.
*   **Segurança:** OWASP ASVS como guia principal. Sem secrets hardcoded, sanitização total de inputs e tipagens TypeScript robustas (zero uso de `any`).
*   **Performance:** Restrição de design inicial (não fase de otimização). Carregamentos velozes e interface fluida.
