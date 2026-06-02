-- Migration: Credit Card Statement Closing and Due Dates, and Card Linking
-- Path: supabase/migrations/20260602230000_credit_card_features.sql

-- 1. Add closing_day and due_day to credit_cards
ALTER TABLE public.credit_cards
ADD COLUMN IF NOT EXISTS closing_day integer DEFAULT 4 CHECK (closing_day >= 1 AND closing_day <= 31),
ADD COLUMN IF NOT EXISTS due_day integer DEFAULT 10 CHECK (due_day >= 1 AND due_day <= 31);

-- 2. Add card_id to transactions and reminders
ALTER TABLE public.transactions
ADD COLUMN IF NOT EXISTS card_id uuid REFERENCES public.credit_cards(id) ON DELETE SET NULL;

ALTER TABLE public.reminders
ADD COLUMN IF NOT EXISTS card_id uuid REFERENCES public.credit_cards(id) ON DELETE SET NULL;

-- 3. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_transactions_card_id ON public.transactions (card_id);
CREATE INDEX IF NOT EXISTS idx_reminders_card_id ON public.reminders (card_id);

-- 4. Update handle_reminder_paid_change trigger function to propagate card_id
CREATE OR REPLACE FUNCTION public.handle_reminder_paid_change()
RETURNS trigger AS $$
DECLARE
    v_amount numeric;
    v_category text;
    v_icon text;
    v_is_income boolean;
BEGIN
    IF TG_OP = 'INSERT' AND NEW.paid = true THEN
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

        INSERT INTO public.transactions (user_id, description, category, amount, icon, date, reminder_id, card_id)
        VALUES (NEW.user_id, NEW.title, v_category, v_amount, v_icon, NEW.due_date, NEW.id, NEW.card_id);

    ELSIF TG_OP = 'UPDATE' THEN
        -- If transitioned from unpaid to paid
        IF NEW.paid = true AND OLD.paid = false THEN
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

            INSERT INTO public.transactions (user_id, description, category, amount, icon, date, reminder_id, card_id)
            VALUES (NEW.user_id, NEW.title, v_category, v_amount, v_icon, NEW.due_date, NEW.id, NEW.card_id);
            
        -- If transitioned from paid to unpaid, remove the corresponding transaction
        ELSIF NEW.paid = false AND OLD.paid = true THEN
            DELETE FROM public.transactions WHERE reminder_id = NEW.id;
        END IF;

    ELSIF TG_OP = 'DELETE' THEN
        -- Clean up corresponding transactions if the reminder is deleted
        DELETE FROM public.transactions WHERE reminder_id = OLD.id;
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
