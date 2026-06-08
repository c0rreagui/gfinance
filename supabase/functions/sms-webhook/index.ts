// Supabase Edge Function: SMS Capture Gateway (iOS Shortcuts integration)
// Path: supabase/functions/sms-webhook/index.ts
// Built under G-Finance Production Guidelines — Strict input validation and Deno runtime

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.21.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// SHA-256 hash helper in Deno (crypto.subtle)
async function buildSourceHash(userId: string, date: string, description: string, amount: number): Promise<string> {
  const normalized = `${userId}|${date.substring(0, 10)}|${description.trim().toLowerCase()}|${amount.toFixed(2)}`;
  const msgUint8 = new TextEncoder().encode(normalized);
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

function parseSmsDate(text: string): string {
  const hasThreePartDate = /\d{2}\/\d{2}\/\d{4}/.test(text);
  
  if (hasThreePartDate) {
    const dateWithTimeRegex = /(\d{2})\/(\d{2})\/(\d{4})(?:\s*,?\s*(?:as|às|at)?\s*(\d{2})h?[:m]?(\d{2})?)?/i;
    const match = text.match(dateWithTimeRegex);
    if (match) {
      const [_, day, month, year, hour, minute] = match;
      const formattedMonth = month.padStart(2, '0');
      const formattedDay = day.padStart(2, '0');
      const formattedHour = (hour || '12').padStart(2, '0');
      const formattedMinute = (minute || '00').padStart(2, '0');
      return `${year}-${formattedMonth}-${formattedDay}T${formattedHour}:${formattedMinute}:00-03:00`;
    }
  } else {
    const dateShortRegex = /(\d{2})\/(\d{2})(?:\s*,?\s*(?:as|às|at)?\s*(\d{2})h?[:m]?(\d{2})?)?/i;
    const shortMatch = text.match(dateShortRegex);
    if (shortMatch) {
      const [_, day, month, hour, minute] = shortMatch;
      const year = new Date().getFullYear();
      const formattedMonth = month.padStart(2, '0');
      const formattedDay = day.padStart(2, '0');
      const formattedHour = (hour || '12').padStart(2, '0');
      const formattedMinute = (minute || '00').padStart(2, '0');
      return `${year}-${formattedMonth}-${formattedDay}T${formattedHour}:${formattedMinute}:00-03:00`;
    }
  }

  return new Date().toISOString();
}

function parseSms(texto: string): { amount: number; description: string; date: string; category: string; icon: string; cardLastFour: string | null } | null {
  const text = texto.trim();
  let amount = 0;
  let description = "Transação SMS";
  let category = "Outros";
  let icon = "Circle";
  let parsed = false;

  // Extract card last four digits
  let cardLastFour: string | null = null;
  const cardMatch = text.match(/(?:final|cartao)\s+(\d{4})/i);
  if (cardMatch) {
    cardLastFour = cardMatch[1];
  }

  // 0. Ignore international warning duplicate messages (as standard approval message will follow)
  if (/compra internacional aprovada de/i.test(text) && !text.includes('-')) {
    return null;
  }

  const txDate = parseSmsDate(text);

  // Pattern 0a: Itaú Pagamento de Fatura (Boleto/Bancário)
  // Ex: "Seu pagamento de RS 812,55 efetuado em 04/06/2026 para ITAU MULT MC PLAT"
  const paymentRegex = /seu pagamento de (?:r\$|rs)\s*([\d.,]+)\s+efetuado\s+em\s+(\d{2}\/\d{2}\/\d{4})\s+para\s+([^-.]+?)(?:\s+ja foi|\.|$)/i;
  const paymentMatch = text.match(paymentRegex);
  if (paymentMatch) {
    const rawVal = paymentMatch[1].replace(/\./g, "").replace(",", ".");
    amount = -parseFloat(rawVal);
    description = `Pagamento: ${paymentMatch[3].trim()}`;
    category = "Cartão";
    icon = "CreditCard";
    parsed = true;
  }

  // Pattern 0b: Recebemos o pagamento
  // Ex: "Recebemos o pagamento no valor de RS 812,55 em 04/06/2026 para ITAU MULT MC PLAT..."
  if (!parsed) {
    const paymentRecRegex = /recebemos o pagamento(?: no valor de)? (?:r\$|rs)\s*([\d.,]+)\s+em\s+(\d{2}\/\d{2}\/\d{4})\s+para\s+([^-.]+?)(?:\s+ja foi|\.|$)/i;
    const paymentRecMatch = text.match(paymentRecRegex);
    if (paymentRecMatch) {
      const rawVal = paymentRecMatch[1].replace(/\./g, "").replace(",", ".");
      amount = -parseFloat(rawVal);
      description = `Pagamento: ${paymentRecMatch[3].trim()}`;
      category = "Cartão";
      icon = "CreditCard";
      parsed = true;
    }
  }

  // Pattern 1: Itaú Pix Recebido
  // Ex: "Itau: Pix recebido de JOAO SILVA em 28/05/2026 de R$ 1.500,00"
  // Ex: "Itau: Pix recebido de JOAO SILVA R$ 1.500,00"
  if (!parsed) {
    const pixRecRegex = /pix\s+recebido\s+de\s+(.+?)\s+(?:em\s+\d{2}\/\d{2}\/\d{4}\s+)?(?:de\s+)?(?:r\$|rs)\s*([\d.,]+)/i;
    const pixRecMatch = text.match(pixRecRegex);
    if (pixRecMatch) {
      const rawVal = pixRecMatch[2].replace(/\./g, "").replace(",", ".");
      amount = parseFloat(rawVal);
      description = `Pix Recebido: ${pixRecMatch[1].trim()}`;
      category = "Transferência";
      icon = "ArrowLeftRight";
      parsed = true;
    }
  }

  // Pattern 1b: Refund / Estorno
  // Ex: "Confirmamos o estorno da compra no ITAU MULT MC PLAT p/ GUILHERME CORREA S SILVA - MERCADOLIVRE*MERCADOL, RS 349,52 em 04/06/2026 as 13h36."
  if (!parsed) {
    const refundRegex = /(?:confirmamos o estorno|estorno de compra|estorno aprovado).*?-\s*([^-]+?),\s*(?:r\$|rs|us\$|usd|us)\s*([\d.,]+)/i;
    const refundMatch = text.match(refundRegex);
    if (refundMatch) {
      const rawVal = refundMatch[2].replace(/\./g, "").replace(",", ".");
      amount = parseFloat(rawVal); // Positive amount for refund!
      description = `Estorno: ${refundMatch[1].trim()}`;
      category = "Cartão";
      icon = "RefreshCw";
      parsed = true;
    }
  }

  // Pattern 2: Itaú Card SMS (Hyphen-separated, establishment before amount)
  // Ex: "Compra aprovada no ITAU MULT MC PLAT final 4215 - TIM*11962341464 - RS 34,85 em 02/06/2026 as 12h19."
  if (!parsed) {
    const cardHyphenRegex = /(?:compra aprovada no|compra aprovada).*?-\s*(.+?)\s+-\s+(?:r\$|rs)\s*([\d.,]+)/i;
    const cardHyphenMatch = text.match(cardHyphenRegex);
    if (cardHyphenMatch) {
      const rawVal = cardHyphenMatch[2].replace(/\./g, "").replace(",", ".");
      amount = -parseFloat(rawVal);
      description = cardHyphenMatch[1].trim();
      category = "Cartão";
      icon = "CreditCard";
      parsed = true;
    }
  }

  // Pattern 2b: Compra aprovada with hyphen and "valor" / currency (BRL or USD)
  // Ex: "Compra aprovada no seu ITAU MULT MC PLAT final 5960 - PIX GUSTAVO DOURADO PER valor RS 67,00"
  // Ex: "Compra aprovada no seu ITAU MULT MC PLAT final 5960 - PADDLE.NET - valor US 12,00 em 04/06/2026 as 14h22."
  if (!parsed) {
    const cardValRegex = /(?:compra aprovada no|compra aprovada).*?-\s*([^-]+?)(?:\s+-\s+|\s+)(?:valor\s+)?(?:r\$|rs|us\$|usd|us)\s*([\d.,]+)/i;
    const cardValMatch = text.match(cardValRegex);
    if (cardValMatch) {
      const rawVal = cardValMatch[2].replace(/\./g, "").replace(",", ".");
      amount = -parseFloat(rawVal);
      description = cardValMatch[1].trim();
      category = "Cartão";
      icon = "CreditCard";
      parsed = true;

      const foreignMatch = text.match(/\b(us\$|usd|us)\b\s*[\d.,]+/i);
      if (foreignMatch) {
        description = `${description} (USD)`;
      }
    }
  }

  // Pattern 3: Compra aprovada no Cartão (Standard amount before establishment)
  // Ex: "Itaucard: compra aprovada no MASTER BLACK final 1234 em 28/05 as 17:50 R$ 259,90 no STRIPE."
  // Ex: "Itaucard: compra aprovada no cartao final 1234 de R$ 45,90 em Uber"
  if (!parsed) {
    const cardStandardRegex = /(?:compra aprovada no|compra aprovada).*?(?:r\$|rs|us\$|usd|us)\s*([\d.,]+)\s+(?:no|em|na|nos|nas)\s+(.+?)(?:\.|$)/i;
    const cardStandardMatch = text.match(cardStandardRegex);
    if (cardStandardMatch) {
      const rawVal = cardStandardMatch[1].replace(/\./g, "").replace(",", ".");
      amount = -parseFloat(rawVal);
      description = cardStandardMatch[2].trim();
      category = "Cartão";
      icon = "CreditCard";
      parsed = true;

      const foreignMatch = text.match(/\b(us\$|usd|us)\b\s*[\d.,]+/i);
      if (foreignMatch) {
        description = `${description} (USD)`;
      }
    }
  }

  // Pattern 4: Pix Enviado / Transferência Realizada
  // Ex: "Itau: transferencia de R$ 100,00 para GUILHERME realizada em 28/05/2026."
  // Ex: "Itau: Pix enviado de R$ 50,00 para Pedro"
  if (!parsed) {
    const pixEnvRegex = /(?:transferencia|pix enviado).*?(?:r\$|rs)\s*([\d.,]+)\s+(?:para|em|a)\s+(.+?)(?:\s+realizada|\.|$)/i;
    const pixEnvMatch = text.match(pixEnvRegex);
    if (pixEnvMatch) {
      const rawVal = pixEnvMatch[1].replace(/\./g, "").replace(",", ".");
      amount = -parseFloat(rawVal);
      description = `Pix enviado: ${pixEnvMatch[2].trim()}`;
      category = "Transferência";
      icon = "ArrowLeftRight";
      parsed = true;
    }
  }

  // Pattern 5: Compra aprovada genérica com valor e local (Fallback)
  // Ex: "Compra aprovada em 28/05 R$ 45,60 no estabelecimento UBER"
  // Ex: "Compra aprovada RS 10,00 em Spotify"
  if (!parsed) {
    const genericRegex = /(?:(?:r\$|rs|us\$|usd|us)\s*([\d.,]+)\s+(?:no|em|na|nos|nas)\s+(?:estabelecimento\s+)?(.+?)(?:\.|$))/i;
    const genericMatch = text.match(genericRegex);
    if (genericMatch) {
      const rawVal = genericMatch[1].replace(/\./g, "").replace(",", ".");
      amount = -parseFloat(rawVal);
      description = genericMatch[2].trim();
      parsed = true;
    }
  }

  // Fallback 6: Super Generic Parser to avoid any data loss in production
  if (!parsed) {
    const fallbackRegex = /(?:valor\s+)?(?:r\$|rs|us\$|usd|us)\s*([\d.,]+)/i;
    const fallbackMatch = text.match(fallbackRegex);
    if (fallbackMatch) {
      const rawVal = fallbackMatch[1].replace(/\./g, "").replace(",", ".");
      amount = parseFloat(rawVal);
      
      const isDebit = /pago|pagamento|debito|enviado|compra|aprovada|saida/i.test(text);
      if (isDebit) {
        amount = -amount;
      }
      
      description = text.length > 50 ? `${text.substring(0, 47)}...` : text;
      parsed = true;
    }
  }

  if (amount === 0 || !parsed) {
    return null; // Could not parse amount or match patterns
  }

  // Infer category based on description keywords
  const descLower = description.toLowerCase();
  if (descLower.includes("estorno") || descLower.includes("reembolso")) {
    category = "Cartão";
    icon = "RefreshCw";
  } else if (/uber|99|taxi|posto|gasolina/i.test(descLower)) {
    category = "Transporte";
    icon = "Car";
  } else if (/supermercado|mercado|carrefour|extra|pao de acucar|atacado/i.test(descLower) && !descLower.includes("mercadolivre") && !descLower.includes("mercado livre")) {
    category = "Alimentação";
    icon = "ShoppingCart";
  } else if (/netflix|spotify|streaming|amazon prime|apple/i.test(descLower)) {
    category = "Assinaturas";
    icon = "Tv";
  } else if (/fatura|itaucard|cartao|credit/i.test(descLower)) {
    category = "Cartão";
    icon = "CreditCard";
  } else if (/remuneracao|salario|salário/i.test(descLower)) {
    category = "Salário";
    icon = "Wallet";
  } else if (/rendimento|juros|poupanca/i.test(descLower)) {
    category = "Rendimentos";
    icon = "TrendingUp";
  }

  return {
    amount,
    description,
    date: txDate,
    category,
    icon,
    cardLastFour
  };
}

serve(async (req) => {
  // 1. Handle CORS Preflight OPTIONS requests (required for iOS Shortcuts and browser requests)
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // 2. Strict Security: Accept only HTTP POST requests
  if (req.method !== "POST") {
    console.warn(`[SMS Webhook] Método não permitido recebido: ${req.method}`);
    return new Response(
      JSON.stringify({
        error: "Method Not Allowed",
        message: "Este endpoint aceita exclusivamente requisições HTTP POST."
      }),
      { 
        status: 405, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }

  try {
    // 3. Initialize Supabase Client (Service Role Client for RLS bypass with server validation)
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 4. Authenticate user session via Authorization Bearer Token
    const authHeader = req.headers.get("Authorization");
    let userId: string | null = null;

    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.substring(7);
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);
      if (!authError && user) {
        userId = user.id;
      }
    }

    // Fallback: extract userId from query params (extremely helpful for iOS Shortcuts)
    const urlObj = new URL(req.url);
    const queryUserId = urlObj.searchParams.get("user_id");
    if (!userId && queryUserId) {
      userId = queryUserId;
    }

    // 5. Payload Extraction and Parsing with Fallbacks
    let texto_sms = "";
    const contentType = req.headers.get("content-type") || "";

    if (req.body) {
      if (contentType.includes("application/json")) {
        try {
          const body = await req.json();
          texto_sms = body.texto_sms || "";
          if (!userId && body.user_id) {
            userId = body.user_id;
          }
        } catch (e) {
          // If JSON parsing fails, read as plain text
          try {
            const rawText = await req.text();
            texto_sms = rawText;
          } catch (_) {}
        }
      } else {
        try {
          texto_sms = await req.text();
        } catch (_) {}
      }
    }

    if (!userId) {
      console.warn("[SMS Webhook] Tentativa de chamada não autorizada ou sem identificador de usuário.");
      return new Response(
        JSON.stringify({
          error: "Unauthorized",
          message: "Acesso negado. Usuário não autenticado ou JWT inválido."
        }),
        { 
          status: 401, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    // 6. Strict Validation: Ensure "texto_sms" key exists and is a valid string
    texto_sms = texto_sms.trim();
    if (!texto_sms) {
      console.warn("[SMS Webhook] Payload de requisição malformado ou 'texto_sms' ausente.");
      return new Response(
        JSON.stringify({
          error: "Bad Request",
          message: "O payload fornecido é inválido. O texto do SMS é obrigatório e deve ser enviado no corpo da requisição."
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    // 7. Parse SMS string into transaction parameters
    const parsedTx = parseSms(texto_sms);

    if (!parsedTx) {
      // Registrar log de falha de parser
      await supabase.from("itau_sync_logs").insert({
        user_id: userId,
        status: "failed",
        source_type: "sms",
        file_name: "Webhook SMS",
        error_message: "SMS não reconhecido ou valor da transação não encontrado."
      });

      return new Response(
        JSON.stringify({
          error: "Unprocessable Entity",
          message: "Não foi possível extrair um lançamento financeiro válido deste texto SMS."
        }),
        { 
          status: 422, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    // 8. Unique constraint SHA-256 deduplication
    const sourceHash = await buildSourceHash(userId, parsedTx.date, parsedTx.description, parsedTx.amount);

    // Look up card in the database to link card_id
    let cardId: string | null = null;
    const cardLastFour = parsedTx.cardLastFour;
    const textLower = texto_sms.toLowerCase();

    if (cardLastFour || textLower.includes("itau mult mc plat") || textLower.includes("itau platinum") || textLower.includes("itaucard")) {
      const { data: creditCards } = await supabase
        .from("credit_cards")
        .select("id, last_four, card_name")
        .eq("user_id", userId);

      if (creditCards && creditCards.length > 0) {
        if (cardLastFour) {
          // Find direct match
          let card = creditCards.find((c: { id: string; last_four: string; card_name: string }) => c.last_four === cardLastFour);
          // Fallback for virtual card 5960 -> 4215
          if (!card && cardLastFour === "5960") {
            card = creditCards.find((c: { id: string; last_four: string; card_name: string }) => c.last_four === "4215");
          }
          if (card) {
            cardId = card.id;
          }
        }
        
        // Fallback: match by card name keywords in text if no cardId resolved yet
        if (!cardId) {
          if (textLower.includes("itau mult mc plat")) {
            const card = creditCards.find((c: { id: string; last_four: string; card_name: string }) => c.card_name.toLowerCase().includes("mult mc plat"));
            if (card) cardId = card.id;
          } else if (textLower.includes("itau platinum")) {
            const card = creditCards.find((c: { id: string; last_four: string; card_name: string }) => c.card_name.toLowerCase().includes("platinum"));
            if (card) cardId = card.id;
          } else if (textLower.includes("itaucard")) {
            // Default to first card if generic itaucard keyword is present
            cardId = creditCards[0].id;
          }
        }
      }
    }

    const { error: insertError } = await supabase
      .from("transactions")
      .insert({
        user_id: userId,
        date: parsedTx.date,
        description: parsedTx.description,
        amount: parsedTx.amount,
        category: parsedTx.category,
        icon: parsedTx.icon,
        source_hash: sourceHash,
        source_type: "sms",
        card_id: cardId
      });

    let isDuplicate = false;
    if (insertError) {
      if (insertError.code === "23505") {
        isDuplicate = true;
      } else {
        throw insertError;
      }
    }

    // 9. If inserted, reconcile balances dynamically
    if (!isDuplicate) {
      // Buscar saldo inicial do perfil do usuário para preservar a integridade matemática
      const { data: profile } = await supabase
        .from("profiles")
        .select("initial_balance")
        .eq("id", userId)
        .single();
      const initialBalance = Number(profile?.initial_balance) || 0;

      const { data: allTx } = await supabase
        .from("transactions")
        .select("amount")
        .eq("user_id", userId);

      if (allTx && allTx.length > 0) {
        let total = initialBalance;
        let income = 0;
        let expense = 0;

        for (const t of allTx) {
          const val = Number(t.amount);
          total += val;
          if (val > 0) income += val;
          else expense += Math.abs(val);
        }

        const { data: balances } = await supabase
          .from("balances")
          .select("id, type")
          .eq("user_id", userId);

        const upsertBalance = async (type: string, label: string, value: number, icon: string) => {
          const existing = (balances || []).find((b) => b.type === type);
          if (existing) {
            await supabase.from("balances").update({ amount: value }).eq("id", existing.id);
          } else {
            await supabase.from("balances").insert({
              user_id: userId, label, amount: value, trend: "+0.0%", icon, type,
            });
          }
        };

        await Promise.all([
          upsertBalance("total", "Saldo Total", total, "Wallet"),
          upsertBalance("income", "Receitas", income, "ArrowUpCircle"),
          upsertBalance("expense", "Despesas", expense, "ArrowDownCircle"),
        ]);
      }
    }

    // 10. Record Sync Log
    await supabase.from("itau_sync_logs").insert({
      user_id: userId,
      status: "success",
      source_type: "sms",
      file_name: "Webhook SMS",
      records_synced: isDuplicate ? 0 : 1,
      records_total: 1,
      records_duplicate: isDuplicate ? 1 : 0,
      error_message: isDuplicate ? "Transação duplicada descartada." : null
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: isDuplicate ? "Transação duplicada e descartada com sucesso." : "SMS processado e transação persistida com sucesso.",
        received_at: new Date().toISOString(),
        transaction: parsedTx,
        status: isDuplicate ? "duplicate" : "inserted"
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );

  } catch (parseErr: any) {
    console.error("[SMS Webhook] Erro crítico no processamento:", parseErr);
    return new Response(
      JSON.stringify({
        error: "Internal Server Error",
        message: "Erro interno no servidor ao processar o payload.",
        details: parseErr.message
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
