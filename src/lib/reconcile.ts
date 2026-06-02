/**
 * src/lib/reconcile.ts
 *
 * Utilitário Core de Reconciliação Financeira.
 * Recalcula a soma total de transações de entrada (receitas), saída (despesas)
 * e o saldo líquido de um usuário, atualizando de forma síncrona a tabela "balances"
 * para garantir integridade absoluta dos dados na central de comando.
 */

import { SupabaseClient } from '@supabase/supabase-js';

export async function reconcileBalances(
  supabaseClient: SupabaseClient,
  userId: string
): Promise<{ success: boolean; error?: string; data?: { total: number; income: number; expense: number } }> {
  try {
    console.info(`[Reconcile] Iniciando reconciliação de saldos para o usuário: ${userId}`);

    // 1. Buscar todas as transações do usuário no banco (excluindo transações futuras)
    const { data: transactions, error: txError } = await supabaseClient
      .from('transactions')
      .select('amount')
      .eq('user_id', userId)
      .lte('date', new Date().toISOString());

    if (txError) {
      throw new Error(`Falha ao buscar transações: ${txError.message}`);
    }

    // 1.5 Buscar saldo inicial do perfil
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('initial_balance')
      .eq('id', userId)
      .single();

    let initialBalance = 0;
    if (!profileError && profile) {
      initialBalance = Number(profile.initial_balance) || 0;
    }

    // 2. Calcular os agregados financeiros
    let income = 0;
    let expense = 0;

    if (transactions && transactions.length > 0) {
      transactions.forEach((tx: { amount: number }) => {
        const val = Number(tx.amount);
        if (val > 0) {
          income += val;
        } else {
          expense += Math.abs(val); // Armazenado como valor positivo absoluto na tabela balances
        }
      });
    }

    const total = initialBalance + income - expense;

    console.info(`[Reconcile] Agregados calculados: Inicial = R$ ${initialBalance}, Receitas = R$ ${income}, Despesas = R$ ${expense}, Total = R$ ${total}`);

    // 3. Query existing balances for this user to avoid missing rows on update
    const { data: existingBalances, error: fetchBalError } = await supabaseClient
      .from('balances')
      .select('id, type')
      .eq('user_id', userId);

    if (fetchBalError) {
      throw new Error(`Falha ao verificar linhas de saldo existentes: ${fetchBalError.message}`);
    }

    const findExisting = (t: string) => existingBalances?.find((b: { id: string; type: string }) => b.type === t);

    const totalRow = findExisting('total');
    const incomeRow = findExisting('income');
    const expenseRow = findExisting('expense');

    const promises = [];

    // Reconcile and save "total"
    if (totalRow) {
      promises.push(
        supabaseClient
          .from('balances')
          .update({ amount: total, trend: '+0%' })
          .eq('id', totalRow.id)
      );
    } else {
      promises.push(
        supabaseClient
          .from('balances')
          .insert({
            user_id: userId,
            type: 'total',
            label: 'Saldo Total',
            amount: total,
            trend: '+0%',
            icon: 'Wallet'
          })
      );
    }

    // Reconcile and save "income"
    if (incomeRow) {
      promises.push(
        supabaseClient
          .from('balances')
          .update({ amount: income, trend: '+0%' })
          .eq('id', incomeRow.id)
      );
    } else {
      promises.push(
        supabaseClient
          .from('balances')
          .insert({
            user_id: userId,
            type: 'income',
            label: 'Receitas',
            amount: income,
            trend: '+0%',
            icon: 'ArrowUpCircle'
          })
      );
    }

    // Reconcile and save "expense"
    if (expenseRow) {
      promises.push(
        supabaseClient
          .from('balances')
          .update({ amount: expense, trend: '+0%' })
          .eq('id', expenseRow.id)
      );
    } else {
      promises.push(
        supabaseClient
          .from('balances')
          .insert({
            user_id: userId,
            type: 'expense',
            label: 'Despesas',
            amount: expense,
            trend: '+0%',
            icon: 'ArrowDownCircle'
          })
      );
    }

    const results = await Promise.all(promises);
    for (const r of results) {
      if (r.error) throw new Error(r.error.message);
    }

    console.info('[Reconcile] Saldos harmonizados e persistidos com sucesso no Supabase!');

    return { 
      success: true,
      data: { total, income, expense }
    };

  } catch (err: unknown) {
    console.error('[Reconcile] Falha na conciliação dos saldos:', err);
    const errMsg = err instanceof Error ? err.message : 'Erro de reconciliação desconhecido.';
    return { 
      success: false, 
      error: errMsg
    };
  }
}
