import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

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
    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
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

    // 1. Extract Product Name / Title
    let title = '';
    
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
    title = title
      .replace(/&quot;/g, '"')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/\s+/g, ' ')
      .trim();

    // Limit length and strip shop branding suffixes
    if (title) {
      title = title.split(' | ')[0].split(' - ')[0].split(' : ')[0];
      if (title.length > 80) {
        title = title.substring(0, 77) + '...';
      }
    }

    // 2. Extract Product Price
    let price: number | null = null;

    // Attempt 1: OpenGraph Price / Product Price Amount
    const ogPriceMatch = html.match(/<meta\s+property=["'](?:product|og):price:amount["']\s+content=["']([^"']+)["']/i) ||
                         html.match(/<meta\s+content=["']([^"']+)["']\s+property=["'](?:product|og):price:amount["']/i);
    if (ogPriceMatch && ogPriceMatch[1]) {
      const parsed = parseFloat(ogPriceMatch[1].replace(',', '.'));
      if (!isNaN(parsed) && parsed > 0) {
        price = parsed;
      }
    }

    // Attempt 2: Structured JSON-LD Product Price
    if (price === null) {
      // Find Schema.org product price pattern inside ld+json block
      const priceLdMatch = html.match(/"price"\s*:\s*"?([\d.,]+)"?/i);
      if (priceLdMatch && priceLdMatch[1]) {
        const cleanedStr = priceLdMatch[1].replace(/[^\d.,]/g, '').replace(',', '.');
        const parsed = parseFloat(cleanedStr);
        if (!isNaN(parsed) && parsed > 0) {
          price = parsed;
        }
      }
    }

    // Attempt 3: Specific selectors (Mercado Livre / Amazon / Shopee)
    if (price === null) {
      if (targetUrl.includes('mercadolivre.com')) {
        // Mercado Livre price meta property: product:prearranged_price:amount
        const mlPriceMatch = html.match(/<meta\s+property=["']product:prearranged_price:amount["']\s+content=["']([^"']+)["']/i);
        if (mlPriceMatch && mlPriceMatch[1]) {
          price = parseFloat(mlPriceMatch[1]);
        }
      } else if (targetUrl.includes('amazon.com')) {
        // Amazon whole and fraction price elements
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

    // Attempt 4: Search for R$ followed by value anywhere in the DOM
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
