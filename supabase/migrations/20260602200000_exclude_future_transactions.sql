-- Migration: Exclude Future Transactions from Balance Calculation
-- Path: supabase/migrations/20260602200000_exclude_future_transactions.sql
-- Updates trigger to ignore future transactions until their date is in the past/present

CREATE OR REPLACE FUNCTION public.reconcile_user_balances()
RETURNS trigger AS $$
DECLARE
    v_user_id uuid;
    v_initial_balance numeric;
    v_income numeric;
    v_expense numeric;
    v_total numeric;
BEGIN
    -- Determine user_id based on Table and Operation
    IF TG_TABLE_NAME = 'profiles' THEN
        v_user_id := NEW.id;
    ELSE -- transactions
        IF TG_OP = 'DELETE' THEN
            v_user_id := OLD.user_id;
        ELSE
            v_user_id := NEW.user_id;
        END IF;
    END IF;

    -- 1. Fetch initial_balance from profiles
    SELECT COALESCE(initial_balance, 0.00) INTO v_initial_balance
    FROM public.profiles
    WHERE id = v_user_id;

    -- 2. Sum up incomes (amount > 0 AND date <= now())
    SELECT COALESCE(SUM(amount), 0.00) INTO v_income
    FROM public.transactions
    WHERE user_id = v_user_id AND amount > 0 AND date <= now();

    -- 3. Sum up expenses (amount < 0 AND date <= now(), stored as absolute positive value in balances)
    SELECT COALESCE(SUM(ABS(amount)), 0.00) INTO v_expense
    FROM public.transactions
    WHERE user_id = v_user_id AND amount < 0 AND date <= now();

    -- 4. Calculate total balance
    v_total := v_initial_balance + v_income - v_expense;

    -- 5. Upsert total balance row
    IF EXISTS (SELECT 1 FROM public.balances WHERE user_id = v_user_id AND type = 'total') THEN
        UPDATE public.balances 
        SET amount = v_total, trend = '+0%', created_at = now()
        WHERE user_id = v_user_id AND type = 'total';
    ELSE
        INSERT INTO public.balances (user_id, label, amount, trend, icon, type)
        VALUES (v_user_id, 'Saldo Total', v_total, '+0%', 'Wallet', 'total');
    END IF;

    -- 6. Upsert income balance row
    IF EXISTS (SELECT 1 FROM public.balances WHERE user_id = v_user_id AND type = 'income') THEN
        UPDATE public.balances 
        SET amount = v_income, trend = '+0%', created_at = now()
        WHERE user_id = v_user_id AND type = 'income';
    ELSE
        INSERT INTO public.balances (user_id, label, amount, trend, icon, type)
        VALUES (v_user_id, 'Receitas', v_income, '+0%', 'ArrowUpCircle', 'income');
    END IF;

    -- 7. Upsert expense balance row
    IF EXISTS (SELECT 1 FROM public.balances WHERE user_id = v_user_id AND type = 'expense') THEN
        UPDATE public.balances 
        SET amount = v_expense, trend = '+0%', created_at = now()
        WHERE user_id = v_user_id AND type = 'expense';
    ELSE
        INSERT INTO public.balances (user_id, label, amount, trend, icon, type)
        VALUES (v_user_id, 'Despesas', v_expense, '+0%', 'ArrowDownCircle', 'expense');
    END IF;

    RETURN NULL; -- AFTER trigger can return NULL
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
