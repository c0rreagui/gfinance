-- 1. Profiles Table
CREATE TABLE public.profiles (
    id uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL PRIMARY KEY,
    updated_at timestamp with time zone,
    full_name text,
    avatar_url text,
    pin text
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow users to view their own profile" 
    ON public.profiles FOR SELECT 
    USING (auth.uid() = id);

CREATE POLICY "Allow users to update their own profile" 
    ON public.profiles FOR UPDATE 
    USING (auth.uid() = id);

-- 2. Balances Table
CREATE TABLE public.balances (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL,
    label text NOT NULL,
    amount numeric NOT NULL DEFAULT 0.00,
    trend text,
    icon text,
    type text CHECK (type IN ('total', 'income', 'expense')) NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.balances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow users to view their own balances" 
    ON public.balances FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Allow users to manage their own balances" 
    ON public.balances FOR ALL 
    USING (auth.uid() = user_id);

-- 3. Transactions Table
CREATE TABLE public.transactions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL,
    date timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    description text NOT NULL,
    category text NOT NULL,
    amount numeric NOT NULL,
    icon text NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow users to view their own transactions" 
    ON public.transactions FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Allow users to manage their own transactions" 
    ON public.transactions FOR ALL 
    USING (auth.uid() = user_id);

-- 4. Reminders Table
CREATE TABLE public.reminders (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL,
    title text NOT NULL,
    due_date timestamp with time zone NOT NULL,
    amount numeric NOT NULL DEFAULT 0.00,
    urgency text CHECK (urgency IN ('high', 'medium', 'low')) NOT NULL DEFAULT 'medium',
    paid boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow users to view their own reminders" 
    ON public.reminders FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Allow users to manage their own reminders" 
    ON public.reminders FOR ALL 
    USING (auth.uid() = user_id);

-- 5. Goals Table
CREATE TABLE public.goals (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL,
    name text NOT NULL,
    target_amount numeric NOT NULL,
    current_amount numeric NOT NULL DEFAULT 0.00,
    color text NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow users to view their own goals" 
    ON public.goals FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Allow users to manage their own goals" 
    ON public.goals FOR ALL 
    USING (auth.uid() = user_id);

-- 6. Trigger to automatically create a Profile for newly signed-up users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name, avatar_url)
    VALUES (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
