
CREATE TABLE public.earnings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  source_name TEXT NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'BRL',
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'other',
  linked_investment_id UUID REFERENCES public.alt_investments(id) ON DELETE SET NULL,
  linked_traditional_investment_id UUID REFERENCES public.investments(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.earnings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own earnings" ON public.earnings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own earnings" ON public.earnings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own earnings" ON public.earnings FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own earnings" ON public.earnings FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_earnings_updated_at BEFORE UPDATE ON public.earnings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
