
-- Add card_type and image_url to credit_cards
ALTER TABLE public.credit_cards ADD COLUMN IF NOT EXISTS card_type text NOT NULL DEFAULT 'credit';
ALTER TABLE public.credit_cards ADD COLUMN IF NOT EXISTS image_url text;

-- Add payment_method and credit_card_id to transactions
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS payment_method text NOT NULL DEFAULT 'pix';
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS credit_card_id uuid REFERENCES public.credit_cards(id) ON DELETE SET NULL;

-- Create storage bucket for card images
INSERT INTO storage.buckets (id, name, public) VALUES ('card-images', 'card-images', true) ON CONFLICT DO NOTHING;

-- Storage policies for card-images bucket
CREATE POLICY "Users can upload card images" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'card-images' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users can view card images" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'card-images');
CREATE POLICY "Users can delete card images" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'card-images' AND (storage.foldername(name))[1] = auth.uid()::text);
