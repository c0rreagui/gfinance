// Supabase Edge Function: SMS Capture Gateway (iOS Shortcuts integration)
// Path: supabase/functions/sms-webhook/index.ts
// Built under G-Finance Production Guidelines — Strict input validation and Deno runtime

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

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
    // 3. Payload Extraction and Parsing
    const body = await req.json();
    const { texto_sms } = body;

    // 4. Strict Validation: Ensure "texto_sms" key exists and is a valid string
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

    // 5. Debug log: Print out SMS string into Deno console
    console.log(`[SMS Webhook] Payload de SMS recebido às ${new Date().toISOString()}:`);
    console.log(`----------------------------------------`);
    console.log(texto_sms);
    console.log(`----------------------------------------`);

    // 6. Success Response
    return new Response(
      JSON.stringify({
        success: true,
        message: "Payload recebido e validado com sucesso.",
        received_at: new Date().toISOString(),
        payload_meta: {
          char_count: texto_sms.length,
          word_count: texto_sms.split(/\s+/).filter(Boolean).length
        }
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );

  } catch (parseErr: any) {
    console.error("[SMS Webhook] Erro crítico no parsing do payload JSON:", parseErr);
    return new Response(
      JSON.stringify({
        error: "Malformed JSON",
        message: "O corpo da requisição não pôde ser analisado como JSON válido.",
        details: parseErr.message
      }),
      { 
        status: 400, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
