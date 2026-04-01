
-- Financial Accounts table
CREATE TABLE public.financial_accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  account_type TEXT NOT NULL DEFAULT 'checking',
  balance NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'BRL',
  color TEXT,
  icon TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.financial_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own accounts" ON public.financial_accounts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own accounts" ON public.financial_accounts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own accounts" ON public.financial_accounts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own accounts" ON public.financial_accounts FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_financial_accounts_updated_at
  BEFORE UPDATE ON public.financial_accounts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Account Transfers table
CREATE TABLE public.account_transfers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  from_account_id UUID NOT NULL REFERENCES public.financial_accounts(id) ON DELETE CASCADE,
  to_account_id UUID NOT NULL REFERENCES public.financial_accounts(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  description TEXT,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.account_transfers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own transfers" ON public.account_transfers FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own transfers" ON public.account_transfers FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own transfers" ON public.account_transfers FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own transfers" ON public.account_transfers FOR DELETE USING (auth.uid() = user_id);

-- Recurring Subscriptions table
CREATE TABLE public.recurring_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  frequency TEXT NOT NULL DEFAULT 'monthly',
  category_id UUID REFERENCES public.categories(id),
  account_id UUID REFERENCES public.financial_accounts(id) ON DELETE SET NULL,
  next_billing_date DATE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  color TEXT,
  icon TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.recurring_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own subscriptions" ON public.recurring_subscriptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own subscriptions" ON public.recurring_subscriptions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own subscriptions" ON public.recurring_subscriptions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own subscriptions" ON public.recurring_subscriptions FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_recurring_subscriptions_updated_at
  BEFORE UPDATE ON public.recurring_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Add installment and account fields to transactions
ALTER TABLE public.transactions 
  ADD COLUMN IF NOT EXISTS account_id UUID REFERENCES public.financial_accounts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS installment_count INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS installment_group UUID,
  ADD COLUMN IF NOT EXISTS installment_number INTEGER DEFAULT 1;

-- Enhance financial_goals
ALTER TABLE public.financial_goals
  ADD COLUMN IF NOT EXISTS deadline DATE,
  ADD COLUMN IF NOT EXISTS goal_type TEXT DEFAULT 'savings',
  ADD COLUMN IF NOT EXISTS icon TEXT,
  ADD COLUMN IF NOT EXISTS color TEXT;

-- Function to auto-create default account for new users
CREATE OR REPLACE FUNCTION public.create_default_account()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.financial_accounts (user_id, name, account_type, balance, icon, color)
  VALUES (NEW.id, 'Conta Principal', 'checking', 0, 'building-2', '#3b82f6');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created_account
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.create_default_account();
