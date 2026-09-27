CREATE TABLE public.grocery_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_key text NOT NULL UNIQUE,
  label text NOT NULL,
  per_lb numeric,
  per_each numeric,
  per_cup numeric,
  per_tbsp numeric,
  region text NOT NULL DEFAULT 'US',
  source text NOT NULL DEFAULT 'BLS US city average',
  checked_on date NOT NULL DEFAULT current_date,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.grocery_prices TO anon;
GRANT SELECT ON public.grocery_prices TO authenticated;
GRANT ALL ON public.grocery_prices TO service_role;
ALTER TABLE public.grocery_prices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read grocery prices" ON public.grocery_prices FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Block client inserts on grocery prices" ON public.grocery_prices FOR INSERT TO anon, authenticated WITH CHECK (false);
CREATE POLICY "Block client updates on grocery prices" ON public.grocery_prices FOR UPDATE TO anon, authenticated USING (false) WITH CHECK (false);
CREATE POLICY "Block client deletes on grocery prices" ON public.grocery_prices FOR DELETE TO anon, authenticated USING (false);
CREATE TRIGGER trg_grocery_prices_updated_at BEFORE UPDATE ON public.grocery_prices FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.user_grocery_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_key text NOT NULL,
  label text NOT NULL DEFAULT '',
  per_lb numeric,
  per_each numeric,
  per_cup numeric,
  per_tbsp numeric,
  store_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, item_key)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_grocery_prices TO authenticated;
GRANT ALL ON public.user_grocery_prices TO service_role;
ALTER TABLE public.user_grocery_prices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own store prices" ON public.user_grocery_prices FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_user_grocery_prices_updated_at BEFORE UPDATE ON public.user_grocery_prices FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.dish_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  dish_slug text NOT NULL,
  storage_path text NOT NULL,
  caption text NOT NULL DEFAULT '',
  is_primary boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX dish_photos_user_slug_idx ON public.dish_photos (user_id, dish_slug);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dish_photos TO authenticated;
GRANT ALL ON public.dish_photos TO service_role;
ALTER TABLE public.dish_photos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own dish photos" ON public.dish_photos FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_dish_photos_updated_at BEFORE UPDATE ON public.dish_photos FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

INSERT INTO public.grocery_prices (item_key, label, per_lb, per_each, per_cup, per_tbsp, source) VALUES
('chicken-breast','Boneless chicken breast',4.15,3.10,NULL,NULL,'BLS US city average'),
('chicken-thigh','Chicken thighs / legs',2.05,1.20,NULL,NULL,'BLS US city average'),
('whole-chicken','Whole chicken',1.95,7.20,NULL,NULL,'BLS US city average'),
('chicken','Chicken, general',3.40,2.70,NULL,NULL,'BLS US city average'),
('ground-beef','Ground beef',6.15,NULL,NULL,NULL,'BLS US city average'),
('steak','Sirloin steak',11.60,NULL,NULL,NULL,'BLS US city average'),
('beef','Beef stew meat',7.35,NULL,NULL,NULL,'BLS US city average'),
('bacon','Sliced bacon',6.90,0.58,NULL,NULL,'BLS US city average'),
('sausage','Sausage',4.55,1.15,NULL,NULL,'BLS US city average'),
('pork','Pork chops / ham',4.20,NULL,NULL,NULL,'BLS US city average'),
('turkey','Turkey',1.70,NULL,NULL,NULL,'BLS US city average'),
('shrimp','Shrimp',9.60,NULL,NULL,NULL,'National retail average'),
('salmon','Salmon fillet',10.50,NULL,NULL,NULL,'National retail average'),
('tuna-canned','Canned tuna',6.80,1.25,NULL,NULL,'National retail average'),
('fish','White fish fillet',8.75,NULL,NULL,NULL,'National retail average'),
('eggs','Grade A large eggs',2.70,0.35,NULL,NULL,'BLS US city average'),
('heavy-cream','Heavy cream',NULL,NULL,1.85,0.12,'National retail average'),
('sour-cream','Sour cream',NULL,NULL,1.30,NULL,'National retail average'),
('cream-cheese','Cream cheese',NULL,2.79,2.60,0.18,'National retail average'),
('yogurt','Yogurt',NULL,1.15,1.15,NULL,'National retail average'),
('parmesan','Parmesan cheese',9.99,NULL,2.40,0.16,'National retail average'),
('cheese','Cheddar / mozzarella cheese',6.00,NULL,1.55,NULL,'BLS US city average'),
('milk','Whole milk',NULL,NULL,0.26,NULL,'BLS US city average'),
('butter','Butter',4.65,NULL,4.65,0.29,'BLS US city average'),
('tortilla','Tortillas',NULL,0.33,NULL,NULL,'National retail average'),
('bread','Bread',1.98,0.20,NULL,NULL,'BLS US city average'),
('pasta','Pasta / spaghetti',1.45,NULL,0.38,NULL,'BLS US city average'),
('rice','White rice',1.10,NULL,0.30,NULL,'BLS US city average'),
('oats','Oats / quinoa / couscous',2.15,NULL,0.55,NULL,'National retail average'),
('flour','Flour / breadcrumbs',0.55,NULL,0.16,NULL,'BLS US city average'),
('broth','Broth or stock',NULL,NULL,0.55,NULL,'National retail average'),
('tomato-paste','Tomato paste',NULL,0.95,NULL,0.13,'National retail average'),
('canned-tomato','Canned tomatoes / sauce',NULL,1.45,0.82,NULL,'National retail average'),
('beans','Beans / chickpeas / lentils',1.75,1.05,0.80,NULL,'National retail average'),
('coconut-milk','Coconut milk',NULL,1.95,1.15,NULL,'National retail average'),
('olive-oil','Olive oil',NULL,NULL,5.20,0.33,'National retail average'),
('oil','Cooking oil',NULL,NULL,1.45,0.09,'National retail average'),
('condiment-savory','Soy sauce / vinegar / hot sauce',NULL,2.95,1.75,0.11,'National retail average'),
('honey','Honey / maple syrup',NULL,NULL,6.40,0.40,'National retail average'),
('peanut-butter','Peanut butter',2.90,NULL,4.10,0.26,'BLS US city average'),
('mayo','Mayo / mustard / ketchup',NULL,3.45,1.55,0.10,'National retail average'),
('sugar','Sugar',1.05,NULL,0.48,NULL,'BLS US city average'),
('chocolate','Chocolate / cocoa',4.40,NULL,1.85,NULL,'National retail average'),
('nuts','Nuts',7.85,NULL,2.55,NULL,'National retail average'),
('vanilla','Vanilla extract',NULL,5.99,NULL,1.10,'National retail average'),
('leaveners','Baking soda / powder / cornstarch',NULL,1.25,NULL,0.08,'National retail average'),
('spices','Dried spices and seasoning',NULL,3.19,NULL,0.44,'National retail average'),
('garlic','Garlic',3.85,0.12,NULL,NULL,'National retail average'),
('onion','Onions',1.30,0.95,0.85,NULL,'BLS US city average'),
('green-onion','Green onions',2.90,0.15,NULL,NULL,'National retail average'),
('potato','Potatoes',1.05,0.55,NULL,NULL,'BLS US city average'),
('sweet-potato','Sweet potatoes',1.45,1.05,NULL,NULL,'National retail average'),
('carrot','Carrots',1.05,0.26,NULL,NULL,'National retail average'),
('celery','Celery',1.90,0.32,NULL,NULL,'National retail average'),
('bell-pepper','Bell peppers',2.90,1.25,NULL,NULL,'National retail average'),
('mushroom','Mushrooms',3.35,NULL,1.15,NULL,'National retail average'),
('brassica','Broccoli / cauliflower / cabbage',2.40,2.20,0.88,NULL,'BLS US city average'),
('greens','Lettuce / spinach / kale',1.85,2.20,0.65,NULL,'BLS US city average'),
('squash','Zucchini / cucumber / eggplant',1.90,1.10,NULL,NULL,'National retail average'),
('tomato','Tomatoes',2.10,0.65,1.35,NULL,'BLS US city average'),
('avocado','Avocado',NULL,1.45,NULL,NULL,'National retail average'),
('citrus','Lemons and limes',NULL,0.65,NULL,NULL,'National retail average'),
('apple','Apples / pears / peaches / oranges',1.60,0.90,NULL,NULL,'BLS US city average'),
('banana','Bananas',0.64,0.28,NULL,NULL,'BLS US city average'),
('berries','Berries',4.35,3.85,2.15,NULL,'BLS US city average'),
('ginger','Fresh ginger',3.40,NULL,NULL,0.28,'National retail average'),
('fresh-herbs','Fresh herbs',NULL,1.95,1.15,0.19,'National retail average'),
('corn','Corn',NULL,0.65,0.78,NULL,'National retail average'),
('peas','Peas / green beans',1.95,1.45,0.82,NULL,'National retail average'),
('frozen','Frozen vegetables',2.40,2.85,0.88,NULL,'National retail average');