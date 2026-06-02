-- Migration: Installment Purchases Support
-- Path: supabase/migrations/20260602270000_installments_support.sql

CREATE TABLE IF NOT EXISTS public.installments (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    card_id uuid REFERENCES public.credit_cards(id) ON DELETE SET NULL,
    description text NOT NULL,
    total_amount numeric NOT NULL,
    total_installments integer NOT NULL CHECK (total_installments > 0),
    paid_installments integer NOT NULL DEFAULT 0 CHECK (paid_installments >= 0),
    installment_amount numeric NOT NULL,
    first_due_date timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on installments
ALTER TABLE public.installments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own installments"
ON public.installments FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Add installment_id column to reminders and transactions
ALTER TABLE public.reminders ADD COLUMN IF NOT EXISTS installment_id uuid REFERENCES public.installments(id) ON DELETE CASCADE;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS installment_id uuid REFERENCES public.installments(id) ON DELETE SET NULL;

-- Trigger to sync paid_installments counter when reminder paid state changes
CREATE OR REPLACE FUNCTION public.handle_reminder_installment_paid_sync()
RETURNS trigger AS $$
BEGIN
    IF NEW.installment_id IS NOT NULL THEN
        IF NEW.paid = true AND (OLD.paid = false OR OLD.paid IS NULL) THEN
            UPDATE public.installments 
            SET paid_installments = LEAST(total_installments, paid_installments + 1)
            WHERE id = NEW.installment_id;
        ELSIF NEW.paid = false AND OLD.paid = true THEN
            UPDATE public.installments 
            SET paid_installments = GREATEST(0, paid_installments - 1)
            WHERE id = NEW.installment_id;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_reminder_installment_paid_sync ON public.reminders;
CREATE TRIGGER trigger_reminder_installment_paid_sync
AFTER UPDATE OF paid ON public.reminders
FOR EACH ROW
EXECUTE FUNCTION public.handle_reminder_installment_paid_sync();
