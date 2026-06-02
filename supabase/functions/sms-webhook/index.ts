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

function parseSms(texto: string): { amount: number; description: string; date: string; category: string; icon: string } | null {
  const text = texto.trim();
  let amount = 0;
  let description = "Transação SMS";
  let category = "Outros";
  let icon = "Circle";

  // Regex 1: Itaú Pix Recebido
  // Ex: "Itau: Pix recebido de JOAO SILVA em 28/05/2026 de R$ 1.500,00"
  // Ex: "Itau: Pix recebido de JOAO SILVA R$ 1.500,00"
  const pixRecRegex = /pix\s+recebido\s+de\s+(.+?)\s+(?:em\s+\d{2}\/\d{2}\/\d{4}\s+)?(?:de\s+)?r\$\s*([\d.,]+)/i;
  const pixRecMatch = text.match(pixRecRegex);
  if (pixRecMatch) {
    const rawVal = pixRecMatch[2].replace(/\./g, "").replace(",", ".");
    amount = parseFloat(rawVal);
    description = `Pix Recebido: ${pixRecMatch[1].trim()}`;
    category = "Transferência";
    icon = "ArrowLeftRight";
  }

  // Regex 2: Compra aprovada no Cartão
  // Ex: "Itaucard: compra aprovada no MASTER BLACK final 1234 em 28/05 as 17:50 R$ 259,90 no STRIPE."
  // Ex: "Itaucard: compra aprovada no cartao final 1234 de R$ 45,90 em Uber"
  if (amount === 0) {
    const cardRegex = /(?:compra aprovada no|compra aprovada).*?r\$\s*([\d.,]+)\s+(?:no|em|na|nos|nas)\s+(.+?)(?:\.|$)/i;
    const cardMatch = text.match(cardRegex);
    if (cardMatch) {
      const rawVal = cardMatch[1].replace(/\./g, "").replace(",", ".");
      amount = -parseFloat(rawVal);
      description = cardMatch[2].trim();
      category = "Cartão";
      icon = "CreditCard";
    }
  }

  // Regex 3: Pix Enviado / Transferência Realizada
  // Ex: "Itau: transferencia de R$ 100,00 para GUILHERME realizada em 28/05/2026."
  // Ex: "Itau: Pix enviado de R$ 50,00 para Pedro"
  if (amount === 0) {
    const pixEnvRegex = /(?:transferencia|pix enviado).*?r\$\s*([\d.,]+)\s+(?:para|em|a)\s+(.+?)(?:\s+realizada|\.|$)/i;
    const pixEnvMatch = text.match(pixEnvRegex);
    if (pixEnvMatch) {
      const rawVal = pixEnvMatch[1].replace(/\./g, "").replace(",", ".");
      amount = -parseFloat(rawVal);
      description = `Pix enviado: ${pixEnvMatch[2].trim()}`;
      category = "Transferência";
      icon = "ArrowLeftRight";
    }
  }

  // Regex 4: Compra aprovada genérica com valor e local
  // Ex: "Compra aprovada em 28/05 R$ 45,60 no estabelecimento UBER"
  // Ex: "Compra aprovada R$ 10,00 em Spotify"
  if (amount === 0) {
    const genericRegex = /(?:r\$\s*([\d.,]+)\s+(?:no|em|na|nos|nas)\s+(?:estabelecimento\s+)?(.+?)(?:\.|$))/i;
    const genericMatch = text.match(genericRegex);
    if (genericMatch) {
      const rawVal = genericMatch[1].replace(/\./g, "").replace(",", ".");
      amount = -parseFloat(rawVal);
      description = genericMatch[2].trim();
    }
  }

  if (amount === 0) {
    return null; // Could not parse amount
  }

  // Infer category based on description keywords
  const descLower = description.toLowerCase();
  if (/uber|99|taxi|posto|gasolina/i.test(descLower)) {
    category = "Transporte";
    icon = "Car";
  } else if (/supermercado|mercado|carrefour|extra|pao de acucar|atacado/i.test(descLower)) {
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
    date: new Date().toISOString(),
    category,
    icon
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
        source_type: "sms"
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
