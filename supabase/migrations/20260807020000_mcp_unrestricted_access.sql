-- Migration: 20260807020000_mcp_unrestricted_access.sql
-- Description: Enable unrestricted read and write policies for transactions, balances, credit_cards, and reminders to support MCP server operations

-- 1. Transactions
DROP POLICY IF EXISTS "Allow users to view their own transactions" ON public.transactions;
DROP POLICY IF EXISTS "Allow users to manage their own transactions" ON public.transactions;

CREATE POLICY "Allow mcp and users to select transactions" ON public.transactions FOR SELECT USING (true);
CREATE POLICY "Allow mcp and users to insert transactions" ON public.transactions FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow mcp and users to update transactions" ON public.transactions FOR UPDATE USING (true);
CREATE POLICY "Allow mcp and users to delete transactions" ON public.transactions FOR DELETE USING (true);

-- 2. Balances
DROP POLICY IF EXISTS "Allow users to view their own balances" ON public.balances;
DROP POLICY IF EXISTS "Allow users to manage their own balances" ON public.balances;

CREATE POLICY "Allow mcp and users to select balances" ON public.balances FOR SELECT USING (true);
CREATE POLICY "Allow mcp and users to insert balances" ON public.balances FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow mcp and users to update balances" ON public.balances FOR UPDATE USING (true);
CREATE POLICY "Allow mcp and users to delete balances" ON public.balances FOR DELETE USING (true);

-- 3. Credit Cards
DROP POLICY IF EXISTS "Allow users to view their own credit_cards" ON public.credit_cards;
DROP POLICY IF EXISTS "Allow users to manage their own credit_cards" ON public.credit_cards;

CREATE POLICY "Allow mcp and users to select credit_cards" ON public.credit_cards FOR SELECT USING (true);
CREATE POLICY "Allow mcp and users to insert credit_cards" ON public.credit_cards FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow mcp and users to update credit_cards" ON public.credit_cards FOR UPDATE USING (true);
CREATE POLICY "Allow mcp and users to delete credit_cards" ON public.credit_cards FOR DELETE USING (true);

-- 4. Reminders
DROP POLICY IF EXISTS "Allow users to view their own reminders" ON public.reminders;
DROP POLICY IF EXISTS "Allow users to manage their own reminders" ON public.reminders;

CREATE POLICY "Allow mcp and users to select reminders" ON public.reminders FOR SELECT USING (true);
CREATE POLICY "Allow mcp and users to insert reminders" ON public.reminders FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow mcp and users to update reminders" ON public.reminders FOR UPDATE USING (true);
CREATE POLICY "Allow mcp and users to delete reminders" ON public.reminders FOR DELETE USING (true);
