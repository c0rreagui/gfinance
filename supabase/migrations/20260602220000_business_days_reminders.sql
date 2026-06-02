-- Migration: Business Days Reminders Propagation
-- Path: supabase/migrations/20260602220000_business_days_reminders.sql

-- 1. Helper function to get first business day of the month of a date
CREATE OR REPLACE FUNCTION public.get_first_business_day(p_date timestamp with time zone)
RETURNS timestamp with time zone AS $$
DECLARE
    v_first_day timestamp with time zone;
    v_dow integer;
BEGIN
    v_first_day := date_trunc('month', p_date);
    v_dow := extract(dow from v_first_day)::integer;
    IF v_dow = 6 THEN -- Saturday
        RETURN v_first_day + interval '2 days';
    ELSIF v_dow = 0 THEN -- Sunday
        RETURN v_first_day + interval '1 day';
    ELSE
        RETURN v_first_day;
    END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 2. Helper function to get last business day of the month of a date
CREATE OR REPLACE FUNCTION public.get_last_business_day(p_date timestamp with time zone)
RETURNS timestamp with time zone AS $$
DECLARE
    v_last_day timestamp with time zone;
    v_dow integer;
BEGIN
    v_last_day := date_trunc('month', p_date) + interval '1 month' - interval '1 day';
    v_dow := extract(dow from v_last_day)::integer;
    IF v_dow = 6 THEN -- Saturday
        RETURN v_last_day - interval '1 day';
    ELSIF v_dow = 0 THEN -- Sunday
        RETURN v_last_day - interval '2 days';
    ELSE
        RETURN v_last_day;
    END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 3. Upgrade trigger function to resolve transaction dates based on recurrence frequency
CREATE OR REPLACE FUNCTION public.handle_reminder_paid_change()
RETURNS trigger AS $$
DECLARE
    v_amount numeric;
    v_category text;
    v_icon text;
    v_is_income boolean;
    v_tx_date timestamp with time zone;
BEGIN
    IF (TG_OP = 'INSERT' AND NEW.paid = true) OR (TG_OP = 'UPDATE' AND NEW.paid = true AND OLD.paid = false) THEN
        -- Resolve transaction date
        v_tx_date := NEW.due_date;
        IF NEW.is_recurring = true THEN
            IF lower(NEW.frequency) = 'primeiro_dia_util' THEN
                v_tx_date := public.get_first_business_day(NEW.due_date);
            ELSIF lower(NEW.frequency) = 'ultimo_dia_util' THEN
                v_tx_date := public.get_last_business_day(NEW.due_date);
            END IF;
        END IF;

        -- Calculate resolved amount (signed)
        v_is_income := NEW.amount > 0 AND (
            NEW.category_icon = 'ArrowDownLeft' OR
            NEW.category_icon = 'Wallet' OR
            lower(NEW.title) LIKE '%salário%' OR
            lower(NEW.title) LIKE '%receita%' OR
            lower(NEW.title) LIKE '%rendimento%'
        );
        IF NEW.amount < 0 THEN
            v_amount := NEW.amount;
        ELSIF v_is_income THEN
            v_amount := NEW.amount;
        ELSE
            v_amount := -NEW.amount;
        END IF;
        
        -- Infer category
        IF NEW.category_icon = 'Tv' OR NEW.title ILIKE '%netflix%' OR NEW.title ILIKE '%spotify%' THEN
            v_category := 'Assinaturas';
            v_icon := 'Tv';
        ELSIF NEW.category_icon = 'ArrowDownLeft' OR NEW.title ILIKE '%salário%' THEN
            v_category := 'Salário';
            v_icon := 'ArrowDownLeft';
        ELSE
            v_category := 'Outros';
            v_icon := COALESCE(NEW.category_icon, 'Activity');
        END IF;

        -- De-duplicate / Update existing transaction for this reminder if exists
        DELETE FROM public.transactions WHERE reminder_id = NEW.id;

        INSERT INTO public.transactions (user_id, description, category, amount, icon, date, reminder_id)
        VALUES (NEW.user_id, NEW.title, v_category, v_amount, v_icon, v_tx_date, NEW.id);

    ELSIF TG_OP = 'UPDATE' AND NEW.paid = false AND OLD.paid = true THEN
        -- Clean up corresponding transactions if reminder is marked unpaid
        DELETE FROM public.transactions WHERE reminder_id = NEW.id;

    ELSIF TG_OP = 'DELETE' THEN
        -- Clean up corresponding transactions if reminder is deleted
        DELETE FROM public.transactions WHERE reminder_id = OLD.id;
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
