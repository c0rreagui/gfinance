-- Migration: Add hidden_before_date to profiles and update balance reconciliation
-- Path: supabase/migrations/20260608000000_hidden_before_date.sql

ALTER TABLE public.profiles
ADD COLUMN hidden_before_date date DEFAULT '2026-05-01'::date;

-- Update existing profiles to have the default date
UPDATE public.profiles
SET hidden_before_date = '2026-05-01'::date
WHERE hidden_before_date IS NULL;

-- Re-define reconcile_user_balances to exclude card transactions and ignore transactions before hidden_before_date
CREATE OR REPLACE FUNCTION public.reconcile_user_balances()
RETURNS trigger AS $$
DECLARE
    v_user_id uuid;
    v_initial_balance numeric;
    v_hidden_before_date date;
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

    -- 1. Fetch initial_balance and hidden_before_date from profiles
    SELECT COALESCE(initial_balance, 0.00), hidden_before_date 
    INTO v_initial_balance, v_hidden_before_date
    FROM public.profiles
    WHERE id = v_user_id;

    -- 2. Sum up incomes (amount > 0 AND date <= now() AND card_id IS NULL AND (v_hidden_before_date IS NULL OR date::date >= v_hidden_before_date))
    SELECT COALESCE(SUM(amount), 0.00) INTO v_income
    FROM public.transactions
    WHERE user_id = v_user_id 
      AND amount > 0 
      AND date <= now()
      AND card_id IS NULL
      AND (v_hidden_before_date IS NULL OR date::date >= v_hidden_before_date);

    -- 3. Sum up expenses (amount < 0 AND date <= now() AND card_id IS NULL AND (v_hidden_before_date IS NULL OR date::date >= v_hidden_before_date))
    SELECT COALESCE(SUM(ABS(amount)), 0.00) INTO v_expense
    FROM public.transactions
    WHERE user_id = v_user_id 
      AND amount < 0 
      AND date <= now()
      AND card_id IS NULL
      AND (v_hidden_before_date IS NULL OR date::date >= v_hidden_before_date);

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

-- Re-create profile trigger to fire on initial_balance OR hidden_before_date update
DROP TRIGGER IF EXISTS trigger_reconcile_on_profile ON public.profiles;
CREATE TRIGGER trigger_reconcile_on_profile
    AFTER UPDATE OF initial_balance, hidden_before_date ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.reconcile_user_balances();
