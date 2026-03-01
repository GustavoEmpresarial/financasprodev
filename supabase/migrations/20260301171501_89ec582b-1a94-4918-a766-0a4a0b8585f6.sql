
-- Table for alternative/web3 investments
CREATE TABLE public.alt_investments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  logo_url TEXT,
  currency TEXT NOT NULL DEFAULT 'BRL',
  invested_amount NUMERIC NOT NULL DEFAULT 0,
  expiration_date DATE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table for daily earnings logs
CREATE TABLE public.alt_investment_earnings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  investment_id UUID NOT NULL REFERENCES public.alt_investments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.alt_investments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alt_investment_earnings ENABLE ROW LEVEL SECURITY;

-- RLS policies for alt_investments
CREATE POLICY "Users can view their own alt investments" ON public.alt_investments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own alt investments" ON public.alt_investments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own alt investments" ON public.alt_investments FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own alt investments" ON public.alt_investments FOR DELETE USING (auth.uid() = user_id);

-- RLS policies for alt_investment_earnings
CREATE POLICY "Users can view their own earnings" ON public.alt_investment_earnings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own earnings" ON public.alt_investment_earnings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own earnings" ON public.alt_investment_earnings FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own earnings" ON public.alt_investment_earnings FOR DELETE USING (auth.uid() = user_id);

-- Updated_at trigger
CREATE TRIGGER update_alt_investments_updated_at BEFORE UPDATE ON public.alt_investments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Storage bucket for investment logos
INSERT INTO storage.buckets (id, name, public) VALUES ('investment-logos', 'investment-logos', true);

-- Storage policies
CREATE POLICY "Users can upload logos" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'investment-logos' AND auth.role() = 'authenticated');
CREATE POLICY "Anyone can view logos" ON storage.objects FOR SELECT USING (bucket_id = 'investment-logos');
CREATE POLICY "Users can delete their logos" ON storage.objects FOR DELETE USING (bucket_id = 'investment-logos' AND auth.role() = 'authenticated');
