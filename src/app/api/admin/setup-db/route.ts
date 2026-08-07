import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // 1. Inserir saldo real do Itaú se não existir
    const { data: existingBal } = await supabase.from('balances').select('id').limit(1);
    if (!existingBal || existingBal.length === 0) {
      await supabase.from('balances').insert([
        { label: 'Saldo Conta Corrente Itaú', amount: -521.43, trend: '-2.5%', icon: 'Landmark', type: 'expense', user_id: '00000000-0000-0000-0000-000000000000' },
        { label: 'Aplicação Automática (Aplic Aut Mais)', amount: 693.16, trend: '+1.2%', icon: 'TrendingUp', type: 'income', user_id: '00000000-0000-0000-0000-000000000000' },
        { label: 'Rendimentos de Aplicação', amount: 0.01, trend: '+0.01%', icon: 'Sparkles', type: 'income', user_id: '00000000-0000-0000-0000-000000000000' },
        { label: 'Saldo Consolidado Itaú', amount: 171.74, trend: '+5.4%', icon: 'Wallet', type: 'total', user_id: '00000000-0000-0000-0000-000000000000' }
      ]);
    }

    // 2. Inserir cartões reais se não existirem
    const { data: existingCards } = await supabase.from('credit_cards').select('id').limit(1);
    if (!existingCards || existingCards.length === 0) {
      await supabase.from('credit_cards').insert([
        { card_name: 'Itaú Platinum', card_limit: 15000.00, manual_invoice_amount: 116.90, closing_day: 25, due_day: 5, color_theme: 'indigo', user_id: '00000000-0000-0000-0000-000000000000' },
        { card_name: 'Itaú Click', card_limit: 8000.00, manual_invoice_amount: 679.80, closing_day: 20, due_day: 10, color_theme: 'emerald', user_id: '00000000-0000-0000-0000-000000000000' }
      ]);
    }

    // 3. Inserir transações reais se não existirem
    const { data: existingTx } = await supabase.from('transactions').select('id').limit(1);
    if (!existingTx || existingTx.length === 0) {
      await supabase.from('transactions').insert([
        { user_id: '00000000-0000-0000-0000-000000000000', description: 'Rendimento de Aplicação Itaú', amount: 0.01, category: 'Rendimentos', date: new Date('2026-08-07T10:00:00.000Z').toISOString(), icon: 'Sparkles' },
        { user_id: '00000000-0000-0000-0000-000000000000', description: 'Resgate Aplic Aut Mais', amount: 693.16, category: 'Transferência', date: new Date('2026-08-06T14:30:00.000Z').toISOString(), icon: 'ArrowDownLeft' },
        { user_id: '00000000-0000-0000-0000-000000000000', description: 'Depósito / Salário Recebido Itaú', amount: 1789.86, category: 'Salário', date: new Date('2026-07-05T09:00:00.000Z').toISOString(), icon: 'ArrowDownLeft' },
        { user_id: '00000000-0000-0000-0000-000000000000', description: 'Pagamento Fatura Itaú Click', amount: -679.80, category: 'Cartão', date: new Date('2026-07-10T12:00:00.000Z').toISOString(), icon: 'CreditCard' },
        { user_id: '00000000-0000-0000-0000-000000000000', description: 'Pagamento Fatura Itaú Platinum', amount: -116.90, category: 'Cartão', date: new Date('2026-07-05T11:00:00.000Z').toISOString(), icon: 'CreditCard' },
        { user_id: '00000000-0000-0000-0000-000000000000', description: 'Mensalidade Faculdade UNIP', amount: -522.43, category: 'Boleto', date: new Date('2026-07-10T15:00:00.000Z').toISOString(), icon: 'FileText' },
        { user_id: '00000000-0000-0000-0000-000000000000', description: 'Conta de Água Sabesp (Parcela 1/2)', amount: -17.56, category: 'Utilidades', date: new Date('2026-07-15T16:00:00.000Z').toISOString(), icon: 'Zap' },
        { user_id: '00000000-0000-0000-0000-000000000000', description: 'Conta de Água Sabesp (Parcela 2/2)', amount: -17.56, category: 'Utilidades', date: new Date('2026-07-15T16:05:00.000Z').toISOString(), icon: 'Zap' }
      ]);
    }

    return NextResponse.json({ success: true, message: 'Supabase database initialized with real Itaú statement data.' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
