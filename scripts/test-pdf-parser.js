/**
 * Script de diagnóstico: testa o parser PDF Itaú localmente.
 * 
 * Uso: node scripts/test-pdf-parser.js <caminho-do-pdf>
 * 
 * Esse script mostra:
 * 1. O texto bruto extraído do PDF pelo pdf-parse
 * 2. As linhas que o regex consegue capturar
 * 3. Cada transação parseada
 */

const fs = require('fs');
const path = require('path');

async function main() {
  const pdfPath = process.argv[2];
  if (!pdfPath) {
    console.error('Uso: node scripts/test-pdf-parser.js <caminho-do-pdf>');
    process.exit(1);
  }

  const { PDFParse } = require('pdf-parse');
  const buffer = fs.readFileSync(path.resolve(pdfPath));
  const parser = new PDFParse({ data: buffer, verbosity: 0 });
  const result = await parser.getText();
  const text = result.text;

  console.log('='.repeat(80));
  console.log('TEXTO BRUTO EXTRAÍDO DO PDF (pdf-parse)');
  console.log('='.repeat(80));
  console.log(text);
  console.log('='.repeat(80));
  console.log(`Total de caracteres: ${text.length}`);
  console.log('');

  // Mostrar linha por linha com indicadores
  const lines = text.split('\n');
  console.log(`Total de linhas: ${lines.length}`);
  console.log('');
  
  console.log('='.repeat(80));
  console.log('ANÁLISE LINHA POR LINHA');
  console.log('='.repeat(80));
  lines.forEach((line, i) => {
    const trimmed = line.trim();
    if (trimmed.length === 0) return;
    
    // Testar com a regex original (exige 2+ espaços entre campos)
    const strictRegex = /^(\d{2}\/\d{2}\/\d{4})\s{2,}(.+?)\s{2,}(-?\d{1,3}(?:\.\d{3})*,\d{2})\s*$/;
    const strictMatch = trimmed.match(strictRegex);
    
    // Regex mais flexível (permite 1+ espaços)
    const flexRegex = /^(\d{2}\/\d{2}\/\d{4})\s+(.+?)\s+(-?\d{1,3}(?:\.\d{3})*,\d{2})\s*$/;
    const flexMatch = trimmed.match(flexRegex);
    
    // Regex com possível tab ou qualquer whitespace
    const anyWsRegex = /^(\d{2}\/\d{2}\/\d{4})[\s\t]+(.+?)[\s\t]+(-?\d{1,3}(?:\.\d{3})*,\d{2})\s*$/;
    const anyWsMatch = trimmed.match(anyWsRegex);
    
    const indicator = strictMatch ? '✅ STRICT' : flexMatch ? '🟡 FLEX' : anyWsMatch ? '🔵 TAB/WS' : '   ';
    console.log(`[${String(i+1).padStart(3)}] ${indicator} | ${JSON.stringify(trimmed)}`);
  });

  console.log('');
  console.log('='.repeat(80));
  console.log('TRANSAÇÕES DETECTADAS (regex strict: \\s{2,})');
  console.log('='.repeat(80));
  
  const lineRegex = /^(\d{2}\/\d{2}\/\d{4})\s{2,}(.+?)\s{2,}(-?\d{1,3}(?:\.\d{3})*,\d{2})\s*$/gm;
  let match;
  let count = 0;
  while ((match = lineRegex.exec(text)) !== null) {
    const [, date, desc, amount] = match;
    if (/^SALDO DO DIA$/i.test(desc.trim())) {
      console.log(`  [SALDO - ignorado] ${date} | ${desc.trim()} | ${amount}`);
    } else {
      count++;
      console.log(`  [${count}] ${date} | ${desc.trim()} | ${amount}`);
    }
  }
  console.log(`\nTotal de transações (strict): ${count}`);

  // Tentar com regex flex
  console.log('');
  console.log('='.repeat(80));
  console.log('TRANSAÇÕES DETECTADAS (regex flex: \\s+)');
  console.log('='.repeat(80));
  
  const flexLineRegex = /^(\d{2}\/\d{2}\/\d{4})\s+(.+?)\s+(-?\d{1,3}(?:\.\d{3})*,\d{2})\s*$/gm;
  let flexCount = 0;
  while ((match = flexLineRegex.exec(text)) !== null) {
    const [, date, desc, amount] = match;
    if (/^SALDO DO DIA$/i.test(desc.trim())) {
      console.log(`  [SALDO - ignorado] ${date} | ${desc.trim()} | ${amount}`);
    } else {
      flexCount++;
      console.log(`  [${flexCount}] ${date} | ${desc.trim()} | ${amount}`);
    }
  }
  console.log(`\nTotal de transações (flex): ${flexCount}`);
}

main().catch(console.error);
