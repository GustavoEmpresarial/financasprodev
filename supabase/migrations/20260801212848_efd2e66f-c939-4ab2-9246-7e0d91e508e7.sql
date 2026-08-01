REVOKE ALL ON FUNCTION public.seed_user_categories(uuid) FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.seed_user_payment_methods(uuid) FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.audit_record() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.create_default_account() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM anon, authenticated;