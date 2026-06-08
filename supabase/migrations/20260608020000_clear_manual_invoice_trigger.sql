-- Migration: Clear manual_invoice_amount on card payment
-- Path: supabase/migrations/20260608020000_clear_manual_invoice_trigger.sql

CREATE OR REPLACE FUNCTION public.clear_manual_invoice_on_payment()
RETURNS trigger AS $$
DECLARE
    v_card_id uuid;
BEGIN
    -- Try to find a credit card for this user that matches the payment description
    SELECT id INTO v_card_id
    FROM public.credit_cards
    WHERE user_id = NEW.user_id
      AND (
          LOWER(NEW.description) LIKE '%' || LOWER(card_name) || '%'
          OR LOWER(NEW.description) LIKE '%' || last_four || '%'
          OR (card_name = 'Itaú Mult MC Plat' AND LOWER(NEW.description) LIKE '%itau mult%')
      )
    LIMIT 1;

    IF v_card_id IS NOT NULL THEN
        UPDATE public.credit_cards
        SET manual_invoice_amount = NULL
        WHERE id = v_card_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER trigger_clear_manual_invoice_on_payment
AFTER INSERT ON public.transactions
FOR EACH ROW
WHEN (NEW.card_id IS NULL AND NEW.category = 'Cartão' AND LOWER(NEW.description) LIKE '%pagamento%')
EXECUTE FUNCTION public.clear_manual_invoice_on_payment();
