-- 1. Revoke direct execution of internal SECURITY DEFINER helpers
REVOKE ALL ON FUNCTION public.seed_user_categories(uuid) FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.seed_user_payment_methods(uuid) FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.create_default_account() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.audit_record() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM anon, authenticated;

-- 2. Restrict listing on public buckets: keep read access scoped per-object owner folder
DROP POLICY IF EXISTS "Public read card-images" ON storage.objects;
DROP POLICY IF EXISTS "Public read investment-logos" ON storage.objects;

CREATE POLICY "card_images_owner_list"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'card-images' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "investment_logos_owner_list"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'investment-logos' AND (storage.foldername(name))[1] = auth.uid()::text);

-- 3. Performance indexes (partial on active rows)
CREATE INDEX IF NOT EXISTS idx_transactions_user_date ON public.transactions (user_id, date DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_transactions_category ON public.transactions (user_id, category_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_transactions_card ON public.transactions (user_id, credit_card_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_transactions_subscription ON public.transactions (subscription_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_earnings_user_date ON public.earnings (user_id, date DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_bills_user_due ON public.bills (user_id, due_date) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_transfers_user_date ON public.account_transfers (user_id, date DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_subs_user ON public.recurring_subscriptions (user_id, status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_sub_charges_sub ON public.subscription_charges (subscription_id, charge_date DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_categories_user ON public.categories (user_id, parent_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_accounts_user ON public.financial_accounts (user_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_cards_user ON public.credit_cards (user_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_goals_user ON public.financial_goals (user_id, month) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_crypto_user ON public.crypto_holdings (user_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_investments_user ON public.investments (user_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_audits_record ON public.record_audits (table_name, record_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audits_user ON public.record_audits (user_id, created_at DESC);