-- =========================================================
-- 1. SOFT DELETE + TIMESTAMPS EM TODAS AS TABELAS
-- =========================================================
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE public.earnings ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE public.bills ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE public.credit_cards ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE public.financial_accounts ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE public.financial_goals ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE public.investments ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE public.alt_investments ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE public.alt_investment_earnings ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE public.crypto_holdings ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE public.recurring_subscriptions ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE public.account_transfers ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE public.category_budgets ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

ALTER TABLE public.account_transfers ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.alt_investment_earnings ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.category_budgets ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- =========================================================
-- 2. CATEGORIAS POR USUÁRIO + SUBCATEGORIAS
-- =========================================================
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS user_id uuid;
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES public.categories(id) ON DELETE CASCADE;
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS categories_user_idx ON public.categories(user_id);
CREATE INDEX IF NOT EXISTS categories_parent_idx ON public.categories(parent_id);

-- clona as categorias-modelo (user_id IS NULL) para um usuário
CREATE OR REPLACE FUNCTION public.seed_user_categories(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.categories WHERE user_id = _user_id) THEN
    RETURN;
  END IF;
  INSERT INTO public.categories (name, icon, color, type, is_default, user_id)
  SELECT c.name, c.icon, c.color, c.type, true, _user_id
  FROM public.categories c
  WHERE c.user_id IS NULL AND c.parent_id IS NULL AND c.deleted_at IS NULL;
END;
$$;

-- migra usuários existentes: cria cópias e reaponta os registros
DO $$
DECLARE
  u record;
  m record;
BEGIN
  FOR u IN SELECT DISTINCT user_id FROM public.profiles LOOP
    PERFORM public.seed_user_categories(u.user_id);
    FOR m IN
      SELECT g.id AS old_id, n.id AS new_id
      FROM public.categories g
      JOIN public.categories n
        ON n.user_id = u.user_id AND n.name = g.name AND n.type = g.type
      WHERE g.user_id IS NULL
    LOOP
      UPDATE public.transactions SET category_id = m.new_id WHERE category_id = m.old_id AND user_id = u.user_id;
      UPDATE public.bills SET category_id = m.new_id WHERE category_id = m.old_id AND user_id = u.user_id;
      UPDATE public.category_budgets SET category_id = m.new_id WHERE category_id = m.old_id AND user_id = u.user_id;
      UPDATE public.recurring_subscriptions SET category_id = m.new_id WHERE category_id = m.old_id AND user_id = u.user_id;
    END LOOP;
  END LOOP;
END $$;

-- novos usuários recebem perfil + categorias + métodos de pagamento
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email));
  PERFORM public.seed_user_categories(NEW.id);
  PERFORM public.seed_user_payment_methods(NEW.id);
  RETURN NEW;
END;
$$;

-- RLS de categorias: cada um gerencia as suas, modelos globais somente leitura
DROP POLICY IF EXISTS "Categories are viewable by everyone" ON public.categories;
DROP POLICY IF EXISTS "Anyone can view categories" ON public.categories;
DROP POLICY IF EXISTS "Everyone can view categories" ON public.categories;
DROP POLICY IF EXISTS "categories_select" ON public.categories;

CREATE POLICY "Usuário vê as próprias categorias"
  ON public.categories FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR user_id IS NULL);
CREATE POLICY "Usuário cria categorias"
  ON public.categories FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "Usuário edita as próprias categorias"
  ON public.categories FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Usuário exclui as próprias categorias"
  ON public.categories FOR DELETE TO authenticated
  USING (user_id = auth.uid());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.categories TO authenticated;
GRANT ALL ON public.categories TO service_role;

-- =========================================================
-- 3. MÉTODOS DE PAGAMENTO (DINÂMICOS)
-- =========================================================
CREATE TABLE IF NOT EXISTS public.payment_methods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  slug text,
  icon text,
  color text,
  is_default boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.payment_methods TO authenticated;
GRANT ALL ON public.payment_methods TO service_role;
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuário gerencia os próprios métodos de pagamento" ON public.payment_methods;
CREATE POLICY "Usuário gerencia os próprios métodos de pagamento"
  ON public.payment_methods FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.seed_user_payment_methods(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.payment_methods WHERE user_id = _user_id) THEN
    RETURN;
  END IF;
  INSERT INTO public.payment_methods (user_id, name, slug, icon, sort_order, is_default)
  VALUES
    (_user_id, 'Dinheiro', 'cash', 'banknote', 1, true),
    (_user_id, 'Pix', 'pix', 'zap', 2, true),
    (_user_id, 'Cartão de Débito', 'debit', 'credit-card', 3, true),
    (_user_id, 'Cartão de Crédito', 'credit', 'credit-card', 4, true),
    (_user_id, 'Boleto', 'boleto', 'file-text', 5, true),
    (_user_id, 'Transferência', 'transfer', 'arrow-left-right', 6, true);
END;
$$;

DO $$
DECLARE u record;
BEGIN
  FOR u IN SELECT DISTINCT user_id FROM public.profiles LOOP
    PERFORM public.seed_user_payment_methods(u.user_id);
  END LOOP;
END $$;

-- =========================================================
-- 4. DESPESAS / TRANSAÇÕES
-- =========================================================
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS title text;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS subcategory_id uuid REFERENCES public.categories(id) ON DELETE SET NULL;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS payment_method_id uuid REFERENCES public.payment_methods(id) ON DELETE SET NULL;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS notes text;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}';
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS attachments jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'paid';
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS is_recurring boolean NOT NULL DEFAULT false;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS recurrence_interval text;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS paid_at timestamptz;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS subscription_id uuid REFERENCES public.recurring_subscriptions(id) ON DELETE SET NULL;
UPDATE public.transactions SET title = COALESCE(title, description) WHERE title IS NULL;

-- =========================================================
-- 5. RECEITAS
-- =========================================================
ALTER TABLE public.earnings ADD COLUMN IF NOT EXISTS category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL;
ALTER TABLE public.earnings ADD COLUMN IF NOT EXISTS subcategory_id uuid REFERENCES public.categories(id) ON DELETE SET NULL;
ALTER TABLE public.earnings ADD COLUMN IF NOT EXISTS account_id uuid REFERENCES public.financial_accounts(id) ON DELETE SET NULL;
ALTER TABLE public.earnings ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}';
ALTER TABLE public.earnings ADD COLUMN IF NOT EXISTS notes text;
ALTER TABLE public.earnings ADD COLUMN IF NOT EXISTS is_recurring boolean NOT NULL DEFAULT false;
ALTER TABLE public.earnings ADD COLUMN IF NOT EXISTS recurrence_interval text;
ALTER TABLE public.earnings ADD COLUMN IF NOT EXISTS is_received boolean NOT NULL DEFAULT true;
ALTER TABLE public.earnings ADD COLUMN IF NOT EXISTS received_at timestamptz;

-- =========================================================
-- 6. CONTAS A PAGAR
-- =========================================================
ALTER TABLE public.bills ADD COLUMN IF NOT EXISTS subcategory_id uuid REFERENCES public.categories(id) ON DELETE SET NULL;
ALTER TABLE public.bills ADD COLUMN IF NOT EXISTS account_id uuid REFERENCES public.financial_accounts(id) ON DELETE SET NULL;
ALTER TABLE public.bills ADD COLUMN IF NOT EXISTS payment_method_id uuid REFERENCES public.payment_methods(id) ON DELETE SET NULL;
ALTER TABLE public.bills ADD COLUMN IF NOT EXISTS payment_date date;
ALTER TABLE public.bills ADD COLUMN IF NOT EXISTS priority text NOT NULL DEFAULT 'medium';
ALTER TABLE public.bills ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending';
ALTER TABLE public.bills ADD COLUMN IF NOT EXISTS paid_amount numeric NOT NULL DEFAULT 0;
ALTER TABLE public.bills ADD COLUMN IF NOT EXISTS installment_count integer;
ALTER TABLE public.bills ADD COLUMN IF NOT EXISTS installment_number integer;
ALTER TABLE public.bills ADD COLUMN IF NOT EXISTS installment_group uuid;
ALTER TABLE public.bills ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}';
UPDATE public.bills SET status = 'paid', paid_amount = amount WHERE is_paid = true AND status = 'pending';

-- =========================================================
-- 7. ASSINATURAS RECORRENTES
-- =========================================================
ALTER TABLE public.recurring_subscriptions ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active';
ALTER TABLE public.recurring_subscriptions ADD COLUMN IF NOT EXISTS source_transaction_id uuid;
ALTER TABLE public.recurring_subscriptions ADD COLUMN IF NOT EXISTS last_charged_at date;
ALTER TABLE public.recurring_subscriptions ADD COLUMN IF NOT EXISTS billing_day integer;
ALTER TABLE public.recurring_subscriptions ADD COLUMN IF NOT EXISTS payment_method_id uuid REFERENCES public.payment_methods(id) ON DELETE SET NULL;
UPDATE public.recurring_subscriptions SET status = CASE WHEN is_active THEN 'active' ELSE 'canceled' END;

CREATE TABLE IF NOT EXISTS public.subscription_charges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  subscription_id uuid NOT NULL REFERENCES public.recurring_subscriptions(id) ON DELETE CASCADE,
  transaction_id uuid REFERENCES public.transactions(id) ON DELETE SET NULL,
  amount numeric NOT NULL,
  charge_date date NOT NULL,
  status text NOT NULL DEFAULT 'paid',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.subscription_charges TO authenticated;
GRANT ALL ON public.subscription_charges TO service_role;
ALTER TABLE public.subscription_charges ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuário gerencia as próprias cobranças" ON public.subscription_charges;
CREATE POLICY "Usuário gerencia as próprias cobranças"
  ON public.subscription_charges FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- =========================================================
-- 8. AUDITORIA / HISTÓRICO
-- =========================================================
CREATE TABLE IF NOT EXISTS public.record_audits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  table_name text NOT NULL,
  record_id uuid NOT NULL,
  action text NOT NULL,
  changed_fields text[] NOT NULL DEFAULT '{}',
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS record_audits_record_idx ON public.record_audits(table_name, record_id, created_at DESC);
CREATE INDEX IF NOT EXISTS record_audits_user_idx ON public.record_audits(user_id, created_at DESC);

GRANT SELECT, INSERT ON public.record_audits TO authenticated;
GRANT ALL ON public.record_audits TO service_role;
ALTER TABLE public.record_audits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuário vê o próprio histórico" ON public.record_audits;
CREATE POLICY "Usuário vê o próprio histórico"
  ON public.record_audits FOR SELECT TO authenticated
  USING (user_id = auth.uid());
DROP POLICY IF EXISTS "Usuário registra o próprio histórico" ON public.record_audits;
CREATE POLICY "Usuário registra o próprio histórico"
  ON public.record_audits FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.audit_record()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid;
  v_old jsonb;
  v_new jsonb;
  v_fields text[] := '{}';
  v_action text;
  k text;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_user := OLD.user_id; v_old := to_jsonb(OLD); v_new := NULL; v_action := 'delete';
  ELSIF TG_OP = 'INSERT' THEN
    v_user := NEW.user_id; v_new := to_jsonb(NEW); v_old := NULL; v_action := 'create';
  ELSE
    v_user := NEW.user_id; v_old := to_jsonb(OLD); v_new := to_jsonb(NEW);
    v_action := CASE WHEN OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL THEN 'delete' ELSE 'update' END;
    FOR k IN SELECT jsonb_object_keys(v_new) LOOP
      IF k NOT IN ('updated_at') AND (v_old->k) IS DISTINCT FROM (v_new->k) THEN
        v_fields := array_append(v_fields, k);
      END IF;
    END LOOP;
    IF array_length(v_fields, 1) IS NULL THEN
      RETURN NEW;
    END IF;
  END IF;

  IF v_user IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  INSERT INTO public.record_audits (user_id, table_name, record_id, action, changed_fields, old_data, new_data)
  VALUES (v_user, TG_TABLE_NAME, COALESCE((v_new->>'id')::uuid, (v_old->>'id')::uuid), v_action, v_fields, v_old, v_new);

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- =========================================================
-- 9. TRIGGERS DE updated_at E AUDITORIA
-- =========================================================
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'transactions','earnings','bills','categories','credit_cards','financial_accounts',
    'financial_goals','investments','alt_investments','alt_investment_earnings',
    'crypto_holdings','recurring_subscriptions','account_transfers','category_budgets',
    'payment_methods','subscription_charges','profiles'
  ] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS set_updated_at ON public.%I', t);
    EXECUTE format('CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column()', t);
  END LOOP;

  FOREACH t IN ARRAY ARRAY[
    'transactions','earnings','bills','categories','credit_cards','financial_accounts',
    'financial_goals','investments','alt_investments','crypto_holdings',
    'recurring_subscriptions','account_transfers','payment_methods'
  ] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS audit_changes ON public.%I', t);
    EXECUTE format('CREATE TRIGGER audit_changes AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.audit_record()', t);
  END LOOP;
END $$;
