-- Migration: Make Reminder Paid Trigger Linking Friendly
-- Path: supabase/migrations/20260608030000_make_reminder_paid_trigger_linking_friendly.sql

CREATE OR REPLACE FUNCTION public.handle_reminder_paid_change()
RETURNS trigger AS $$
DECLARE
    v_amount numeric;
    v_category text;
    v_icon text;
    v_tx_date timestamp with time zone;
    v_exists boolean;
BEGIN
    -- Check if a transaction is already linked to this reminder
    SELECT EXISTS (
        SELECT 1 FROM public.transactions WHERE reminder_id = COALESCE(NEW.id, OLD.id)
    ) INTO v_exists;

    IF (TG_OP = 'INSERT' AND NEW.paid = true) OR (TG_OP = 'UPDATE' AND NEW.paid = true AND (OLD.paid = false OR OLD.paid IS NULL)) THEN
        -- If a transaction is already linked, we don't overwrite it!
        IF NOT v_exists THEN
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
                v_category := 'Outros';
                v_icon := COALESCE(NEW.category_icon, 'Activity');
            END IF;

            INSERT INTO public.transactions (user_id, description, category, amount, icon, date, reminder_id)
            VALUES (NEW.user_id, NEW.title, v_category, v_amount, v_icon, v_tx_date, NEW.id);
        END IF;

    ELSIF TG_OP = 'UPDATE' AND NEW.paid = false AND OLD.paid = true THEN
        -- If a transaction is real (like SMS) or manually linked (diff description/amount), unlink instead of delete
        UPDATE public.transactions 
        SET reminder_id = NULL 
        WHERE reminder_id = NEW.id 
          AND (source_type = 'sms' OR description <> NEW.title OR amount <> NEW.amount);
        
        -- Delete only the auto-created transaction
        DELETE FROM public.transactions WHERE reminder_id = NEW.id;

    ELSIF TG_OP = 'DELETE' THEN
        -- If a transaction is real (like SMS) or manually linked (diff description/amount), unlink instead of delete
        UPDATE public.transactions 
        SET reminder_id = NULL 
        WHERE reminder_id = OLD.id 
          AND (source_type = 'sms' OR description <> OLD.title OR amount <> OLD.amount);
        
        -- Clean up corresponding transactions if reminder is deleted
        DELETE FROM public.transactions WHERE reminder_id = OLD.id;
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
