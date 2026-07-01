import { NextRequest, NextResponse } from 'next/server';
import { getGeminiClient } from '@/lib/gemini';
import { SchemaType } from '@google/generative-ai';

export const dynamic = 'force-dynamic';

function extractMetadataAndScripts(html: string): string {
  // Extract <title>
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = titleMatch ? titleMatch[1].trim() : '';

  // Extract filtered meta tags (only those relevant to price, product, title)
  const metaMatches = html.match(/<meta[^>]+>/g) || [];
  const filteredMetas = metaMatches
    .map(m => m.trim())
    .filter(m => {
      const lower = m.toLowerCase();
      return (
        lower.includes('price') ||
        lower.includes('amount') ||
        lower.includes('title') ||
        lower.includes('og:') ||
        lower.includes('twitter:') ||
        lower.includes('itemprop') ||
        lower.includes('currency') ||
        lower.includes('product')
      );
    })
    .slice(0, 40)
    .join('\n');

  // Extract all <script type="application/ld+json"> contents containing product/offer/price info
  const ldJsonMatches: string[] = [];
  const ldJsonRegex = /<script\s+[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match;
  while ((match = ldJsonRegex.exec(html)) !== null) {
    if (match[1]) {
      const content = match[1].trim();
      const lower = content.toLowerCase();
      if (lower.includes('price') || lower.includes('offer') || lower.includes('product') || lower.includes('priceamount')) {
        ldJsonMatches.push(content.substring(0, 1500));
      }
    }
  }

  // Extract HTML elements containing price keywords/classes (e.g. Mercado Livre, Amazon)
  const priceSnippets: string[] = [];
  const priceRegex = /<[^>]*class=["'][^"']*(?:price|andes-money-amount|money|amount|ui-pdp-price)[^"']*["'][^>]*>[\s\S]*?<\/[^>]+>/gi;
  let count = 0;
  while ((match = priceRegex.exec(html)) !== null && count < 20) {
    const cleanSnippet = match[0]
      .replace(/<script[^>]*>([\s\S]*?)<\/script>/gi, '')
      .replace(/<style[^>]*>([\s\S]*?)<\/style>/gi, '')
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 300);
    priceSnippets.push(cleanSnippet);
    count++;
  }

  // Extract first 2000 chars of body text (removing tags)
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  let bodyText = '';
  if (bodyMatch && bodyMatch[1]) {
    bodyText = bodyMatch[1]
      .replace(/<script[^>]*>([\s\S]*?)<\/script>/gi, '')
      .replace(/<style[^>]*>([\s\S]*?)<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 2000);
  }

  return `
TITLE: ${title}
METAS:
${filteredMetas}
PRICE HTML SNIPPETS:
${priceSnippets.join('\n')}
LD+JSON SCRIPTS:
${ldJsonMatches.join('\n')}
BODY TEXT SAMPLE:
${bodyText}
  `;
}

async function parseProductWithAI(html: string): Promise<{ name: string; price: number } | null> {
  try {
    const ai = getGeminiClient();
    const model = ai.getGenerativeModel({
      model: 'gemini-flash-latest',
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: SchemaType.OBJECT,
          properties: {
            name: {
              type: SchemaType.STRING,
              description: 'O nome limpo, descritivo e conciso do produto, sem slogan ou nomes de lojas extras (ex: "Fone de Ouvido Razer Tiamat V2").'
            },
            price: {
              type: SchemaType.NUMBER,
              description: 'O preço total do produto como número decimal float (ex: 129.90).'
            }
          },
          required: ['name', 'price']
        }
      }
    });

    const simplifiedHtml = extractMetadataAndScripts(html);
    const prompt = `Analise os metadados e o conteúdo HTML simplificado de uma página de e-commerce e extraia o nome e o preço do produto anunciado.
    Retorne o nome de forma limpa e concisa em português.
    Se houver várias ofertas ou produtos listados, selecione o preço e o nome do produto principal anunciado na página.
    Examine com extrema atenção os blocos "PRICE HTML SNIPPETS" e "LD+JSON SCRIPTS" para localizar o preço exato.
    Se encontrar o preço com centavos (ex: "89,90" ou "89.9"), converta corretamente para float (ex: 89.9).
    Se não for possível encontrar o preço de jeito nenhum, defina o preço como 0.

    HTML Simplificado:
    \`\`\`
    ${simplifiedHtml}
    \`\`\`
    `;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const data = JSON.parse(text);
    
    if (data.name && typeof data.price === 'number') {
      return {
        name: data.name.trim(),
        price: data.price
      };
    }
    return null;
  } catch (err) {
    console.error('[AI Product Scraper Error]:', err);
    return null;
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const targetUrl = searchParams.get('url');

    if (!targetUrl) {
      return NextResponse.json(
        { success: false, error: 'URL do produto é obrigatória.' },
        { status: 400 }
      );
    }

    // Validate URL format
    try {
      new URL(targetUrl);
    } catch (_) {
      return NextResponse.json(
        { success: false, error: 'URL informada é inválida.' },
        { status: 400 }
      );
    }

    // Fetch the page with typical browser headers to minimize bot blocking
    // Using Googlebot User-Agent to bypass account verification redirects on platforms like Mercado Livre
    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      },
      next: { revalidate: 0 } // Do not cache scraping requests
    });

    if (!response.ok) {
      return NextResponse.json(
        { success: false, error: `Falha ao acessar o site (HTTP ${response.status}).` },
        { status: 502 }
      );
    }

    const html = await response.text();

    // Try AI scraping first if configured
    let aiScrapeSuccess = false;
    let title = '';
    let price: number | null = null;

    try {
      const aiResult = await parseProductWithAI(html);
      if (aiResult && aiResult.name) {
        title = aiResult.name;
        // Verify price was actually found (greater than 0)
        if (aiResult.price && aiResult.price > 0) {
          price = aiResult.price;
          aiScrapeSuccess = true;
          console.info(`[Scraper] Sucesso na extração com IA: "${title}" - R$ ${price}`);
        } else {
          console.warn(`[Scraper] IA extraiu nome "${title}" mas retornou preço R$ 0. Tentando fallback...`);
        }
      }
    } catch (aiErr) {
      console.warn('[Scraper] Falha ao extrair com IA, usando regex fallback:', aiErr);
    }

    // Regex fallback if AI failed, returned R$ 0, or not configured
    if (!aiScrapeSuccess) {
      // 1. Extract Product Name / Title
      // Attempt 1: OpenGraph Title
      const ogTitleMatch = html.match(/<meta\s+property=["']og:title["']\s+content=["']([^"']+)["']/i) || 
                           html.match(/<meta\s+content=["']([^"']+)["']\s+property=["']og:title["']/i);
      if (ogTitleMatch && ogTitleMatch[1]) {
        title = ogTitleMatch[1];
      }
      
      // Attempt 2: Twitter Title
      if (!title) {
        const twitterTitleMatch = html.match(/<meta\s+name=["']twitter:title["']\s+content=["']([^"']+)["']/i) ||
                                  html.match(/<meta\s+content=["']([^"']+)["']\s+name=["']twitter:title["']/i);
        if (twitterTitleMatch && twitterTitleMatch[1]) {
          title = twitterTitleMatch[1];
        }
      }
      
      // Attempt 3: Standard Title Tag
      if (!title) {
        const titleTagMatch = html.match(/<title>([^<]+)<\/title>/i);
        if (titleTagMatch && titleTagMatch[1]) {
          title = titleTagMatch[1];
        }
      }

      // Clean up title
      if (title) {
        title = title
          .replace(/&quot;/g, '"')
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/\s+/g, ' ')
          .trim();

        // Limit length and strip shop branding suffixes
        title = title.split(' | ')[0].split(' - ')[0].split(' : ')[0];
        if (title.length > 80) {
          title = title.substring(0, 77) + '...';
        }
      }

      // 2. Extract Product Price
      // Attempt 1: Itemprop price meta tags
      const itempropPriceMatch = html.match(/<meta[^>]+itemprop=["']price["'][^>]+content=["']([^"']+)["']/i) ||
                                 html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+itemprop=["']price["']/i);
      if (itempropPriceMatch && itempropPriceMatch[1]) {
        const parsed = parseFloat(itempropPriceMatch[1].replace(',', '.'));
        if (!isNaN(parsed) && parsed > 0) {
          price = parsed;
        }
      }

      // Attempt 2: OpenGraph Price / Product Price Amount
      if (price === null) {
        const ogPriceMatch = html.match(/<meta\s+property=["'](?:product|og):price:amount["']\s+content=["']([^"']+)["']/i) ||
                             html.match(/<meta\s+content=["']([^"']+)["']\s+property=["'](?:product|og):price:amount["']/i);
        if (ogPriceMatch && ogPriceMatch[1]) {
          const parsed = parseFloat(ogPriceMatch[1].replace(',', '.'));
          if (!isNaN(parsed) && parsed > 0) {
            price = parsed;
          }
        }
      }

      // Attempt 3: Structured JSON-LD Product Price
      if (price === null) {
        const priceLdMatch = html.match(/"price"\s*:\s*"?([\d.,]+)"?/i);
        if (priceLdMatch && priceLdMatch[1]) {
          const cleanedStr = priceLdMatch[1].replace(/[^\d.,]/g, '').replace(',', '.');
          const parsed = parseFloat(cleanedStr);
          if (!isNaN(parsed) && parsed > 0) {
            price = parsed;
          }
        }
      }

      // Attempt 4: Specific selectors (Mercado Livre / Amazon / Shopee)
      if (price === null) {
        if (targetUrl.includes('mercadolivre.com')) {
          const mlPriceMatch = html.match(/<meta\s+property=["']product:prearranged_price:amount["']\s+content=["']([^"']+)["']/i) ||
                               html.match(/<span[^>]*class=["'][^"']*andes-money-amount__fraction[^"']*["'][^>]*>([^<]+)<\/span>/i);
          if (mlPriceMatch && mlPriceMatch[1]) {
            price = parseFloat(mlPriceMatch[1].replace('.', '').replace(',', '.'));
          }
        } else if (targetUrl.includes('amazon.com')) {
          const wholeMatch = html.match(/<span\s+class=["']a-price-whole["']>([^<]+)<\/span>/i);
          const fractionMatch = html.match(/<span\s+class=["']a-price-fraction["']>([^<]+)<\/span>/i);
          if (wholeMatch && wholeMatch[1]) {
            const wholeVal = wholeMatch[1].replace(/[^\d]/g, '');
            const fractionVal = fractionMatch && fractionMatch[1] ? fractionMatch[1].replace(/[^\d]/g, '') : '00';
            const parsed = parseFloat(`${wholeVal}.${fractionVal}`);
            if (!isNaN(parsed) && parsed > 0) {
              price = parsed;
            }
          }
        }
      }

      // Attempt 5: Search for R$ followed by value anywhere in the DOM
      if (price === null) {
        const genericPriceMatch = html.match(/R\$\s*([\d\s.]+,\s*\d{2})/i) || html.match(/\$\s*([\d\s.]+,\s*\d{2})/i);
        if (genericPriceMatch && genericPriceMatch[1]) {
          const cleanedStr = genericPriceMatch[1].replace(/\s/g, '').replace('.', '').replace(',', '.');
          const parsed = parseFloat(cleanedStr);
          if (!isNaN(parsed) && parsed > 0) {
            price = parsed;
          }
        }
      }
    }

    if (!title) {
      return NextResponse.json(
        { success: false, error: 'Não foi possível identificar o nome do produto na página.' },
        { status: 422 }
      );
    }

    return NextResponse.json({
      success: true,
      name: title,
      price: price || 0
    });

  } catch (err: any) {
    console.error('[Scraper Endpoint Error]:', err);
    return NextResponse.json(
      { success: false, error: 'Erro interno ao tentar extrair dados do site.' },
      { status: 500 }
    );
  }
}
