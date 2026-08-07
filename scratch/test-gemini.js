const fs = require('fs');
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Load env variables from .env.local
const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    const key = match[1];
    let value = match[2] || '';
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
});

const apiKey = env['GEMINI_API_KEY'];
console.log('API Key exists:', !!apiKey);

const genAI = new GoogleGenerativeAI(apiKey);

// Absolute output path
const stepOutputPath = "C:\\Users\\guico\\.gemini\\antigravity\\brain\\f35bcedd-eb09-4fc5-9842-632ada5861d9\\.system_generated\\steps\\752\\output.txt";
let transcriptionContent = '';
try {
  const fileData = fs.readFileSync(stepOutputPath, 'utf-8');
  const parsed = JSON.parse(fileData);
  const resultText = parsed.result;
  
  const startIndex = resultText.indexOf('[');
  const endIndex = resultText.lastIndexOf(']');
  if (startIndex !== -1 && endIndex !== -1) {
    const jsonStr = resultText.substring(startIndex, endIndex + 1);
    const rows = JSON.parse(jsonStr);
    transcriptionContent = rows[0].content;
    console.log('Loaded transcription content. Length:', transcriptionContent.length);
  } else {
    throw new Error('Could not find brackets [ ] in result');
  }
} catch (e) {
  console.error('Failed to read/parse transcription content:', e.message);
  process.exit(1);
}

const systemPrompt = `
  Você é o G-Work Intelligence Engine, a mente analítica tática de inteligência do Guilherme, fundador & CTO.
  Sua persona é de altíssimo nível técnico, direta, focada e pragmática (pense em engenharia de classe mundial, padrão Linear e Stripe).
  Sua missão é ler o áudio transcrito e estruturar um plano de trabalho impecável no padrão Azure DevOps:
  - Epic: Módulos inteiros ou macro-iniciativas (ex: Integração do Banco Itaú, Lançamento do Design System Neo).
  - Feature: Funcionalidades necessárias dentro de um Epic (ex: Rastreamento de reconciliação, Componentes de Switch).
  - Story: Requisitos operacionais ou histórias de usuário que resolvem a Feature (ex: Validar hash de deduplicação na API, Interface do toggle).
  - Task: Itens extremamente concretos, técnicos e acionáveis de código ou infra (ex: Criar unit test no jest para hash, Estilizar Switch CSS).

  Para cada item mapeado, escolha a prioridade ideal (critical, high, medium, low, none) e daysFromNow correspondente com prazos citados (ex: "até amanhã" = 1, "fim de semana" = 4). Caso não cite, use o bom senso (ex: Task = 1-3 dias, Story = 3-5 dias, Feature = 5-7 dias, Epic = 10-15 dias).
  
  Gere também insights estratégicos (tipo de insight: action_suggestion, deadline_warning, pattern_detected, priority_shift) com gravidade (info, warning, critical), resumo conciso, decisões mapeadas, pessoas e prazos importantes.
`;

const textPrompt = `
  Transcrição para análise:
  "${transcriptionContent}"
`;

// Reuse exactly the schema from route.ts
const responseSchema = {
  type: 'OBJECT',
  properties: {
    summary: {
      type: 'STRING',
      description: 'Resumo estruturado e executivo da transcrição em português brasileiro (1 a 2 parágrafos).'
    },
    key_decisions: {
      type: 'ARRAY',
      items: { type: 'STRING' },
      description: 'Decisões cruciais, combinados, arquiteturas ou direcionamentos tomados no áudio.'
    },
    mentioned_people: {
      type: 'ARRAY',
      items: { type: 'STRING' },
      description: 'Pessoas ou cargos citados na gravação.'
    },
    mentioned_dates: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          label: { type: 'STRING', description: 'Descrição da data/evento (ex: Entrega da API Itaú).' },
          daysFromNow: { type: 'INTEGER', description: 'Número de dias a partir de hoje (hoje = 0).' }
        },
        required: ['label', 'daysFromNow']
      },
      description: 'Datas importantes, prazos ou compromissos citados.'
    },
    insights: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          insight_type: {
            type: 'STRING',
            description: 'Tipo do insight: action_suggestion, deadline_warning, pattern_detected, priority_shift'
          },
          title: { type: 'STRING', description: 'Título conciso do insight.' },
          body: { type: 'STRING', description: 'Descrição detalhada e contextualizada do insight.' },
          severity: { type: 'STRING', description: 'Gravidade: info, warning, critical' }
        },
        required: ['insight_type', 'title', 'body', 'severity']
      },
      description: 'Insights táticos estratégicos extraídos para otimização ou tomada de decisão.'
    },
    work_items: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          title: { type: 'STRING', description: 'Título claro da iniciativa (Épico).' },
          description: { type: 'STRING', description: 'Descrição detalhada do Épico.' },
          type: { type: 'STRING', description: 'Sempre: epic' },
          priority: { type: 'STRING', description: 'Prioridade: critical, high, medium, low, none' },
          daysFromNow: { type: 'INTEGER', description: 'Dias recomendados para entrega final do Épico.' },
          children: {
            type: 'ARRAY',
            items: {
              type: 'OBJECT',
              properties: {
                title: { type: 'STRING', description: 'Título da Feature.' },
                description: { type: 'STRING', description: 'Descrição da Feature.' },
                type: { type: 'STRING', description: 'Sempre: feature' },
                priority: { type: 'STRING' },
                daysFromNow: { type: 'INTEGER' },
                children: {
                  type: 'ARRAY',
                  items: {
                    type: 'OBJECT',
                    properties: {
                      title: { type: 'STRING', description: 'Título da Story.' },
                      description: { type: 'STRING', description: 'Descrição da Story.' },
                      type: { type: 'STRING', description: 'Sempre: story' },
                      priority: { type: 'STRING' },
                      daysFromNow: { type: 'INTEGER' },
                      children: {
                        type: 'ARRAY',
                        items: {
                          type: 'OBJECT',
                          properties: {
                            title: { type: 'STRING', description: 'Título da Tarefa acionável.' },
                            description: { type: 'STRING', description: 'Descrição da Tarefa.' },
                            type: { type: 'STRING', description: 'Sempre: task' },
                            priority: { type: 'STRING' },
                            daysFromNow: { type: 'INTEGER' }
                          },
                          required: ['title', 'type', 'priority']
                        }
                      }
                    },
                    required: ['title', 'type', 'priority']
                  }
                }
              },
              required: ['title', 'type', 'priority']
            }
          }
        },
        required: ['title', 'type', 'priority']
      },
      description: 'Estrutura hierárquica de tarefas organizadas como Azure DevOps: Epic -> Feature -> Story -> Task.'
    }
  },
  required: ['summary', 'work_items', 'insights', 'key_decisions', 'mentioned_people', 'mentioned_dates']
};

async function run() {
  const models = [
    'gemini-flash-latest',
    'gemini-pro-latest',
    'gemini-2.0-flash-lite',
    'gemini-2.5-flash-lite'
  ];
  for (const model of models) {
    try {
      console.log(`\n--- Testando modelo: ${model} ---`);
      const modelClient = genAI.getGenerativeModel({
        model,
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema,
          temperature: 0.3
        }
      });
      console.log('Enviando requisição...');
      const start = Date.now();
      const result = await modelClient.generateContent([systemPrompt, textPrompt]);
      const elapsed = (Date.now() - start) / 1000;
      const responseText = result.response.text();
      console.log(`Sucesso em ${elapsed}s! Tamanho da resposta: ${responseText.length}`);
      
      const parsed = JSON.parse(responseText);
      console.log('Resumo:', parsed.summary);
      console.log('Itens de trabalho encontrados:', parsed.work_items?.length);
      console.log('Decisões principais:', parsed.key_decisions);
      return; // Stop after first success
    } catch (err) {
      console.error(`Erro no modelo ${model}:`, err.message);
    }
  }
}

run();
