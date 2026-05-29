# ARCHITECTURE.md — G-Hub Architecture Blueprint

Este documento descreve as decisões de design, stack técnica, arquitetura de software, topologia de rede local e o framework de segurança do ecossistema **G-Hub** (composto pelos módulos **G-Finance** e **G-Work**).

---

## 🎯 1. Stack Técnica e Justificativa

| Tecnologia | Função no Sistema | Justificativa de Escolha |
|---|---|---|
| **Next.js 14/15/16 (App Router)** | Framework Frontend & API Routes | O App Router do Next.js oferece rotas otimizadas por servidor (SSR), pré-renderização estática super rápida, layouts persistentes e API Routes sem a necessidade de um servidor backend dedicado, simplificando o deploy na Vercel. |
| **React 19 + TypeScript (Strict)** | Interface e Segurança de Tipos | O React 19 traz melhorias no gerenciamento de estados assíncronos e hooks nativos. O TypeScript garante segurança de dados e tipagem rigorosa para quantias monetárias e objetos de banco de dados. |
| **Tailwind CSS v4** | Estilização Visual e Tokens | Fornece velocidade na construção de estruturas responsivas, com ótimo suporte ao sistema de cores OKLch, variáveis nativas e estilização de Glassmorphism personalizada para alta fidelidade visual. |
| **Ant Design (`antd`)** | Componentes de UI Premium | Fornece componentes de controle operacional robustos (Kanban, Calendários, Seletores, Formulários complexos) esteticamente refinados e facilmente customizáveis via ConfigProvider para acompanhar o visual dark/glassmorphic. |
| **Supabase (PostgreSQL + Auth)** | Banco de Dados, Auth & Realtime | Fornece autenticação segura unificada, banco de dados relacional robusto com políticas RLS severas, atualizações em tempo real para sincronização de avatares e transações, e infraestrutura de Storage. |
| **Gemini AI (SDK Oficial)** | Engine de Inteligência Artificial | Utiliza modelos Gemini Pro/Flash via rota de API protegida para parsing semântico de transcrições de voz capturadas pelo microfone, automatizando a criação de tarefas e planos de ação. |

---

## 🧭 2. Estrutura de Pastas (Folder Directory Structure)

A estrutura do projeto expõe visualmente as fronteiras de cada módulo e garante legibilidade em menos de 10 minutos para qualquer engenheiro sênior:

```
d:\APPS - ANTIGRAVITY\G-Finance\
├── .agent/                  # Workflows e automações locais do Higher Mind
├── .next/                   # Pasta de build e cache do Next.js
├── public/                  # Arquivos estáticos globais (imagens, logos, spline)
├── scripts/                 # Utilitários de setup, gerador de dados e scripts RLS
│   ├── audit-rls.py         # Validador automático de Row-Level Security
│   └── generate-sql.js      # Gerador de dados fictícios financeiros
├── src/
│   ├── app/                 # Next.js App Router (Entrypoints e Páginas)
│   │   ├── api/             # Rotas de API Backend (ex: Gemini AI task generator)
│   │   ├── auth/            # Módulo de Autenticação do Supabase
│   │   ├── finance/         # Módulo G-Finance (Wealth & Portfolio Dashboard)
│   │   ├── tasks/           # Módulo G-Work (Kanban, Transcrições e Projetos)
│   │   ├── globals.css      # Design System CSS, Glassmorphism, Gradientes Mesh
│   │   ├── layout.tsx       # Root Layout unificado do G-Hub
│   │   └── page.tsx         # Portal Central de Entrada (G-Hub Entrypoint)
│   ├── components/          # Componentes Reutilizáveis (Sidebar, Header, TiltCard)
│   └── lib/                 # Clientes e instâncias globais (Supabase, Utilitários)
├── supabase/                # Infraestrutura local e migrações do banco de dados
│   ├── migrations/          # Histórico de Migrações de Schema SQL com RLS
│   └── config.toml          # Configuração básica do CLI do Supabase
├── CLAUDE.md                # Diretrizes de desenvolvimento
├── MEMORY.md                # Registro Neural vivo de progresso e decisões
├── WIKI.md                  # Credenciais do Google Cloud Console e URIs
└── package.json             # Dependências e scripts do ecossistema
```

---

## 🔒 3. Segurança e Governança de Dados (RLS e Secrets)

### 3.1 Row-Level Security (RLS)
Nenhuma tabela no banco de dados Supabase (`public` schema) é criada sem a ativação explícita de **Row-Level Security** e a amarração rígida das políticas ao JWT do usuário logado (`auth.uid() = user_id`).

O script local `scripts/audit-rls.py` é executado antes de qualquer integração para varrer as migrations buscando violações dessas regras de isolamento.

### 3.2 Secrets Management
Nenhum segredo de API ou chave privada de provedor social é commitada em texto plano.
- As chaves de infraestrutura (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`) são consideradas públicas e ficam salvas no `.env.local` e controladas via provedor estático.
- O segredo privado `GEMINI_API_KEY` e o `Google Client Secret` ficam estritamente confinados no servidor de variáveis de ambiente da Vercel e do painel de administração do Supabase.

---

## ⚙️ 4. Guia de Inicialização Local e Portas

### 4.1 Pré-requisitos
- Node.js 18 ou superior instalado.
- Chaves do Supabase e Gemini configuradas no arquivo `.env.local` (utilize o modelo `.env.example`).

### 4.2 Executando o Projeto
1. Instale as dependências:
   ```bash
   npm install
   ```
2. Inicie o servidor de desenvolvimento:
   ```bash
   npm run dev
   ```
3. O painel estará disponível na porta padrão do Next.js:
   * **G-Hub Portal:** `http://localhost:3000`

### 4.3 Auditoria de RLS das Tabelas
Para garantir que nenhuma tabela nova quebre a política de segurança, execute:
```bash
python scripts/audit-rls.py
```
O script lerá todas as migrations em `supabase/migrations` e verificará a existência de `ENABLE ROW LEVEL SECURITY` em cada `CREATE TABLE`.

---

*Última atualização: 29 de maio de 2026.*
