-- Migration: Link Trigger Installments and Cards
-- Path: supabase/migrations/20260602280000_link_trigger_installments.sql

CREATE OR REPLACE FUNCTION public.handle_reminder_paid_change()
RETURNS trigger AS $$
DECLARE
    v_amount numeric;
    v_category text;
    v_icon text;
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

        -- Trust the sign of amount directly (+ for income/receita, - for expense/despesa)
        v_amount := NEW.amount;
        
        -- Infer category
        IF NEW.category_icon = 'Tv' OR NEW.title ILIKE '%netflix%' OR NEW.title ILIKE '%spotify%' THEN
            v_category := 'Assinaturas';
            v_icon := 'Tv';
        ELSIF NEW.amount > 0 THEN
            v_category := 'Salário';
            v_icon := 'ArrowDownLeft';
        ELSE
            v_category := COALESCE(NEW.category_icon, 'Outros');
            IF v_category = 'CreditCard' THEN
                v_category := 'Cartão';
            END IF;
            v_icon := COALESCE(NEW.category_icon, 'Activity');
        END IF;

        -- De-duplicate / Update existing transaction for this reminder if exists
        DELETE FROM public.transactions WHERE reminder_id = NEW.id;

        -- Insert transaction carrying over card_id and installment_id
        INSERT INTO public.transactions (user_id, description, category, amount, icon, date, reminder_id, card_id, installment_id)
        VALUES (NEW.user_id, NEW.title, v_category, v_amount, v_icon, v_tx_date, NEW.id, NEW.card_id, NEW.installment_id);

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
