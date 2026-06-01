-- 1. Add settings and limit columns to public.profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS push_notifications_enabled boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS two_factor_enabled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS card_limit numeric DEFAULT 25000;

-- 2. Add signature columns to public.reminders
ALTER TABLE public.reminders 
ADD COLUMN IF NOT EXISTS frequency text DEFAULT 'Mensal',
ADD COLUMN IF NOT EXISTS category_icon text,
ADD COLUMN IF NOT EXISTS brand_color text;

-- 3. Create credit_cards table
CREATE TABLE IF NOT EXISTS public.credit_cards (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    card_name text NOT NULL,
    last_four text NOT NULL,
    expiration_date text NOT NULL,
    card_limit numeric NOT NULL,
    spline_url text,
    created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on credit_cards
ALTER TABLE public.credit_cards ENABLE ROW LEVEL SECURITY;

-- Create RLS Policies for credit_cards
CREATE POLICY "Users can manage their own credit cards" 
ON public.credit_cards 
FOR ALL 
TO authenticated 
USING (auth.uid() = user_id) 
WITH CHECK (auth.uid() = user_id);

-- 4. Create crypto_wallets table
CREATE TABLE IF NOT EXISTS public.crypto_wallets (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    wallet_address text NOT NULL,
    provider text NOT NULL,
    balance_btc numeric DEFAULT 0,
    balance_eth numeric DEFAULT 0,
    balance_sol numeric DEFAULT 0,
    created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on crypto_wallets
ALTER TABLE public.crypto_wallets ENABLE ROW LEVEL SECURITY;

-- Create RLS Policies for crypto_wallets
CREATE POLICY "Users can manage their own crypto wallets" 
ON public.crypto_wallets 
FOR ALL 
TO authenticated 
USING (auth.uid() = user_id) 
WITH CHECK (auth.uid() = user_id);
