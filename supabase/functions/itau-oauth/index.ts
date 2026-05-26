// Supabase Edge Function: Itaú Developers OAuth2 Gateway (mTLS Protected)
// Path: supabase/functions/itau-oauth/index.ts
// Built under G-Finance Production Guidelines — Strict credentials isolation

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // 1. Handle CORS Preflight OPTIONS requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    console.log("[Itaú OAuth] Iniciando tentativa de login no portal de desenvolvedores...");

    // 2. Load configurations from Supabase Secrets
    const cert = Deno.env.get("ITAU_CERT_PEM");
    const key = Deno.env.get("ITAU_KEY_PEM");
    const clientId = Deno.env.get("ITAU_CLIENT_ID");
    const clientSecret = Deno.env.get("ITAU_CLIENT_SECRET");
    const oauthUrl = Deno.env.get("ITAU_OAUTH_URL") || "https://sts.rdhi.com.br/api/oauth/token";

    // 3. Security Gate: Verify all credentials are set up
    if (!clientId || !clientSecret) {
      console.error("[Itaú OAuth] Erro: ITAU_CLIENT_ID ou ITAU_CLIENT_SECRET não definidos nas Secrets do Supabase.");
      return new Response(
        JSON.stringify({
          error: "Credenciais de API ausentes",
          message: "Registre as variáveis ITAU_CLIENT_ID e ITAU_CLIENT_SECRET nas Secrets do seu projeto Supabase."
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    if (!cert || !key) {
      console.error("[Itaú OAuth] Erro: Certificado PEM (ITAU_CERT_PEM) ou Chave Privada (ITAU_KEY_PEM) ausentes nas Secrets do Supabase.");
      return new Response(
        JSON.stringify({
          error: "Certificado mTLS ausente",
          message: "O Itaú exige autenticação mTLS. Registre as chaves PEM nas variáveis do Supabase (ITAU_CERT_PEM e ITAU_KEY_PEM)."
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    console.log(`[Itaú OAuth] Chamando STS OAuth em: ${oauthUrl}`);
    console.log(`[Itaú OAuth] Utilizando Client ID: ${clientId.substring(0, 8)}...`);

    // 4. Create secure mutual-TLS HTTP Client using Deno resources
    let client;
    try {
      client = Deno.createHttpClient({
        cert: cert,
        key: key,
      });
      console.log("[Itaú OAuth] Cliente mTLS (Deno HttpClient) inicializado com sucesso.");
    } catch (certErr: any) {
      console.error("[Itaú OAuth] Falha ao carregar ou decodificar os certificados/chaves PEM:", certErr);
      return new Response(
        JSON.stringify({
          error: "Certificado PEM inválido",
          details: certErr.message,
          help: "Certifique-se de que os certificados estão no formato PEM legível completo, contendo as tags -----BEGIN...----- e -----END...-----"
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    // 5. Fire OAuth POST request to Itaú
    try {
      const response = await fetch(oauthUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "accept": "application/json"
        },
        body: new URLSearchParams({
          grant_type: "client_credentials",
          client_id: clientId,
          client_secret: clientSecret,
        }),
        client: client,
      });

      console.log(`[Itaú OAuth] Resposta recebida do servidor Itaú. Código HTTP: ${response.status}`);

      const responseText = await response.text();

      if (!response.ok) {
        console.error(`[Itaú OAuth] Falha de autenticação no STS (HTTP ${response.status}):`, responseText);
        return new Response(
          JSON.stringify({
            error: "STS OAuth Authentication Rejected",
            status: response.status,
            response: responseText,
            help: "Verifique se seu Client ID e Client Secret estão corretos e se o certificado enviado está devidamente cadastrado no Portal BaaS do Itaú."
          }),
          { 
            status: response.status, 
            headers: { ...corsHeaders, "Content-Type": "application/json" } 
          }
        );
      }

      const tokenData = JSON.parse(responseText);
      console.log("[Itaú OAuth] Token obtido com sucesso!");

      return new Response(
        JSON.stringify({
          success: true,
          access_token: tokenData.access_token,
          token_type: tokenData.token_type,
          expires_in: tokenData.expires_in,
          scope: tokenData.scope
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );

    } catch (networkErr: any) {
      console.error("[Itaú OAuth] Falha crítica de rede ou handshake mTLS recusado:", networkErr);
      return new Response(
        JSON.stringify({
          error: "Connection Handshake Failed",
          details: networkErr.message,
          help: "A conexão com a API do Itaú foi recusada. Isso ocorre devido a chaves privadas incompatíveis com o certificado cadastrado ou bloqueios de segurança do servidor de destino."
        }),
        { 
          status: 502, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    } finally {
      // 6. Release resources to prevent memory / handle leak in Deno
      if (client) {
        client.close();
        console.log("[Itaú OAuth] Recursos HttpClient mTLS liberados.");
      }
    }

  } catch (globalErr: any) {
    console.error("[Itaú OAuth] Erro inesperado no processamento da Edge Function:", globalErr);
    return new Response(
      JSON.stringify({ error: "Internal Server Error", message: globalErr.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
