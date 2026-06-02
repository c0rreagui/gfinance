-- Migration: Reminders Realized Transactions Trigger
-- Path: supabase/migrations/20260602190000_reminders_realized_transactions.sql
-- Links paid reminders automatically to actual transactions to preserve data synchronicity

-- 1. Add reminder_id column to transactions
ALTER TABLE public.transactions 
ADD COLUMN IF NOT EXISTS reminder_id uuid REFERENCES public.reminders(id) ON DELETE SET NULL;

-- 2. Create trigger function to propagate paid reminders to transactions
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

        INSERT INTO public.transactions (user_id, description, category, amount, icon, date, reminder_id)
        VALUES (NEW.user_id, NEW.title, v_category, v_amount, v_icon, NEW.due_date, NEW.id);

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

            INSERT INTO public.transactions (user_id, description, category, amount, icon, date, reminder_id)
            VALUES (NEW.user_id, NEW.title, v_category, v_amount, v_icon, NEW.due_date, NEW.id);
            
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

-- 3. Create Triggers
DROP TRIGGER IF EXISTS trigger_reminder_paid_change ON public.reminders;
CREATE TRIGGER trigger_reminder_paid_change
    AFTER INSERT OR UPDATE OR DELETE ON public.reminders
    FOR EACH ROW EXECUTE FUNCTION public.handle_reminder_paid_change();

-- 4. Backfill existing paid reminders into transactions
INSERT INTO public.transactions (user_id, description, category, amount, icon, date, reminder_id)
SELECT 
    r.user_id,
    r.title,
    CASE 
        WHEN r.category_icon = 'Tv' OR r.title ILIKE '%netflix%' OR r.title ILIKE '%spotify%' THEN 'Assinaturas'
        WHEN r.category_icon = 'ArrowDownLeft' OR r.title ILIKE '%salário%' THEN 'Salário'
        ELSE 'Outros'
    END,
    CASE 
        WHEN r.amount > 0 AND (r.category_icon = 'ArrowDownLeft' OR r.title ILIKE '%salário%' OR r.title ILIKE '%receita%' OR r.title ILIKE '%rendimento%') THEN r.amount
        ELSE -ABS(r.amount)
    END,
    COALESCE(r.category_icon, 'Activity'),
    r.due_date,
    r.id
FROM public.reminders r
WHERE r.paid = true 
  AND NOT EXISTS (
      SELECT 1 FROM public.transactions t WHERE t.reminder_id = r.id
  );
