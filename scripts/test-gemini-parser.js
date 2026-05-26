/**
 * Script de diagnóstico: Testa o extrator de extratos multimodal do Gemini AI Brain offline.
 *
 * Uso: node scripts/test-gemini-parser.js
 */

const fs = require('fs');
const path = require('path');

// Carregar variáveis do .env.local de forma manual (zero dependências extras)
const envLocalPath = path.resolve(__dirname, '../.env.local');
if (fs.existsSync(envLocalPath)) {
  const envContent = fs.readFileSync(envLocalPath, 'utf8');
  envContent.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx !== -1) {
      const key = trimmed.substring(0, eqIdx).trim();
      const val = trimmed.substring(eqIdx + 1).trim();
      process.env[key] = val;
    }
  });
}

// Registrar o resolver de aliases TypeScript de forma simples para carregar src/lib/gemini
// (Como é js puro, podemos emular ou reescrever a chamada diretamente)
const { parseStatementWithAI } = require('../dist-test-libs/gemini-mock') || {};

async function main() {
  const pdfPath = 'C:\\Users\\guico\\Downloads\\itau_extrato_012026.pdf';
  if (!fs.existsSync(pdfPath)) {
    console.error(`[AI Test] Erro: Arquivo de extrato não encontrado em ${pdfPath}`);
    process.exit(1);
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'your-gemini-api-key-here') {
    console.error('[AI Test] Erro: GEMINI_API_KEY não configurada no .env.local. Configure uma chave real no Google AI Studio para rodar o teste.');
    process.exit(1);
  }

  console.log('='.repeat(80));
  console.log('INICIANDO EXTRAÇÃO DE EXTRATO MULTIMODAL COM GEMINI 1.5 FLASH');
  console.log('='.repeat(80));
  console.log(`Lendo arquivo PDF: ${pdfPath}`);
  
  const buffer = fs.readFileSync(pdfPath);
  
  // Re-importar usando os módulos cjs correspondentes compilados ou direto da API
  const { GoogleGenerativeAI, SchemaType } = require('@google/generative-ai');
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.0-flash',
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: SchemaType.OBJECT,
        properties: {
          transactions: {
            type: SchemaType.ARRAY,
            description: 'Lista de lançamentos extraídos',
            items: {
              type: SchemaType.OBJECT,
              properties: {
                date: { type: SchemaType.STRING },
                description: { type: SchemaType.STRING },
                amount: { type: SchemaType.NUMBER },
                category: { type: SchemaType.STRING },
                icon: { type: SchemaType.STRING }
              },
              required: ['date', 'description', 'amount', 'category', 'icon']
            }
          }
        },
        required: ['transactions']
      }
    }
  });

  const filePart = {
    inlineData: {
      data: buffer.toString('base64'),
      mimeType: 'application/pdf'
    }
  };

  const prompt = `
    Analise o extrato financeiro fornecido (PDF).
    Extraia todos os lançamentos de débitos e créditos. Ignore linhas de saldo.
  `;

  console.log('Enviando payload binário para a API do Gemini...');
  const start = Date.now();
  const result = await model.generateContent([prompt, filePart]);
  const text = result.response.text();
  const latency = ((Date.now() - start) / 1000).toFixed(2);
  
  console.log(`\nResposta recebida do Gemini em ${latency}s!`);
  console.log('='.repeat(80));
  console.log('JSON ESTRUTURADO RETORNADO:');
  console.log('='.repeat(80));
  
  const parsed = JSON.parse(text);
  console.log(JSON.stringify(parsed, null, 2));
  
  console.log('='.repeat(80));
  const count = parsed.transactions ? parsed.transactions.length : 0;
  console.log(`Validação bem sucedida! Total de transações extraídas via IA: ${count}`);
}

main().catch(console.error);
