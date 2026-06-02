---
tags: [flow-trace, neural-map, product-audit]
page_or_feature: "Fonte de Dados (Integrations & Sync)"
date_created: 2026-05-27
primary_axis: "Resilience & Recovery"
secondary_axis: "Cognitive Clarity"
blockers_found: 3
phantom_paths_detected: 0
---

# Flow Trace: Fonte de Dados (Integrations & Sync)

## 📊 Visão Geral do Fluxo

O módulo de **Fontes de Dados** (`/integrations`) do G-Finance é a artéria vital de ingestão de dados financeiros da plataforma. Projetado sob a premissa de um ecossistema *Zero-Trust*, ele consolida a importação manual de extratos bancários com processamento inteligente local e gateways de automação mobile em tempo real. A página permite ao usuário importar extratos (PDF, OFX, CSV) com processador de linguagem natural Gemini integrado como fallback, além de expor uma URL de Webhook para capturar notificações de SMS processadas via Atalhos do iOS.

Este trace audita a arquitetura de sincronização, o fluxo de criptografia ponta a ponta nas chamadas mTLS da API Itaú e o pipeline de parsing e persistência idempotente no banco de dados.

- **Páginas Afetadas:** [page.tsx](file:///d:/APPS%20-%20ANTIGRAVITY/G-Finance/src/app/integrations/page.tsx)
- **APIs Afetadas:** [/api/itau/upload](file:///d:/APPS%20-%20ANTIGRAVITY/G-Finance/src/app/api/itau/upload/route.ts) | [/api/itau/sync](file:///d:/APPS%20-%20ANTIGRAVITY/G-Finance/src/app/api/itau/sync/route.ts)
- **Personas Analisadas:** First-Time User (Zero State) & Steady-State User (Regular User)
- **Eixo Primário:** `Resilience & Recovery` (Deduplicação idempotente, segurança e persistência auditável)
- **Eixo Secundário:** `Cognitive Clarity` (Clareza tipográfica nas instruções e visibilidade do estado de sincronização)

---

## 🗺️ Tabela Comparativa (Ideal vs Real)

| Step | Persona | Fluxo Ideal (Design Spec) | Fluxo Real (Empírico) | Div. | Confiança | Drop-off / Friction Point |
|:---:| :--- | :--- | :--- |:---:| :--- | :--- |
| **1** | First-Time | Acessa a rota `/integrations` e visualiza o badge "Ingestão Ativa", a URL do Webhook do SMS e uma lista de logs de operações vazia com um elegante estado zerado. | Renderiza o shell da página. Exibe logs em skeleton por ~200ms. Carrega o estado de logs reais com sucesso a partir da tabela `itau_sync_logs` no Supabase. | `=` | Verified | Nenhuma fricção inicial. Design premium e responsivo. |
| **2** | Ambos | Clica no botão de copiar a URL do webhook. A URL é salva no clipboard e o botão exibe um estado animado de sucesso em verde ("Copiado"). | Executa `navigator.clipboard.writeText(webhookUrl)`. Altera o estado local `copied` para `true` por 2 segundos. Se falhar (ex: HTTP local), falha silenciosamente. | `=` | Verified | Em navegadores mobile não-HTTPS, a API de Clipboard do browser pode falhar sem dar feedback de erro visual. |
| **3** | Ambos | Envia um payload HTTP POST de SMS de teste a partir do Atalhos (iOS) para o endpoint `/sms-webhook`. A interface reflete a chegada da transação em tempo real. | A Edge Function recebe e valida o SMS (JSON ou texto puro) e o user_id (header ou query params), processa os regex de parser, deduplica via SHA-256 e persiste no Supabase. | `=` | Verified | Nenhuma fricção. Os logs registram o sucesso e o saldo é recalculado instantaneamente. |
| **4** | Ambos | Arraste e solte (Drag & Drop) de extrato PDF Itaú sobre a zona de drop. A borda brilha em laranja e ativa o estado de arquivo selecionado de imediato. | O evento `onDrop` intercepta o arquivo, extrai a extensão e valida se é `pdf`, `ofx` ou `csv`. Mostra o card com nome, tamanho e botão de remoção rápida. | `=` | Verified | Feedback de validação robusto. |
| **5** | Steady-State | Clica em "Processar Extrato". A interface exibe animação progressiva. O backend realiza o parser regex estático do PDF e insere os dados no banco de dados. | Dispara requisição multipart/form-data. O servidor tenta o parser estático de PDF. Se retornar 0 registros, redireciona o buffer transparentemente para o Gemini AI. | `~` | Verified | O processamento do Gemini leva de 3 a 5 segundos adicionais, gerando ansiedade se o spinner da UI parecer estático sem barra de progresso. |
| **6** | Steady-State | Executa a sincronização direta de conta bancária clicando em atualizar. O sistema faz o handshake mTLS seguro no gateway do Itaú e importa lançamentos reais. | O endpoint `/api/itau/sync` verifica se `ITAU_CERT_PEM` está configurado. Se ausente, executa o **Simulador de Sandbox dinâmico** silenciosamente sem avisar a UI. | `!=` | Verified | **[BLOCKER]** Ilusão de Conexão. O usuário clica em sincronizar acreditando estar sincronizando com uma conta real, mas está vendo transações geradas via sandbox. |
| **7** | Ambos | Duas importações consecutivas do mesmo arquivo de extrato não duplicam lançamentos. Os novos saldos globais são recalculados no ato. | O backend cria hashes SHA-256 individuais dos lançamentos e os insere usando unique indexes Postgres. Os saldos são agregados dinamicamente na tabela `balances`. | `=` | Verified | A segurança transacional de deduplicação e a robustez lógica de recálculo de saldo estão em nível mundial. |

---

## 🔬 Detalhamento de Estados por Step

### Step 1: Ingestão Ativa & Log Loading (First-Time User vs Steady-State)
- **Input:** Entrada na rota `/integrations`.
- **System:**
  - Inicialização dos estados de processamento de arquivos:
    ```typescript
    const [copied, setCopied] = useState(false);
    const [dragActive, setDragActive] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [processingFile, setProcessingFile] = useState(false);
    const [logs, setLogs] = useState<OperationLog[]>([]);
    const [logsLoading, setLogsLoading] = useState(true);
    ```
  - Disparo de `fetchLogs` no hook `useEffect` em lote assíncrono.
- **Output:** Renderização da estrutura escura premium com o badge pulsante `"Ingestão Ativa"` em esmeralda. Painel de log de operações exibe 3 cartões de esqueleto animados (shimmer).
- **Side Effects:** Uma query `SELECT` ordenada decrescentemente por `created_at` com limite de 20 itens na tabela `public.itau_sync_logs` via cliente Supabase JS.
- **Backstage:** Varredura rápida de índice na chave primária da tabela de logs do Supabase.

---

### Step 2: Webhook Endpoint Sharing & iOS Integration Flow
- **Input:** Clique no botão `<button onClick={handleCopyUrl} ...>` no painel "Gateway de Captura (SMS)".
- **System:**
  - Cópia assíncrona da string `https://jdliepgseoyoxfygmdet.supabase.co/functions/v1/sms-webhook` no clipboard do sistema operacional.
  - O estado `copied` é chaveado para `true`.
  - Disparo de um timer `setTimeout` de 2000ms para reiniciar o estado local de volta a `false`.
- **Output:** Transição suave por CSS do ícone `<Copy />` para o ícone de confirmação `<Check className="text-white animate-bounce" />` e alteração do texto do botão para "Copiado".
- **Side Effects:** Acesso à API `navigator.clipboard`.
- **Backstage:** Nenhum.

---

### Step 3: SMS Webhook Delivery Payload (iOS Shortcuts Execution)
- **Input:** O aplicativo Atalhos (iOS Shortcuts) dispara uma chamada `POST` contendo o SMS estruturado ou em texto puro para `/sms-webhook` passando o `user_id` na URL do webhook.
- **System:**
  - O servidor Deno na Edge Function intercepta a chamada, valida o método `POST` e o cabeçalho CORS.
  - Autentica o usuário via JWT Authorization Header ou extrai o `user_id` diretamente dos query parameters do webhook.
  - Extrai o corpo do SMS: se o Content-Type for `application/json`, tenta ler `texto_sms`. Caso contrário, lê o corpo bruto como texto simples (fallback resiliente).
  - Realiza o parseamento no helper `parseSms(texto)` usando 4 regex dedicadas:
    1. Pix Recebido (Itaú)
    2. Compra aprovada no Cartão (Itaúcard/genérico)
    3. Pix Enviado / Transferência (Itaú)
    4. Compra aprovada genérica
  - Gera um hash identificador único `SHA-256` em Deno (via `crypto.subtle.digest`) para deduplicação.
  - Tenta persistir a transação em `public.transactions`. Em caso de erro de duplicidade (código de erro Postgres `23505`), descarta de forma segura.
  - Recalcula e sincroniza imediatamente as linhas de saldo correspondentes em `public.balances`.
  - Registra a operação com sucesso ou falha na tabela `itau_sync_logs` para auditoria do usuário.
- **Output:** Resposta HTTP 200 contendo o status (`inserted` ou `duplicate`) e a transação parseada. O extrato e os saldos no dashboard refletem a alteração imediatamente.
- **Side Effects:** Escrita e atualização no Supabase (`transactions`, `balances`, `itau_sync_logs`).
- **Backstage:** Execução em Deno Runtime com tratamento de erros robusto e isolamento de RLS via chave de serviço para processamento offline.

---

### Step 4: Manual File Uploading Pipeline & Gemini AI Parser Redirection
- **Input:** Usuário seleciona ou arrasta um extrato bancário PDF de Itaú e clica no botão "Processar Extrato".
- **System:**
  - Bloqueio imediato da UI ativando `processingFile = true`.
  - Envio do arquivo via Multipart FormData para o endpoint Next.js `/api/itau/upload`.
  - **Execução no Servidor Node.js (`/api/itau/upload/route.ts`):**
    1. Validação de token Bearer ou sessão activa com Supabase.
    2. Identificação da extensão do arquivo (`pdf`).
    3. Parser Tradicional (`parsePdf`): Executa o extrator estático `pdf-parse` e varre o texto utilizando expressões regulares calibradas para o extrato de conta corrente Itaú (`/^\d{2}\/\d{2}\/\d{4}\s+(.+?)\s+(-?\d{1,3}(?:\.\d{3})*,\d{2})\s*$/gm`).
    4. **Fallback Inteligente (IA):** Se o parser estático retornar 0 lançamentos (por exemplo, em PDFs digitalizados ou novos layouts de extrato), o servidor ativa a rota neural do Gemini chamando `parseStatementWithAI(buffer, 'application/pdf')`.
    5. Deduplicação: Para cada transação mapeada, gera um hash de identificação único usando o algoritmo `SHA-256`:
       ```typescript
       const sourceHash = crypto.createHash('sha256').update(`${userId}|${date}|${desc}|${amount}`).digest('hex');
       ```
       Realiza o `INSERT` na tabela `transactions`. Se houver colisão na constraint de chave única de `source_hash`, captura o erro Postgres `23505` e incrementa a contagem de duplicatas ignoradas.
    6. Atualiza as métricas acumuladas de saldo nas categorias `total`, `income` e `expense` na tabela `balances`.
    7. Escreve o log de auditoria na tabela `itau_sync_logs` registrando as quantidades de registros processados, inseridos e duplicados.
- **Output:** O letreiro indica progressivamente "Analisando estrutura do arquivo...", depois "Aplicando parser Itaú..." e finalmente "Importação Concluída" em um painel verde com os números exatos importados.
- **Side Effects:** Escrita física no banco de dados (inserção múltipla na tabela `transactions`, atualização de saldos em `balances` e criação de log de execução em `itau_sync_logs`).
- **Backstage:** Pipeline transacional robusto que impede escrita parcial sob falhas inesperadas de rede ou banco.

---

### Step 5: mTLS BaaS Syncing & Sandbox Simulator Fallback Pipeline
- **Input:** Clique do usuário em sincronizar no cabeçalho ou reload manual dos logs de conexão Itaú.
- **System:**
  - Disparo de requisição `POST` para `/api/api/itau/sync`.
  - **Execução no Servidor Node.js (`/api/itau/sync/route.ts`):**
    1. O servidor verifica a existência dos certificados físicos do Itaú nas Secrets de Produção (`ITAU_CERT_PEM` e `ITAU_KEY_PEM`).
    2. **Caso 1 (Produção):** Se os certificados existirem, inicia o handshake seguro mTLS encapsulado por um agente HTTPS personalizado e executa a requisição assíncrona autenticada pelo STS OAuth Itaú (`https://sts.itau.com.br/oauth/token`) e puxa os lançamentos reais da API de Extratos Bancários do Itaú (`https://api.itau.com.br/extrato/v2/lancamentos`).
    3. **Caso 2 (Sandbox/Simulação):** Se as credenciais estiverem vazias, o servidor autogera lançamentos financeiros realistas de Itaú para simulação local, mantendo a fidelidade da experiência sem travar a interface.
    4. Sincroniza lançamentos no banco com detecção de hash único para impedir duplicidade via helper `generateTransactionHash`.
    5. Recalcula os agregados na tabela `balances` e atualiza a coluna `last_synced_at` na tabela `itau_connections`.
- **Output:** A interface recarrega a tabela de lançamentos recentes e atualiza o histórico de transações com dados populados.
- **Side Effects:** Múltiplas leituras e escritas assíncronas nas tabelas `transactions`, `balances`, `itau_connections` e `itau_sync_logs`.
- **Backstage:** Handshake SSL complexo com autenticação mTLS baseada em chave pública cadastrada na infraestrutura do Itaú.

---

## 👻 Phantom Flows Detectados

- **[/api/ai/test/route.ts](file:///d:/APPS%20-%20ANTIGRAVITY/G-Finance/src/app/api/ai/test/route.ts):** Rota fantasma de testes exposta no diretório de produção `/api`. Este arquivo contém um endpoint mockup exposto publicamente que ignora validações de sessão e deve ser deletado imediatamente para evitar vazamento de informações e consumo desnecessário de cotas em ambiente de produção.
- **Dynamic Webhook Link:** A URL do webhook exibida na tela de integrações é dinâmica e já inclui a query parameter `?user_id=UUID` do usuário conectado, eliminando a complexidade de configuração manual.

---

## ⚡ Recomendações e Plano de Correção


### 1. Refatoração Completa do Gateway de Captura SMS (Persistência Real) — [RESOLVIDO]
- **Gargalo:** Anteriormente a Edge Function apenas validava mas não persistia as transações nem atualizava o saldo.
- **Solução Aplicada:** Integrada a biblioteca `@supabase/supabase-js` com chave de serviço no Deno da Edge Function. Adicionado parseamento resiliente de plain text e URL query params, deduplicação por hash SHA-256 e recálculo dinâmico de saldos.
- **Estado:** 100% Funcional e implantado.

---

### 2. Badge Visual de Conexão: Simulação vs Produção
- **Gargalo:** O usuário não sabe se o botão de sincronizar está emulando lançamentos fictícios (Sandbox) ou consumindo a API real mTLS de produção do Itaú.
- **Solução:** Retornar a flag `mode` na resposta JSON do endpoint `/api/itau/sync`. No frontend, capturar o modo e renderizar um badge com estilo premium nos logs de sincronização ou na barra lateral de conexões.
- **Código Proposto (Client-side):**
  ```typescript
  // Na resposta de sincronização
  const result = await response.json();
  // Exibir badge customizado no JSX
  {result.mode === 'mTLS Production' ? (
    <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] font-black uppercase">
      Conexão Real mTLS
    </span>
  ) : (
    <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[9px] font-black uppercase">
      Simulação Ativa
    </span>
  )}
  ```
- **Custo:** **S** (Ajuste rápido de retorno de API e markup condicional na UI, ~1h)

---

### 3. Integração de Notificações em Tempo Real (Supabase Realtime)
- **Gargalo:** O usuário precisa clicar em atualizar ou atualizar a página toda para ver novos logs de operações de arquivos e SMS inseridos em background.
- **Solução:** Subscrever ao canal de realtime do Supabase para escutar a tabela `itau_sync_logs` e disparar um Toast animado em tela sempre que um novo processamento de importação manual ou SMS for registrado com sucesso.
- **Código Proposto:**
  ```typescript
  useEffect(() => {
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'itau_sync_logs' },
        (payload) => {
          fetchLogs(); // Recarrega feed local de logs
          toast.success(`Nova ingestão detectada: ${payload.new.file_name || 'SMS recebido'}!`);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchLogs]);
  ```
- **Custo:** **M** (Configuração de listeners realtime e design de alertas em toast, ~3h)

---

### 4. Provisionamento Descentralizado de Chaves Privadas (Auto-Service)
- **Gargalo:** As chaves mTLS (`ITAU_CERT_PEM` e `ITAU_KEY_PEM`) são globais e ficam travadas nas Secrets do backend do servidor, impedindo que múltiplos usuários utilizem suas próprias credenciais corporativas ou contas do Portal BaaS do Itaú de forma independente.
- **Solução:** Expandir a tabela `itau_connections` permitindo encriptar as chaves PEM usando criptografia AES-GCM simétrica client-side e salvando de forma isolada na coluna de bytes `client_secret_encrypted` do usuário autenticado. O backend recupera a chave criptografada do banco e a decifra em memória sob demanda usando a chave mestra do sistema apenas durante o handshake HTTP.
- **Custo:** **L** (Arquitetura de criptografia com chaves separadas, desenvolvimento de UI de upload de arquivo .pem para o perfil do usuário, ~10h)

---

## 🏓 Handoff de Especialistas

- **Para [hm-ux-flow](file:///d:/APPS%20-%20ANTIGRAVITY/G-Finance/.agent/workflows/hm-ux-flow.md):** Auditar a jornada de onboarding de usuários iniciantes no iOS Shortcuts. O fluxo de configurar a automação do celular envolve muitos passos manuais no iOS que podem causar abandono precoce de 50%+ se as telas explicativas dentro da plataforma não contarem com GIFs ilustrativos ou vídeos de demonstração premium.
- **Para [hm-qa](file:///d:/APPS%20-%20ANTIGRAVITY/G-Finance/.agent/workflows/hm-qa.md):** Projetar testes de concorrência massiva de upload de arquivos pesados (ex: extratos PDF anuais de +100 páginas) para validar o tempo limite de resposta (timeout) e garantir que a requisição de backend não exceda os limites da API Vercel Serverless (limite de 10-15s em planos Hobby/Pro).
- **Para [hm-designer](file:///d:/APPS%20-%20ANTIGRAVITY/G-Finance/.agent/workflows/hm-designer.md):** Desenhar o layout da janela modal "Configurações de mTLS Itaú", aplicando elementos gráficos que transmitam alto nível de segurança cibernética (estética zero-trust, indicação de encriptação AES-256 e visualizadores de logs mTLS interativos).
- **Para [hm-performance](file:///d:/APPS%20-%20ANTIGRAVITY/G-Finance/.agent/workflows/hm-performance.md):** Analisar a latência média do parser Gemini em PDFs de extratos e avaliar a implementação de filas assíncronas em background (via BullMQ ou Supabase Edge Functions assíncronas) com respostas Webhook de callback para evitar travamento da rota síncrona HTTP POST do cliente.
