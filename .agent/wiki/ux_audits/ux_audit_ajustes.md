---
title: "Exhaustive UX Flow Audit: Ajustes (Settings & Profile)"
tags: [ux-audit, cognitive-load, decision-fatigue, security-theater, g-finance]
date_created: "2026-05-27"
auditor: "Antigravity (UX/UI Psychologist & Highermind Agent)"
status: "Completed"
verdict: "REDESIGN"
---

# 🧠 UX Flow Audit: Ajustes (Settings & Profile)
**Projeto:** G-Finance  
**Analista:** Antigravity (Especialista em Psicologia Cognitiva & UX)  
**Data da Auditoria:** 27 de Maio de 2026  
**Eixo de Análise:** Sobrecarga Cognitiva, Atrito Emocional e Integridade Psicológica do Usuário (Trust & Security Architecture)

---

## 📊 Visão Geral do Fluxo

O painel de **Ajustes (Settings & Profile)** da aplicação [`src/app/settings/page.tsx`](file:///d:/APPS%20-%20ANTIGRAVITY/G-Finance/src/app/settings/page.tsx) é o coração administrativo da jornada do usuário no G-Finance. Nele, cruzam-se fluxos cruciais de conveniência (Acesso por PIN), segurança (Duas Etapas), integração de dados (Google OAuth/API) e personalização básica (Avatar, Nome). 

Abaixo está o mapeamento detalhado da jornada do usuário e a avaliação psicológica das fricções cognitivas identificadas.

---

## 🗺️ Tabela Comparativa de Jornada: Ideal vs. Real

| Passo | Fluxo Ideal (Espectativa Cognitiva) | Fluxo Real (Comportamento Empírico) | Desvio (Fricção) | Impacto Psicológico |
| :--- | :--- | :--- | :---: | :--- |
| **1. Carregamento** | O usuário acessa `/settings` e visualiza o estado de suas configurações consolidado de forma instantânea ou com transição suave. | A página exibe imediatamente todos os painéis vazios ou em estado negativo (ex: Google desvinculado, PIN inativo), alterando abruptamente após o fetch assíncrono. | `Layout Shift / False State` | **Fadiga Visual & Confusão**: O cérebro processa o estado "desvinculado" como um erro ou ação a ser tomada, gerando falsos alarmes cognitivos. |
| **2. Alteração de Foto** | O usuário seleciona uma imagem, o sistema valida, exibe uma barra de progresso e salva a imagem de forma assíncrona. | A imagem é convertida em uma string Base64 gigante, carregada em memória local e exige que o usuário clique em "Salvar Alterações" no rodapé. | `Unsaved Changes Trap` | **Frustração por Perda**: Se o usuário trocar a foto e sair da página sem salvar o formulário inteiro, as alterações são silenciosamente perdidas sem aviso. |
| **3. Vínculo OAuth** | O usuário vincula a conta do Google de maneira ágil para sincronizar dados e credenciais de forma transparente. | O redirecionamento exige um escopo estendido para a API do Google Cloud Platform (`scopes: cloud-platform`), assustando com permissões invasivas. | `Permission Bloat` | **Quebra de Confiança (Paranoia)**: Pedir permissão sobre toda a conta do Google Cloud para um app financeiro aciona alertas graves de segurança mental no usuário. |
| **4. Setup do PIN** | O usuário define um PIN rápido para seu dispositivo de confiança para simplificar o login diário. | O formulário exige que o usuário digite a senha mestra para verificar e encriptar os dados via XOR. Usuários de login social (Google) falham imediatamente. | **[BLOCKER]** `OAuth Catch-22` | **Bloqueio Emocional**: O usuário que utiliza login social se sente punido por adotar práticas modernas, sendo impossibilitado de ativar o PIN. |
| **5. Preferências** | O usuário ativa/desativa Notificações Push ou Autenticação de 2 Fatores de forma interativa. | Os sliders alteram o estado visual do React instantaneamente, mas não persistem dados no banco nem no LocalStorage. | **[BLOCKER]** `Phantom State` | **Falsa Sensação de Segurança**: O usuário acredita que ativou a autenticação em duas etapas e que seus fundos estão protegidos, mas a preferência some no F5. |

---

## 🔍 Análise Profunda sob a Lente da Psicologia Cognitiva

### 1. O Paradoxo do Acesso por PIN: Ilusão de Segurança vs. Blocker Crítico
O cérebro humano busca atalhos cognitivos para diminuir a resistência a tarefas diárias (Lei de Zipf ou Princípio do Menor Esforço). O PIN de 4 dígitos é um excelente atalho: substitui uma senha complexa por um padrão rápido no dispositivo confiável. No entanto, a implementação atual sofre de dois problemas estruturais graves:

* **O Beco Sem Saída do OAuth (The Catch-22):** Para configurar o PIN, o sistema executa `supabase.auth.signInWithPassword` no cliente (linhas 221-228).
  ```typescript
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password: verifyPassword
  });
  ```
  Se o usuário criou a conta usando o botão "Entrar com Google", ele **não possui senha local** registrada no Supabase. O formulário exige "Confirmar com sua Senha Atual" e falha sistematicamente com o erro: `"Erro de validação: Invalid login credentials"`.
  > [!CAUTION]
  > **Diagnóstico Cognitivo:** Isso cria um estado mental de **desamparo aprendido (learned helplessness)**. O usuário faz tudo certo (adota o login social moderno recomendado e tenta configurar o PIN de segurança), mas é punido com um erro frustrante e inexplicável do ponto de vista do seu modelo mental.

* **Cifragem XOR de 4 Dígitos (Security Theater):** O sistema utiliza o PIN de 4 dígitos para cifrar simetricamente a senha mestra do usuário via XOR (módulo [`src/lib/crypto.ts`](file:///d:/APPS%20-%20ANTIGRAVITY/G-Finance/src/lib/crypto.ts)) e armazena o resultado em `localStorage`.
  * **Problema:** Um PIN de 4 dígitos tem apenas **10.000 combinações**. Qualquer script malicioso executado via XSS ou um ator com acesso temporário ao dispositivo do usuário pode brute-forçar a chave do XOR em milissegundos e extrair a senha da conta Supabase em **texto plano**.
  * **Efeito Psicológico:** Trata-se de um clássico caso de **teatro de segurança (security theater)**. O sistema transmite a ilusão de um cofre impenetrável de "Acesso Seguro por PIN", quando na verdade está expondo as credenciais mais valiosas do usuário de maneira trivial na máquina local.

---

### 2. Layout Shifts e Falsos Negativos (Geração de Micro-Ansiedade)
Durante o carregamento inicial da página (`loading = true`), o componente apenas renderiza o spinner dentro do primeiro painel ("Perfil do Usuário"). Todos os outros painéis ("Contas Vinculadas", "Acesso Rápido por PIN", "Preferências") são desenhados imediatamente baseando-se em estados iniciais padrão (vazios/falsos).

```typescript
{identities.some((id: any) => id.provider === 'google') ? (
  // Renderiza estado conectado
) : (
  // Renderiza estado desconectado
)}
```

* **Comportamento Empírico:** Durante os primeiros 300-800ms de carregamento, o painel "Contas Vinculadas" exibe o botão `"Vincular Conta Google"`. Assim que o `fetchProfile` é concluído, o painel redesenha abruptamente para o estado `"Desvincular"`.
* **Análise Psicológica:** Esse atrito gera **micro-ansiedade visual**. O usuário percebe a mudança súbita de layout (Layout Shift) e, se o carregamento demorar um pouco mais, pode clicar impulsivamente em "Vincular", disparando uma ação redundante antes que o estado real seja renderizado. O cérebro é forçado a reprocessar a interface duas vezes.

---

### 3. Preferências Fantasmas: Quebra de Contrato Mental
Os seletores de **Preferências do Sistema** (Notificações Push e Autenticação de Duas Etapas) utilizam estados React isolados (`pushNotif` e `twoFactor`) que mudam de cor e deslizam ao clique do usuário, dando a entender que a ação foi registrada.

* **Fato:** Não há persistência no banco de dados e nem em `localStorage` para esses estados. Ao atualizar a página com F5, os valores voltam aos defaults (`true` e `false`).
* **Análise Psicológica:** Há uma **quebra do contrato implícito de interface**. Quando um seletor visual reage com animações e micro-feedback sem um botão de "Salvar" ao lado, a mente do usuário assume que a configuração foi salva em tempo real. Descobrir que suas alterações foram ignoradas gera perda de confiança no produto e uma sensação de que a plataforma é inacabada ou "quebrada".
* **Agravante de Segurança:** A ativação do toggle "Autenticação em Duas Etapas" induz o usuário a acreditar que sua conta está blindada contra acessos não autorizados. Isso pode levá-lo a manter saldos maiores ou ser menos cauteloso, sob a falsa premissa de que a proteção 2FA está operando no backend.

---

### 4. Paralisia de Decisão: O Grid AI Expositivo
A seção de **Recursos do Gemini AI Brain** consome uma grande fatia vertical da página de configurações, apresentando um grid extremamente detalhado com 11 ferramentas técnicas de API (ex: `list_user_transactions`, `reconcileBalances`, `delete_user_reminder`) e suas respectivas permissões ("Leitura", "Escrita", "Exclusão").

```typescript
<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
  {/* Renderiza 11 cards técnicos com escopos e explicações */}
</div>
```

* **Falta de Affordance e Ação:** Embora pareça um painel de firewall ou console de permissões de privacidade onde o usuário pode habilitar ou desabilitar cada recurso da IA, o grid é **100% estático**.
* **Sobrecarga de Informação (Information Overload):** Expor a assinatura interna de funções e tabelas do banco de dados na página de configurações do usuário final gera ruído técnico. O usuário comum não compreende o que é `reconcileBalances` e é forçado a processar um excesso de jargão de desenvolvimento sem ter nenhuma decisão acionável para tomar. O cérebro se cansa com informações irrelevantes para o seu objetivo direto de ajustar sua conta.

---

## 🚫 Detalhamento de Fricções Específicas (`/hm-ux-flow` Protocol)

### A. Decisões Desnecessárias
* **[Settings Page: L213-L216] Exigência de Senha Manual para Setup de PIN:** Para quem já está logado de forma segura e autenticado via sessão válida, exigir a senha da conta apenas para criar uma chave de cifragem local é uma decisão de atrito desnecessária. Para contas OAuth, é uma decisão impossível que bloqueia o fluxo.
  * **Fix:** Mudar o fluxo para não exigir a senha mestra se a autenticação via OAuth estiver ativa, utilizando mecanismos baseados em tokens de sessão seguros ou credenciais delegadas.

* **[Settings Page: L181-L200] Duplo Consentimento na Foto:** O usuário escolhe a foto pelo seletor nativo, o app exibe a foto no preview e lança um banner dizendo que a foto foi alterada temporariamente e exige que ele clique em "Salvar Alterações" no rodapé para de fato enviar ao banco.
  * **Fix:** Persistir o upload da foto diretamente no evento `onChange` com um loader discreto (Shimmer/Spinner no círculo do avatar) e salvar imediatamente. Elimina o atrito do duplo salvamento.

---

### B. Decisões Mal Posicionadas
* **[Settings Page: L122] Consentimento de Permissões Críticas do Google upfront:** O botão de vínculo com o Google exige a permissão `https://www.googleapis.com/auth/cloud-platform` de imediato. A solicitação desse escopo invasivo deveria ocorrer de forma postergada (Lazy/Just-in-Time consent) apenas quando o usuário de fato tentar utilizar as ferramentas de IA do Gemini vinculadas ao Google Cloud, e não ao realizar uma simples ligação de conta em Ajustes.
  * **Fix:** Separar a sincronização básica de perfil da sincronização avançada de agentes da IA.

---

### C. Decisões Sem Informação Suficiente
* **[Settings Page: L630-L673] Toggles sem Microcopy de Efeito:** Os switches de preferências do sistema carecem de textos que informem o usuário sobre onde e como essas preferências se aplicam (ex: "Notificações são salvas por dispositivo ou em nuvem?"). E, fundamentalmente, carecem de persistência real.
  * **Fix:** Adicionar microcopy explicativo e, acima de tudo, persistir os estados de forma persistente e robusta.

---

## ⚡ Recovery de Erro & Estados Assíncronos

### 1. Mecanismo de Fallback Silencioso (Erro Ocultado)
Na função `fetchProfile`, se ocorrer um erro de banco ou rede, o sistema limpa silenciosamente o estado de erro e injeta um perfil padrão mockado:

```typescript
if (error && !currentProfile) {
  const defaultProfile = {
    id: user.id,
    full_name: user.user_metadata?.full_name || 'Guilherme R.',
    avatar_url: user.user_metadata?.avatar_url || '',
    pin: null
  };
  setProfile(defaultProfile);
}
```

* **Avaliação de UX:** **Grave.** O usuário pode estar navegando com uma sessão corrompida ou offline e o sistema finge que está tudo bem preenchendo o nome fictício `"Guilherme R."` em vez do nome real dele. Ao tentar editar e salvar, o usuário receberá erros de gravação sem entender por quê.
* **Fix:** Exibir um aviso amigável de erro na tela (ex: "Não foi possível carregar seus dados mais recentes. Tente novamente") e manter o formulário travado para edição até que a sincronização ocorra.

### 2. Loading Estático e Parcial (Layout Shifting)
Como discutido, a ausência de um skeleton loader global para a página gera flicker em todos os painéis dinâmicos.
* **Fix:** Implementar um **Skeleton Loader** elegante que cubra os painéis de Contas Vinculadas e PIN de forma unificada enquanto o perfil e as identidades do Supabase estão sendo resolvidos no mount.

---

## 💾 Armazenamento Ineficiente do Avatar (Atrito Oculto)
O arquivo de imagem é lido via `FileReader.readAsDataURL` e armazenado como string Base64 diretamente no banco de dados na coluna `profiles.avatar_url`.
* **Impacto em UX:** Uma imagem de 2MB gera uma string Base64 de quase 2.7MB. Toda vez que o usuário carregar qualquer tela do G-Finance que exiba seu avatar na barra superior, ele fará o download de quase 3MB de dados puros de texto do banco. Isso destrói a performance em conexões móveis, gerando lentidão extrema no carregamento do dashboard.
* **Fix:** Modificar o fluxo de imagem para subir o arquivo para o Supabase Storage Bucket (`avatars/`) e salvar apenas a URL pública resultante no registro do perfil.

---

## 🏆 Veredicto de UX

> [!CAUTION]
> ### 🚨 VEREDICTO DE UX FLOW: REDESIGN REQUIRED
> O painel de Ajustes apresenta múltiplas fricções severas que impossibilitam sua utilização plena com segurança e integridade cognitiva. O conflito do PIN para usuários OAuth, a criptografia XOR que coloca em risco as credenciais mestras em LocalStorage, a total volatilidade das preferências (que agem como placebo técnico) e o layout shift agressivo durante o carregamento tornam obrigatória uma reestruturação do fluxo.

---

## 🛠️ Plano de Ação para Redesenho do Fluxo (Sugestão de Engenharia)

### 🔴 Urgência Alta (Segurança & Bloqueios)
1. **Solução do Bloqueio OAuth no PIN (Custo L/Arquitetura):**
   * Parar de exigir a senha do Supabase para configurar o PIN de usuários sociais.
   * **Implementar o fluxo baseado em Refresh Token Cifrado**: O PIN passa a cifrar e decifrar localmente o `refresh_token` do Supabase. No login por PIN, o app invoca o refresh de sessão usando o token descriptografado, evitando a necessidade de senha de forma 100% segura e compatível com logins OAuth.
2. **Fortalecimento Criptográfico (Custo M/Refatoração):**
   * Substituir o XOR ingênuo de [`src/lib/crypto.ts`](file:///d:/APPS%20-%20ANTIGRAVITY/G-Finance/src/lib/crypto.ts) pela API criptográfica nativa do navegador (**Web Crypto API**). Utilizar derivador de chaves **PBKDF2** e cifragem **AES-GCM** para garantir que a quebra do segredo em LocalStorage seja criptograficamente inviável sob ataque de força bruta.
3. **Persistência Real de Preferências (Custo S/Rápido):**
   * Conectar os sliders de notificações e 2FA ao LocalStorage como fallback temporário imediato, salvando e lendo os estados nos hooks `useEffect`. Posteriormente, criar colunas correspondentes na tabela `profiles` para sincronização em nuvem.

### 🟡 Urgência Média (Fidelidade do Fluxo & Performance)
1. **Erradicação do Layout Shift (Custo S/Rápido):**
   * Estender o estado `loading` para os painéis de Google OAuth e PIN. Enquanto `loading` for verdadeiro, renderizar shimmer skeletons refinados nos espaços dos botões para evitar flickers visuais assustadores.
2. **Sincronização Direta de Imagens no Storage (Custo M/Refatoração):**
   * Integrar o seletor de imagens diretamente com a API do Supabase Storage. O upload deve atualizar a imagem de perfil instantaneamente, mostrando um loader de porcentagem sobre a foto e salvando em nuvem sem depender do botão geral "Salvar Alterações".

### 🟢 Urgência Baixa (Clareza de Escolhas)
1. **Simplificação e Opcionalidade do Grid AI (Custo S/Rápido):**
   * Transformar a seção do Gemini AI Brain em um painel colapsável ("Ver permissões detalhadas da IA") ou mover as descrições técnicas para uma página dedicada de documentação. Reduz a altura do painel de Ajustes e limpa a área de decisão do usuário final.
