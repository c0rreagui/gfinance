/**
 * src/lib/reconcile.ts
 *
 * Utilitário Core de Reconciliação Financeira.
 * Recalcula a soma total de transações de entrada (receitas), saída (despesas)
 * e o saldo líquido de um usuário, atualizando de forma síncrona a tabela "balances"
 * para garantir integridade absoluta dos dados na central de comando.
 */

export async function reconcileBalances(
  supabaseClient: any,
  userId: string
): Promise<{ success: boolean; error?: string; data?: { total: number; income: number; expense: number } }> {
  try {
    console.info(`[Reconcile] Iniciando reconciliação de saldos para o usuário: ${userId}`);

    // 1. Buscar todas as transações do usuário no banco
    const { data: transactions, error: txError } = await supabaseClient
      .from('transactions')
      .select('amount')
      .eq('user_id', userId);

    if (txError) {
      throw new Error(`Falha ao buscar transações: ${txError.message}`);
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

    const total = income - expense;

    console.info(`[Reconcile] Agregados calculados: Receitas = R$ ${income}, Despesas = R$ ${expense}, Total = R$ ${total}`);

    // 3. Atualizar em paralelo as três métricas essenciais na tabela "balances"
    const [r1, r2, r3] = await Promise.all([
      supabaseClient
        .from('balances')
        .update({ amount: total, trend: '+0%' })
        .eq('user_id', userId)
        .eq('type', 'total'),
      supabaseClient
        .from('balances')
        .update({ amount: income, trend: '+0%' })
        .eq('user_id', userId)
        .eq('type', 'income'),
      supabaseClient
        .from('balances')
        .update({ amount: expense, trend: '+0%' })
        .eq('user_id', userId)
        .eq('type', 'expense')
    ]);

    // Tratar erros de atualização
    if (r1.error) throw new Error(`Erro ao atualizar saldo total: ${r1.error.message}`);
    if (r2.error) throw new Error(`Erro ao atualizar receitas: ${r2.error.message}`);
    if (r3.error) throw new Error(`Erro ao atualizar despesas: ${r3.error.message}`);

    console.info('[Reconcile] Saldos atualizados com sucesso no banco de dados!');

    return { 
      success: true,
      data: { total, income, expense }
    };

  } catch (err: any) {
    console.error('[Reconcile] Falha na conciliação dos saldos:', err);
    return { 
      success: false, 
      error: err.message || 'Erro de reconciliação desconhecido.' 
    };
  }
}
