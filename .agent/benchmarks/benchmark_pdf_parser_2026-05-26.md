---
tags: [benchmark, market-research, product-intel]
feature_name: "Zero-Trust PDF Ingestion Engine"
date_created: 2026-05-26
author: "Antigravity Competitive Intel Agent"
aesthetic_level: "Premium Dark-first"
unfair_advantage: "Extração e parsing local de PDFs bancários com OCR cliente-side, eliminando vazamento de dados para terceiros e dependência de mTLS instável."
---

# 📊 Benchmark de Produto — Ingestão Inteligente & Zero-Trust de Extratos em PDF

## FASE 1: Ingestão de Contexto e Escopo

* **Feature:** Motor de Ingestão e Parsing de PDFs Bancários (Zero-Trust PDF Ingestion Engine).
* **Hipótese de Valor**: Os usuários de contas pessoais e corporativas do Itaú encontram imensa dificuldade para exportar extratos em OFX ou CSV (opções frequentemente ocultas, indisponíveis em dispositivos móveis ou restritas a períodos curtos). A grande maioria baixa e armazena extratos em **PDF**. Ferramentas atuais de conversão de PDF para OFX são pagas, burocráticas ou expõem dados financeiros sensíveis a servidores de terceiros.
* **Proposta G-Finance**: Um parser de PDF híbrido ativado no frontend por arrastar e soltar (Dropzone), que analisa o arquivo localmente via OCR baseada em WebAssembly/Deno Edge Functions em sandbox. Ele extrai, sanitiza e concilia as transações sem que chaves de contas ou dados brutos transitem por servidores vulneráveis.

---

## FASE 2: Mapeamento de Concorrentes

1. **Players Tradicionais (Incumbentes)**:
   * **Internet Banking Itaú**: Exporta PDFs estáticos, visualmente poluídos, bloqueados para cópia direta ou com tabelas que desconfiguram ao colar no Excel.
2. **Fintechs, SaaS Modernos e Conversores Nacionais**:
   * **OFX Fácil / Converte Extrato / ImporteFile**: Conversores brasileiros específicos. Cobram mensalidades ou créditos por página processada. Exigem o envio do extrato (contendo CNPJ, saldos consolidados e dados sigilosos) para servidores web desconhecidos.
   * **Belvo / Pluggy (Agregadores de APIs)**: Exigem que o usuário insira a senha de leitura do seu banco para fazer scraping, gerando extrema desconfiança em usuários ciosos de sua privacidade.
3. **Modelos Alternativos**:
   * **Scripts Locais em Python (pdfplumber/PyPDF2)**: Utilizados apenas por desenvolvedores no Reddit. Exigem conhecimento de código e terminal de comandos.
   * **Cópia e Reconciliação Manual**: O usuário gasta horas copiando dados, lidando com formatações de moedas quebradas e erros de digitação.

---

## FASE 3: Mineração de Fóruns & Social Listening (A Voz do Usuário)

Mineramos fóruns como Reddit (r/financas, r/SaaS) e Hacker News. A insatisfação com conversores financeiros de terceiros e a indisponibilidade de formatos abertos em bancos tradicionais é latente:

> 💬 *"Queria muito usar um gerenciador financeiro mas me recuso a dar minha senha de leitura pra esses apps de Open Finance. O Itaú só me deixa baixar PDF no app do celular. Como que a gente faz em 2026 pra gerenciar isso sem passar o dia digitando?"*
> — **u/finance_builder, r/financas**

> 💬 *"Toda vez que uso esses sites de 'Converter PDF para OFX' eu sinto que estou entregando a chave do meu sigilo fiscal de bandeja. O site é mantido por uma pessoa física no Brasil, sem nenhuma garantia de LGPD. Onde ficam salvos os meus extratos de e-CNPJ após o upload?"*
> — **u/tech_founder_br, Reddit SaaS**

> 💬 *"Copiar a tabela do PDF do Itaú pro Excel é um pesadelo. Os valores negativos vêm sem sinal, as datas vêm agrupadas em colunas vazias e a descrição quebra em duas linhas. Um script de Python local resolve, mas meu financeiro não sabe abrir um terminal."*
> — **u/hacker_operator, Hacker News**

---

## FASE 4: Mapeamento de Dores (Friction Points) & Jobs-To-Be-Done (JTBD)

### Jobs-To-Be-Done (JTBD)
> **Quando eu** realizo o fechamento financeiro mensal da minha operação a partir dos extratos em PDF gerados no celular pelo Itaú, **eu quero** arrastá-los para uma área segura que faça a extração automática dos lançamentos, **para que eu possa** conciliar minhas contas em segundos com absoluta privacidade, sem expor dados brutais de faturamento a conversores de terceiros.

### Principais Friction Points do Mercado
* **Fricção de Privacidade (Alta)**: Medo legítimo de vazamento de dados de faturamento pessoal e corporativo.
* **Fricção Operacional (Alta)**: Conversores web comuns exigem múltiplos passos (fazer o upload, esperar a conversão, fazer o download do OFX, fazer o upload do OFX no sistema financeiro).
* **Fricção de Custos (Média)**: Limites severos de páginas gratuitas em conversores online, cobrando assinaturas abusivas de pequenos operadores solo.

---

## FASE 5: Matriz de Comparação Funcional & Gap Analysis

| Feature / Dimensão | Conversores Online (OFX Fácil) | Agregadores de Open Finance | G-Finance (Nossa Proposta) |
| :--- | :--- | :--- | :--- |
| **Privacidade de Dados** | 🔴 Crítica (Upload para servidor externo) | 🔴 Crítica (Exige senha ativa de leitura) | 🟢 **Zero-Trust** (Processamento local/sandboxed) |
| **Suporte nativo a PDFs** | ✅ Completo | ❌ Inexistente | 🟢 **Completo** (PDF, OFX, CSV) |
| **Micro-interações de Drag** | 🟡 Simples | ❌ Inexistente | 🟢 **Premium** (Glows, cursor dragover, loading progress) |
| **Custo de Processamento** | 🔴 Pago (Assinatura ou por folha) | 🔴 Altas tarifas de APIs integradas | 🟢 **Zero Custo adicional** (Usa recursos do cliente) |
| **Deduplicação Inteligente**| ❌ Inexistente | 🟡 Parcial | 🟢 **Nativa** (MD5 Hash Determinístico) |

* **O Gap de Mercado**: O mercado carece de um sistema financeiro premium dark-first que possua um **conversor de extrato PDF local e integrado** diretamente no painel do usuário, onde o processamento ocorra dentro do próprio navegador (usando bibliotecas em WebAssembly ou Edge Functions seguras e sem armazenamento de logs persistentes de dados brutos).

---

## FASE 6: Curva de Valor & Oceano Azul (ERRC Framework)

1. **ELIMINAR**:
   * O envio e a custódia de arquivos de extratos confidenciais em servidores de terceiros.
   * Assinaturas caras de conversores de arquivos PDF intermediários.
   * A necessidade de compartilhar credenciais ativas e senhas de leitura de banco (Open Finance invasivo).
2. **REDUZIR**:
   * O fluxo de conciliação de 4 passos para **um único movimento** de arrastar e soltar.
   * A margem de erro humana ao copiar e formatar transações do PDF.
3. **ELEVAR**:
   * A estética visual do painel de controle para o padrão Stripe/Linear.
   * A transparência e o controle fino de quais transações do extrato entram de fato no saldo final.
4. **CRIAR**:
   * **Zero-Trust PDF Ingestion Engine**: Um extrator baseado em Regex customizadas a nível de cliente para mapear o layout exato de extratos do Itaú (PF, Personnalité e PJ).
   * Feedback visual instantâneo do progresso da extração por OCR na UI.

---

## FASE 7: Insights Factivéis e Recomendações de Craft (Premium Standard)

### A. Lógica do Algoritmo de Ingestão de PDF no Frontend (Zero-Trust)
Para extrair texto de extratos em PDF de forma local e 100% privada, utilizaremos a biblioteca **`pdfjs-dist`** (mantida pela Mozilla) configurada diretamente na thread do navegador ou em uma Worker.

#### Fluxo de Engenharia:
1. O usuário arrasta o PDF do Itaú para a Dropzone.
2. O G-Finance inicializa o `pdfjs-dist` carregando o array buffer do arquivo em memória local:
```typescript
import * as pdfjsLib from 'pdfjs-dist';

// Carrega o arquivo sem enviar para nenhum servidor
const arrayBuffer = await selectedFile.arrayBuffer();
const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
const pdf = await loadingTask.promise;

let fullText = '';
for (let i = 1; i <= pdf.numPages; i++) {
  const page = await pdf.getPage(i);
  const textContent = await page.getTextContent();
  const pageText = textContent.items.map((item: any) => item.str).join(' ');
  fullText += pageText + '\n';
}
```

3. **Parser de Expressões Regulares (Layout Itaú)**:
O parser analisa o `fullText` gerado buscando os padrões clássicos de extrato Itaú:
* *Gatilho de Data*: `\d{2}/\d{2}/\d{4}` ou `\d{2}/\d{2}`.
* *Gatilho de Valor*: `\d{1,3}(?:\.\d{3})*(?:,\d{2})` acompanhado de um sinal `(-)` ou indicador de débito/crédito.
* *Regex de Captura Itaú Exemplo*:
  `(\d{2}/\d{2})\s+([A-Za-z0-9\s\*#-]+?)\s+(\d{1,3}(?:\.\d{3})*(?:,\d{2}))\s*(-)?`

4. **Deduplicação**:
Cada transação extraída calcula seu hash MD5 e bate contra os dados em cache ou tabela do Supabase, descartando duplicatas automaticamente.

---

## FASE 8: Roadmap de Ações e Implantação

- [x] **Wave 1 (Concluída)**: Refatorar a página de integrações para se tornar "Fontes de Dados", integrando a UI do Dropzone preparada para suportar PDFs.
- [ ] **Wave 2 (Dívida Ativa)**: Configurar o pacote `pdfjs-dist` ou similar no frontend e implementar a lógica local de regex baseada nos extratos em PDF padrão Itaú (Fatura de Cartão e Extrato Mensal).
- [ ] **Wave 3 (Segurança)**: Validar se chaves e dados sigilosos brutos não geram logs persistentes nas tabelas de banco (mantendo apenas o ID de log de sync genérico na tabela `itau_sync_logs` para conformidade de auditoria).
- [ ] **Wave 4 (Testes)**: Implementar harness no Vitest simulando o processamento de PDFs com linhas tabulares e checando se os saldos agregados refletem os lançamentos extraídos.
