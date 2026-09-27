ALTER TABLE public.user_grocery_prices
  ALTER COLUMN store_name SET DEFAULT 'My store';
UPDATE public.user_grocery_prices SET store_name = 'My store' WHERE store_name IS NULL OR btrim(store_name) = '';
ALTER TABLE public.user_grocery_prices ALTER COLUMN store_name SET NOT NULL;

ALTER TABLE public.user_grocery_prices DROP CONSTRAINT IF EXISTS user_grocery_prices_user_id_item_key_key;
DROP INDEX IF EXISTS user_grocery_prices_user_item_idx;
CREATE UNIQUE INDEX IF NOT EXISTS user_grocery_prices_user_store_item_idx
  ON public.user_grocery_prices (user_id, store_name, item_key);

CREATE TABLE IF NOT EXISTS public.user_stores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  city text,
  is_active boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS user_stores_user_name_idx ON public.user_stores (user_id, name);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_stores TO authenticated;
GRANT ALL ON public.user_stores TO service_role;
ALTER TABLE public.user_stores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own stores" ON public.user_stores;
CREATE POLICY "Users manage own stores" ON public.user_stores
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP TRIGGER IF EXISTS touch_user_stores ON public.user_stores;
CREATE TRIGGER touch_user_stores BEFORE UPDATE ON public.user_stores
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();