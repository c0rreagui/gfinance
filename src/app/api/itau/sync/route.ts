// Next.js Secure Server Gateway: Itaú mTLS Proxy API
// Path: src/app/api/itau/sync/route.ts
// Built under G-Finance World-Class Security Guidelines (No exposed API keys or client-side certificates)

import { NextResponse } from 'next/server';
import https from 'https';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { reconcileBalances } from '@/lib/reconcile';

// Helper to generate a unique hash for deduplication
const generateTransactionHash = (userId: string, date: string, desc: string, amount: number) => {
  const input = `${userId}-${date}-${desc}-${amount}`;
  // Simple, deterministic numeric-like hash for matching
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return `itau-${Math.abs(hash)}`;
};

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get('Authorization');
    const supabaseToken = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;

    const supabase = await createSupabaseServerClient();

    if (supabaseToken) {
      await supabase.auth.setSession({
        access_token: supabaseToken,
        refresh_token: ''
      });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Sessão inválida.' }, { status: 401 });
    }

    const { data: connection } = await supabase
      .from('itau_connections')
      .select('*')
      .eq('user_id', user.id)
      .single();

    const cert = process.env.ITAU_CERT_PEM;
    const key = process.env.ITAU_KEY_PEM;
    const isRealSync = !!(cert && key);

    return NextResponse.json({
      configured: !!connection,
      agency: connection?.agency || '4290',
      accountNumber: connection?.account_number || '47209-1',
      lastSyncedAt: connection?.last_synced_at || null,
      mode: isRealSync ? 'mTLS Production' : 'Realistic Simulation Sandbox',
      isRealSync
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    // 1. Authenticate user session securely (Strict JWT gate)
    const authHeader = req.headers.get('Authorization');
    const supabaseToken = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;

    const supabase = await createSupabaseServerClient();

    if (supabaseToken) {
      await supabase.auth.setSession({
        access_token: supabaseToken,
        refresh_token: ''
      });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Sessão inválida. Por favor, faça login novamente.' }, { status: 401 });
    }

    // 2. Fetch or create a default connection profile for Itaú Connect
    const { data: connection, error: connError } = await supabase
      .from('itau_connections')
      .select('*')
      .eq('user_id', user.id)
      .single();

    let agency = '4290';
    let accountNumber = '47209-1';

    if (connError || !connection) {
      // Auto-provision initial sandbox credentials if none exist
      await supabase.from('itau_connections').insert({
        user_id: user.id,
        client_id: 'sandbox-client-id-4290',
        agency,
        account_number: accountNumber
      });
    } else {
      agency = connection.agency;
      accountNumber = connection.account_number;
    }

    // 3. Check for Certificate Provisioning (mTLS check)
    const cert = process.env.ITAU_CERT_PEM;
    const key = process.env.ITAU_KEY_PEM;

    let syncRecords: any[] = [];
    let isRealSync = false;

    if (cert && key) {
      // --- PRODUCTION / EXPERIMENTAL REAL SANDBOX mTLS FLOW ---
      isRealSync = true;
      try {
        const agent = new https.Agent({
          cert,
          key,
          rejectUnauthorized: true
        });

        // Step A: Request OAuth Access Token from Itaú
        const tokenResponse = await fetch('https://sts.itau.com.br/oauth/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            grant_type: 'client_credentials',
            client_id: process.env.ITAU_CLIENT_ID || '',
            client_secret: process.env.ITAU_CLIENT_SECRET || ''
          }),
          // @ts-ignore
          agent
        });

        if (!tokenResponse.ok) {
          throw new Error(`Falha na autenticação OAuth Itaú: ${tokenResponse.statusText}`);
        }

        const tokenData = await tokenResponse.json();
        const accessToken = tokenData.access_token;

        // Step B: Pull active statement entries
        const statementResponse = await fetch('https://api.itau.com.br/extrato/v2/lancamentos', {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'x-itau-apikey': process.env.ITAU_CLIENT_ID || ''
          },
          // @ts-ignore
          agent
        });

        if (!statementResponse.ok) {
          throw new Error(`Falha ao ler lançamentos do extrato Itaú: ${statementResponse.statusText}`);
        }

        const statementData = await statementResponse.json();
        syncRecords = statementData.lancamentos || [];
      } catch (err: any) {
        // Log the exact gateway sync error for audit purposes
        await supabase.from('itau_sync_logs').insert({
          user_id: user.id,
          status: 'failed',
          source_type: 'sync_mtls',
          file_name: 'Conexão Direta Itaú',
          error_message: err.message
        });
        return NextResponse.json({ error: `Instabilidade no Gateway Itaú: ${err.message}` }, { status: 502 });
      }
    } else {
      // --- PREMIUM INTERACTIVE SIMULATOR (Sandbox fallback) ---
      // Provision realistic dynamic financial statements to simulate the physical Itaú connection flawlessly
      const now = new Date();
      syncRecords = [
        {
          description: 'Transferência Pix Recebida — Itaú',
          amount: 3850.00,
          category: 'Salário',
          icon: 'ArrowDownLeft',
          date: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 10, 30).toISOString()
        },
        {
          description: 'Compra Cartão Itaú G-Black — Stripe',
          amount: -259.90,
          category: 'Lazer',
          icon: 'Tv',
          date: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 19, 45).toISOString()
        },
        {
          description: 'Assinatura Itaú Velo — Uber',
          amount: -45.60,
          category: 'Transporte',
          icon: 'Car',
          date: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 2, 8, 15).toISOString()
        },
        {
          description: 'Rendimento Poupança Integrada Itaú',
          amount: 124.80,
          category: 'Salário',
          icon: 'Wallet',
          date: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 3, 23, 59).toISOString()
        }
      ];
    }

    // 4. Deduplicate and merge records into public.transactions table
    let syncedCount = 0;
    
    // Fetch user's existing transactions to prevent duplicating by description-amount-date check
    const { data: existingTx } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', user.id);

    const existingHashes = new Set(
      (existingTx || []).map((t: any) => 
        generateTransactionHash(user.id, t.date, t.description, t.amount)
      )
    );

    for (const record of syncRecords) {
      // Map Itaú record fields
      const desc = record.description || record.detalhe || 'Lançamento Itaú';
      const amt = parseFloat(record.amount);
      const cat = record.category || 'Outros';
      const ico = record.icon || 'Wallet';
      const dt = record.date || new Date().toISOString();

      const txHash = generateTransactionHash(user.id, dt, desc, amt);

      if (!existingHashes.has(txHash)) {
        // Insert transaction securely into database
        const { error: insertError } = await supabase
          .from('transactions')
          .insert({
            user_id: user.id,
            description: desc,
            category: cat,
            amount: amt,
            icon: ico,
            date: dt
          });

        if (!insertError) {
          syncedCount++;
        }
      }
    }

    // 5. Update user balance metrics dynamically based on synced records
    if (syncedCount > 0) {
      await reconcileBalances(supabase, user.id);
    }

    const currentSourceType = isRealSync ? 'sync_mtls' : 'sync_sandbox';

    // 6. Record successful sync log
    await supabase.from('itau_sync_logs').insert({
      user_id: user.id,
      status: 'success',
      source_type: currentSourceType,
      records_synced: syncedCount,
      records_total: syncRecords.length,
      file_name: 'Conexão Direta Itaú'
    });

    // Update last sync flag in connection table
    await supabase
      .from('itau_connections')
      .update({ last_synced_at: new Date().toISOString() })
      .eq('user_id', user.id);

    return NextResponse.json({
      success: true,
      mode: isRealSync ? 'mTLS Production' : 'Realistic Simulation Sandbox',
      syncedRecords: syncedCount,
      agency,
      accountNumber
    });

  } catch (err: any) {
    return NextResponse.json({ error: `Internal Server Error: ${err.message}` }, { status: 500 });
  }
}
