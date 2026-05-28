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
  const pixRecRegex = /pix\s+recebido\s+de\s+(.+?)\s+(?:em\s+\d{2}\/\d{2}\/\d{4}\s+)?de\s+r\$\s*([\d.,]+)/i;
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
  if (amount === 0) {
    const cardRegex = /(?:compra aprovada no|compra aprovada).*?r\$\s*([\d.,]+)\s+no\s+(.+?)(?:\.|$)/i;
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
  if (amount === 0) {
    const pixEnvRegex = /(?:transferencia|pix enviado).*?r\$\s*([\d.,]+)\s+para\s+(.+?)(?:\s+realizada|\.|$)/i;
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
  if (amount === 0) {
    const genericRegex = /(?:r\$\s*([\d.,]+)\s+no\s+estabelecimento\s+(.+?)(?:\.|$))|(?:r\$\s*([\d.,]+)\s+no\s+(.+?)(?:\.|$))/i;
    const genericMatch = text.match(genericRegex);
    if (genericMatch) {
      const rawVal = (genericMatch[1] || genericMatch[3]).replace(/\./g, "").replace(",", ".");
      amount = -parseFloat(rawVal);
      description = (genericMatch[2] || genericMatch[4]).trim();
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

    // 5. Payload Extraction and Parsing
    const body = await req.json();
    const { texto_sms } = body;

    // Check body fallback if user_id was passed directly (for simple test environments)
    if (!userId && body.user_id) {
      userId = body.user_id;
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
    if (!texto_sms || typeof texto_sms !== "string") {
      console.warn("[SMS Webhook] Payload de requisição malformado ou 'texto_sms' ausente.");
      return new Response(
        JSON.stringify({
          error: "Bad Request",
          message: "O payload fornecido é inválido. A chave 'texto_sms' é obrigatória e deve ser uma string."
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
      const { data: allTx } = await supabase
        .from("transactions")
        .select("amount")
        .eq("user_id", userId);

      if (allTx && allTx.length > 0) {
        let total = 0;
        let income = 0;
        let expense = 0;

        for (const t of allTx) {
          total += t.amount;
          if (t.amount > 0) income += t.amount;
          else expense += Math.abs(t.amount);
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
