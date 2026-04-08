-- Seed data for local development
-- Ported from weeklyshop v1 database.py
-- This runs after migrations during `supabase db reset`

-- Create a seed household (auth user + profile created on first login via trigger)
insert into public.households (id, name) values
  ('00000000-0000-0000-0000-000000000001', 'Seed Household');

-- 16 Categories (with sort_order)
insert into public.categories (household_id, name, sort_order, is_default) values
  ('00000000-0000-0000-0000-000000000001', 'Produce', 0, true),
  ('00000000-0000-0000-0000-000000000001', 'Dairy & Eggs', 1, true),
  ('00000000-0000-0000-0000-000000000001', 'Crackers & Biscuits', 2, true),
  ('00000000-0000-0000-0000-000000000001', 'Snacks & Confectionery', 3, true),
  ('00000000-0000-0000-0000-000000000001', 'Bakery', 4, true),
  ('00000000-0000-0000-0000-000000000001', 'Beverages', 5, true),
  ('00000000-0000-0000-0000-000000000001', 'Deli & Chilled', 6, true),
  ('00000000-0000-0000-0000-000000000001', 'Frozen', 7, true),
  ('00000000-0000-0000-0000-000000000001', 'Household', 8, true),
  ('00000000-0000-0000-0000-000000000001', 'Personal Care', 9, true),
  ('00000000-0000-0000-0000-000000000001', 'Spreads & Condiments', 10, true),
  ('00000000-0000-0000-0000-000000000001', 'Soups', 11, true),
  ('00000000-0000-0000-0000-000000000001', 'Canned Food', 12, true),
  ('00000000-0000-0000-0000-000000000001', 'Breakfast & Cereals', 13, true),
  ('00000000-0000-0000-0000-000000000001', 'Pet', 14, true),
  ('00000000-0000-0000-0000-000000000001', 'Meat', 15, true);

-- 20 Pantry Items
insert into public.pantry_items (household_id, name) values
  ('00000000-0000-0000-0000-000000000001', 'salt'),
  ('00000000-0000-0000-0000-000000000001', 'pepper'),
  ('00000000-0000-0000-0000-000000000001', 'plain flour'),
  ('00000000-0000-0000-0000-000000000001', 'self-raising flour'),
  ('00000000-0000-0000-0000-000000000001', 'sugar'),
  ('00000000-0000-0000-0000-000000000001', 'brown sugar'),
  ('00000000-0000-0000-0000-000000000001', 'olive oil'),
  ('00000000-0000-0000-0000-000000000001', 'vegetable oil'),
  ('00000000-0000-0000-0000-000000000001', 'butter'),
  ('00000000-0000-0000-0000-000000000001', 'eggs'),
  ('00000000-0000-0000-0000-000000000001', 'milk'),
  ('00000000-0000-0000-0000-000000000001', 'garlic'),
  ('00000000-0000-0000-0000-000000000001', 'onion'),
  ('00000000-0000-0000-0000-000000000001', 'rice'),
  ('00000000-0000-0000-0000-000000000001', 'pasta'),
  ('00000000-0000-0000-0000-000000000001', 'soy sauce'),
  ('00000000-0000-0000-0000-000000000001', 'vinegar'),
  ('00000000-0000-0000-0000-000000000001', 'baking powder'),
  ('00000000-0000-0000-0000-000000000001', 'bicarbonate of soda'),
  ('00000000-0000-0000-0000-000000000001', 'vanilla extract');

-- ~54 Longlist Items (with category references via subselect)
insert into public.longlist_items (household_id, name, category_id, default_qty, unit, is_staple) values
  ('00000000-0000-0000-0000-000000000001', 'Applaws Natural Wet Cat Food Chicken Breast 70g', (select id from public.categories where name = 'Pet' and household_id = '00000000-0000-0000-0000-000000000001'), 1, 'pack', false),
  ('00000000-0000-0000-0000-000000000001', 'Arnott''s Jatz Original Crackers 225g', (select id from public.categories where name = 'Crackers & Biscuits' and household_id = '00000000-0000-0000-0000-000000000001'), 1, 'pack', true),
  ('00000000-0000-0000-0000-000000000001', 'Arnott''s Scotch Finger Biscuits 250g', (select id from public.categories where name = 'Crackers & Biscuits' and household_id = '00000000-0000-0000-0000-000000000001'), 1, 'pack', true),
  ('00000000-0000-0000-0000-000000000001', 'Arnott''s Shapes Vegemite & Cheese 175g', (select id from public.categories where name = 'Crackers & Biscuits' and household_id = '00000000-0000-0000-0000-000000000001'), 1, 'pack', true),
  ('00000000-0000-0000-0000-000000000001', 'Bakers Delight Vegemite and Cheese Scroll', (select id from public.categories where name = 'Bakery' and household_id = '00000000-0000-0000-0000-000000000001'), 1, 'each', true),
  ('00000000-0000-0000-0000-000000000001', 'Bonne Maman Raspberry Conserve 370g', (select id from public.categories where name = 'Spreads & Condiments' and household_id = '00000000-0000-0000-0000-000000000001'), 1, 'jar', false),
  ('00000000-0000-0000-0000-000000000001', 'Bonne Maman Strawberry Conserve 370g', (select id from public.categories where name = 'Spreads & Condiments' and household_id = '00000000-0000-0000-0000-000000000001'), 1, 'jar', false),
  ('00000000-0000-0000-0000-000000000001', 'Cadbury Crunchie Chocolate Block 180g', (select id from public.categories where name = 'Snacks & Confectionery' and household_id = '00000000-0000-0000-0000-000000000001'), 1, 'block', false),
  ('00000000-0000-0000-0000-000000000001', 'Campbell''s Soup Sensations Pumpkin 500ml', (select id from public.categories where name = 'Soups' and household_id = '00000000-0000-0000-0000-000000000001'), 1, 'can', false),
  ('00000000-0000-0000-0000-000000000001', 'Coca-Cola Zero Sugar 10x375ml Cans', (select id from public.categories where name = 'Beverages' and household_id = '00000000-0000-0000-0000-000000000001'), 1, 'pack', false),
  ('00000000-0000-0000-0000-000000000001', 'Coles Baked Sweet Chilli Chips 100g', (select id from public.categories where name = 'Snacks & Confectionery' and household_id = '00000000-0000-0000-0000-000000000001'), 1, 'bag', true),
  ('00000000-0000-0000-0000-000000000001', 'Coles Cheese Cranberry & Sunflower Seed Crackers 100g', (select id from public.categories where name = 'Crackers & Biscuits' and household_id = '00000000-0000-0000-0000-000000000001'), 1, 'pack', true),
  ('00000000-0000-0000-0000-000000000001', 'Coles Free Range Eggs 12pk', (select id from public.categories where name = 'Dairy & Eggs' and household_id = '00000000-0000-0000-0000-000000000001'), 1, 'dozen', true),
  ('00000000-0000-0000-0000-000000000001', 'Coles Garlic Loose', (select id from public.categories where name = 'Produce' and household_id = '00000000-0000-0000-0000-000000000001'), 1, 'each', true),
  ('00000000-0000-0000-0000-000000000001', 'Coles Iceberg Lettuce Each', (select id from public.categories where name = 'Produce' and household_id = '00000000-0000-0000-0000-000000000001'), 1, 'each', true),
  ('00000000-0000-0000-0000-000000000001', 'Coles Lebanese Cucumber Each', (select id from public.categories where name = 'Produce' and household_id = '00000000-0000-0000-0000-000000000001'), 2, 'each', true),
  ('00000000-0000-0000-0000-000000000001', 'Coles Lemon Barley Cordial 750ml', (select id from public.categories where name = 'Beverages' and household_id = '00000000-0000-0000-0000-000000000001'), 1, 'bottle', false),
  ('00000000-0000-0000-0000-000000000001', 'Coles Mini Wraps 8pk', (select id from public.categories where name = 'Bakery' and household_id = '00000000-0000-0000-0000-000000000001'), 1, 'pack', true),
  ('00000000-0000-0000-0000-000000000001', 'Coles William Bartlett Pears Medium x 3', (select id from public.categories where name = 'Produce' and household_id = '00000000-0000-0000-0000-000000000001'), 1, 'pack', false),
  ('00000000-0000-0000-0000-000000000001', 'Coles Imported Mandarins x 4', (select id from public.categories where name = 'Produce' and household_id = '00000000-0000-0000-0000-000000000001'), 1, 'pack', false),
  ('00000000-0000-0000-0000-000000000001', 'Coles Strawberries 250g', (select id from public.categories where name = 'Produce' and household_id = '00000000-0000-0000-0000-000000000001'), 1, 'punnet', false),
  ('00000000-0000-0000-0000-000000000001', 'Coles Raspberries 170g', (select id from public.categories where name = 'Produce' and household_id = '00000000-0000-0000-0000-000000000001'), 1, 'punnet', false),
  ('00000000-0000-0000-0000-000000000001', 'Coles White Seedless Grapes approx 1kg', (select id from public.categories where name = 'Produce' and household_id = '00000000-0000-0000-0000-000000000001'), 1, 'bag', false),
  ('00000000-0000-0000-0000-000000000001', 'Coles No Fat Skim Milk 2L', (select id from public.categories where name = 'Dairy & Eggs' and household_id = '00000000-0000-0000-0000-000000000001'), 1, 'bottle', true),
  ('00000000-0000-0000-0000-000000000001', 'Coles Paper Towel 2pk', (select id from public.categories where name = 'Household' and household_id = '00000000-0000-0000-0000-000000000001'), 1, 'pack', true),
  ('00000000-0000-0000-0000-000000000001', 'Coles Pretzels Salted 200g', (select id from public.categories where name = 'Snacks & Confectionery' and household_id = '00000000-0000-0000-0000-000000000001'), 1, 'bag', false),
  ('00000000-0000-0000-0000-000000000001', 'Coles Red Capsicum Each', (select id from public.categories where name = 'Produce' and household_id = '00000000-0000-0000-0000-000000000001'), 1, 'each', false),
  ('00000000-0000-0000-0000-000000000001', 'Coles Sea Salt Caramel Popcorn 100g', (select id from public.categories where name = 'Snacks & Confectionery' and household_id = '00000000-0000-0000-0000-000000000001'), 1, 'bag', false),
  ('00000000-0000-0000-0000-000000000001', 'Coles Shredded Mozzarella Cheese 250g', (select id from public.categories where name = 'Dairy & Eggs' and household_id = '00000000-0000-0000-0000-000000000001'), 1, 'pack', true),
  ('00000000-0000-0000-0000-000000000001', 'Coles Shredded Parmesan 100g', (select id from public.categories where name = 'Dairy & Eggs' and household_id = '00000000-0000-0000-0000-000000000001'), 1, 'pack', true),
  ('00000000-0000-0000-0000-000000000001', 'Coles Shredded Tasty Cheese 250g', (select id from public.categories where name = 'Dairy & Eggs' and household_id = '00000000-0000-0000-0000-000000000001'), 1, 'pack', true),
  ('00000000-0000-0000-0000-000000000001', 'Coles Sour Worms 200g', (select id from public.categories where name = 'Snacks & Confectionery' and household_id = '00000000-0000-0000-0000-000000000001'), 1, 'bag', false),
  ('00000000-0000-0000-0000-000000000001', 'Coles Straight Cut Chips 1kg', (select id from public.categories where name = 'Frozen' and household_id = '00000000-0000-0000-0000-000000000001'), 1, 'bag', false),
  ('00000000-0000-0000-0000-000000000001', 'Coles Tasty Cheese Snack Cubes 175g', (select id from public.categories where name = 'Dairy & Eggs' and household_id = '00000000-0000-0000-0000-000000000001'), 1, 'pack', true),
  ('00000000-0000-0000-0000-000000000001', 'Coles Tomatoes 6pk', (select id from public.categories where name = 'Produce' and household_id = '00000000-0000-0000-0000-000000000001'), 1, 'pack', true),
  ('00000000-0000-0000-0000-000000000001', 'Coles Water Crackers Original 125g', (select id from public.categories where name = 'Crackers & Biscuits' and household_id = '00000000-0000-0000-0000-000000000001'), 1, 'pack', false),
  ('00000000-0000-0000-0000-000000000001', 'Palmolive Naturals Body Wash Pomegranate Mango 500ml', (select id from public.categories where name = 'Personal Care' and household_id = '00000000-0000-0000-0000-000000000001'), 1, 'bottle', false),
  ('00000000-0000-0000-0000-000000000001', 'Pantene Pro-V Classic Clean Shampoo 900ml', (select id from public.categories where name = 'Personal Care' and household_id = '00000000-0000-0000-0000-000000000001'), 1, 'bottle', false),
  ('00000000-0000-0000-0000-000000000001', 'Pantene Conditioner Classic Clean 800ml', (select id from public.categories where name = 'Personal Care' and household_id = '00000000-0000-0000-0000-000000000001'), 1, 'bottle', false),
  ('00000000-0000-0000-0000-000000000001', 'Heidi Farm Cave Aged Cheddar 150g', (select id from public.categories where name = 'Dairy & Eggs' and household_id = '00000000-0000-0000-0000-000000000001'), 1, 'pack', true),
  ('00000000-0000-0000-0000-000000000001', 'Heinz Baked Beans in Tomato Sauce 3 Pack', (select id from public.categories where name = 'Canned Food' and household_id = '00000000-0000-0000-0000-000000000001'), 1, 'pack', true),
  ('00000000-0000-0000-0000-000000000001', 'Laughing Cow Original Spreadable Cheese Triangles 6pk', (select id from public.categories where name = 'Dairy & Eggs' and household_id = '00000000-0000-0000-0000-000000000001'), 1, 'pack', false),
  ('00000000-0000-0000-0000-000000000001', 'Macro Organic Carbonara Bites 200g', (select id from public.categories where name = 'Deli & Chilled' and household_id = '00000000-0000-0000-0000-000000000001'), 1, 'pack', false),
  ('00000000-0000-0000-0000-000000000001', 'Nutella Hazelnut Spread 400g', (select id from public.categories where name = 'Spreads & Condiments' and household_id = '00000000-0000-0000-0000-000000000001'), 1, 'jar', false),
  ('00000000-0000-0000-0000-000000000001', 'Peckish Caramelised Onion & Balsamic Vinegar Rice Crackers 90g', (select id from public.categories where name = 'Crackers & Biscuits' and household_id = '00000000-0000-0000-0000-000000000001'), 1, 'pack', false),
  ('00000000-0000-0000-0000-000000000001', 'Don Artusi Australian Prosciutto 80g', (select id from public.categories where name = 'Deli & Chilled' and household_id = '00000000-0000-0000-0000-000000000001'), 1, 'pack', false),
  ('00000000-0000-0000-0000-000000000001', 'Don Artusi Hungarian Mild Traditional Style 100g', (select id from public.categories where name = 'Deli & Chilled' and household_id = '00000000-0000-0000-0000-000000000001'), 1, 'pack', false),
  ('00000000-0000-0000-0000-000000000001', 'Don Artusi Melosi Smokehouse Leg Ham 100g', (select id from public.categories where name = 'Deli & Chilled' and household_id = '00000000-0000-0000-0000-000000000001'), 1, 'pack', false),
  ('00000000-0000-0000-0000-000000000001', 'Quilton 3 Ply White Toilet Tissue 12pk', (select id from public.categories where name = 'Household' and household_id = '00000000-0000-0000-0000-000000000001'), 1, 'pack', true),
  ('00000000-0000-0000-0000-000000000001', 'Ribena Blackcurrant Cordial 500ml', (select id from public.categories where name = 'Beverages' and household_id = '00000000-0000-0000-0000-000000000001'), 1, 'bottle', false),
  ('00000000-0000-0000-0000-000000000001', 'Sanitarium Peanut Butter Smooth 500g', (select id from public.categories where name = 'Spreads & Condiments' and household_id = '00000000-0000-0000-0000-000000000001'), 1, 'jar', false),
  ('00000000-0000-0000-0000-000000000001', 'Streets Paddle Pop Rainbow 10pk', (select id from public.categories where name = 'Frozen' and household_id = '00000000-0000-0000-0000-000000000001'), 1, 'pack', false),
  ('00000000-0000-0000-0000-000000000001', 'Weetabix Chocolate Cereal 600g', (select id from public.categories where name = 'Breakfast & Cereals' and household_id = '00000000-0000-0000-0000-000000000001'), 1, 'box', false),
  ('00000000-0000-0000-0000-000000000001', 'Weetabix Chocolate Chip Cereal Bars 6pk', (select id from public.categories where name = 'Breakfast & Cereals' and household_id = '00000000-0000-0000-0000-000000000001'), 1, 'pack', false);

-- ======================================================================
-- Extended seed data for test coverage (Story 1.6)
-- ======================================================================

-- 8 Recipes with realistic Australian meals
insert into public.recipes (id, household_id, title, servings, prep_time, cook_time, source_url, directions, notes) values
  ('00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000001', 'Spaghetti Bolognese', 4, 15, 45, null, 'Brown mince with onion and garlic. Add tomatoes and simmer. Cook pasta.', 'Family classic'),
  ('00000000-0000-0000-0000-000000000102', '00000000-0000-0000-0000-000000000001', 'Chicken Stir Fry', 4, 20, 15, null, 'Slice chicken and veg. Stir-fry in wok with soy and sesame.', 'Quick weeknight meal'),
  ('00000000-0000-0000-0000-000000000103', '00000000-0000-0000-0000-000000000001', 'Fish Tacos', 3, 15, 10, null, 'Pan-fry fish fillets, shred lettuce, assemble in wraps with lime crema.', null),
  ('00000000-0000-0000-0000-000000000104', '00000000-0000-0000-0000-000000000001', 'Lamb Chops with Mash', 2, 10, 25, null, 'Season and grill lamb chops. Boil and mash potatoes with butter.', null),
  ('00000000-0000-0000-0000-000000000105', '00000000-0000-0000-0000-000000000001', 'Caesar Salad', 2, 15, 0, null, 'Tear cos lettuce, add croutons, parmesan, bacon, and dressing.', 'Good for lunch'),
  ('00000000-0000-0000-0000-000000000106', '00000000-0000-0000-0000-000000000001', 'Beef Tacos', 4, 10, 20, null, 'Brown beef mince with spices. Serve in taco shells with toppings.', null),
  ('00000000-0000-0000-0000-000000000107', '00000000-0000-0000-0000-000000000001', 'Fried Rice', 4, 10, 15, null, 'Fry rice with egg, vegetables, soy sauce.', 'Use day-old rice'),
  ('00000000-0000-0000-0000-000000000108', '00000000-0000-0000-0000-000000000001', 'Pancakes', 4, 5, 15, null, 'Mix flour, eggs, milk. Cook on griddle until golden.', 'Weekend breakfast');

-- Recipe ingredients (includes pantry overlaps for exclusion testing, and cross-recipe duplicates for dedup testing)
insert into public.recipe_ingredients (recipe_id, text, quantity, unit, coles_product, sort_order) values
  -- Spaghetti Bolognese
  ('00000000-0000-0000-0000-000000000101', 'Beef mince', 500, 'g', 'Coles Beef Mince 500g', 1),
  ('00000000-0000-0000-0000-000000000101', 'Onion', 1, 'each', null, 2),
  ('00000000-0000-0000-0000-000000000101', 'Garlic', 3, 'cloves', null, 3),
  ('00000000-0000-0000-0000-000000000101', 'Canned tomatoes', 2, 'cans', 'Coles Diced Tomatoes 400g', 4),
  ('00000000-0000-0000-0000-000000000101', 'Spaghetti', 400, 'g', 'Coles Spaghetti 500g', 5),
  ('00000000-0000-0000-0000-000000000101', 'Olive oil', 2, 'tbsp', null, 6),
  -- Chicken Stir Fry
  ('00000000-0000-0000-0000-000000000102', 'Chicken breast', 500, 'g', 'Coles RSPCA Chicken Breast 500g', 1),
  ('00000000-0000-0000-0000-000000000102', 'Broccoli', 1, 'head', null, 2),
  ('00000000-0000-0000-0000-000000000102', 'Capsicum', 1, 'each', 'Coles Red Capsicum Each', 3),
  ('00000000-0000-0000-0000-000000000102', 'Soy sauce', 3, 'tbsp', null, 4),
  ('00000000-0000-0000-0000-000000000102', 'Sesame oil', 1, 'tbsp', null, 5),
  ('00000000-0000-0000-0000-000000000102', 'Rice', 2, 'cups', null, 6),
  -- Fish Tacos
  ('00000000-0000-0000-0000-000000000103', 'White fish fillets', 400, 'g', 'Coles Barramundi Fillets 400g', 1),
  ('00000000-0000-0000-0000-000000000103', 'Mini wraps', 1, 'pack', 'Coles Mini Wraps 8pk', 2),
  ('00000000-0000-0000-0000-000000000103', 'Lettuce', 1, 'each', 'Coles Iceberg Lettuce Each', 3),
  ('00000000-0000-0000-0000-000000000103', 'Lime', 2, 'each', null, 4),
  ('00000000-0000-0000-0000-000000000103', 'Sour cream', 1, 'tub', null, 5),
  -- Lamb Chops with Mash
  ('00000000-0000-0000-0000-000000000104', 'Lamb chops', 4, 'each', null, 1),
  ('00000000-0000-0000-0000-000000000104', 'Potatoes', 4, 'each', null, 2),
  ('00000000-0000-0000-0000-000000000104', 'Butter', 2, 'tbsp', null, 3),
  ('00000000-0000-0000-0000-000000000104', 'Milk', 100, 'ml', null, 4),
  -- Caesar Salad
  ('00000000-0000-0000-0000-000000000105', 'Cos lettuce', 1, 'each', null, 1),
  ('00000000-0000-0000-0000-000000000105', 'Bacon rashers', 4, 'each', null, 2),
  ('00000000-0000-0000-0000-000000000105', 'Parmesan', 50, 'g', 'Coles Shredded Parmesan 100g', 3),
  ('00000000-0000-0000-0000-000000000105', 'Croutons', 1, 'pack', null, 4),
  ('00000000-0000-0000-0000-000000000105', 'Eggs', 2, 'each', null, 5),
  -- Beef Tacos
  ('00000000-0000-0000-0000-000000000106', 'Beef mince', 500, 'g', 'Coles Beef Mince 500g', 1),
  ('00000000-0000-0000-0000-000000000106', 'Taco shells', 1, 'pack', null, 2),
  ('00000000-0000-0000-0000-000000000106', 'Lettuce', 1, 'each', 'Coles Iceberg Lettuce Each', 3),
  ('00000000-0000-0000-0000-000000000106', 'Tomatoes', 2, 'each', null, 4),
  ('00000000-0000-0000-0000-000000000106', 'Sour cream', 1, 'tub', null, 5),
  ('00000000-0000-0000-0000-000000000106', 'Onion', 1, 'each', null, 6),
  -- Fried Rice
  ('00000000-0000-0000-0000-000000000107', 'Rice', 3, 'cups', null, 1),
  ('00000000-0000-0000-0000-000000000107', 'Eggs', 3, 'each', null, 2),
  ('00000000-0000-0000-0000-000000000107', 'Frozen peas', 1, 'cup', null, 3),
  ('00000000-0000-0000-0000-000000000107', 'Soy sauce', 2, 'tbsp', null, 4),
  ('00000000-0000-0000-0000-000000000107', 'Sesame oil', 1, 'tsp', null, 5),
  -- Pancakes
  ('00000000-0000-0000-0000-000000000108', 'Plain flour', 1, 'cup', null, 1),
  ('00000000-0000-0000-0000-000000000108', 'Eggs', 2, 'each', null, 2),
  ('00000000-0000-0000-0000-000000000108', 'Milk', 250, 'ml', null, 3),
  ('00000000-0000-0000-0000-000000000108', 'Butter', 2, 'tbsp', null, 4),
  ('00000000-0000-0000-0000-000000000108', 'Maple syrup', 1, 'bottle', null, 5);

-- 8 Coles Preferences
insert into public.coles_preferences (household_id, product_name, pack_size, brand) values
  ('00000000-0000-0000-0000-000000000001', 'Coles Beef Mince 500g', '500g', 'Coles'),
  ('00000000-0000-0000-0000-000000000001', 'Coles RSPCA Chicken Breast 500g', '500g', 'Coles'),
  ('00000000-0000-0000-0000-000000000001', 'Coles Barramundi Fillets 400g', '400g', 'Coles'),
  ('00000000-0000-0000-0000-000000000001', 'Coles Diced Tomatoes 400g', '400g', 'Coles'),
  ('00000000-0000-0000-0000-000000000001', 'Coles Spaghetti 500g', '500g', 'Coles'),
  ('00000000-0000-0000-0000-000000000001', 'Coles Red Capsicum Each', null, 'Coles'),
  ('00000000-0000-0000-0000-000000000001', 'Coles Iceberg Lettuce Each', null, 'Coles'),
  ('00000000-0000-0000-0000-000000000001', 'Coles Shredded Parmesan 100g', '100g', 'Coles');

-- 3 Weekly Sessions at different statuses
-- Session 1: draft (fresh, no data)
insert into public.weekly_sessions (id, household_id, session_date, status) values
  ('00000000-0000-0000-0000-000000000201', '00000000-0000-0000-0000-000000000001', '2026-04-07', 'draft');

-- Session 2: review (with populated JSONB fields)
insert into public.weekly_sessions (id, household_id, session_date, status, meal_ingredients, confirmed_other_items, final_list, pantry_exclusions, dropped_duplicates) values
  ('00000000-0000-0000-0000-000000000202', '00000000-0000-0000-0000-000000000001', '2026-03-31', 'review',
   '[{"name":"Beef mince","quantity":500,"unit":"g","source":"meal","coles_product":"Coles Beef Mince 500g"},{"name":"Canned tomatoes","quantity":2,"unit":"cans","source":"meal","coles_product":"Coles Diced Tomatoes 400g"},{"name":"Spaghetti","quantity":400,"unit":"g","source":"meal"},{"name":"Onion","quantity":1,"unit":"each","source":"meal"},{"name":"Garlic","quantity":3,"unit":"cloves","source":"meal"},{"name":"Chicken breast","quantity":500,"unit":"g","source":"meal","coles_product":"Coles RSPCA Chicken Breast 500g"},{"name":"Broccoli","quantity":1,"unit":"head","source":"meal"},{"name":"Capsicum","quantity":1,"unit":"each","source":"meal","coles_product":"Coles Red Capsicum Each"}]',
   '[{"name":"Coles Iceberg Lettuce Each","quantity":1,"unit":"each","source":"other_items","category":"Produce"},{"name":"Coles Free Range Eggs 12pk","quantity":1,"unit":"dozen","source":"other_items","category":"Dairy & Eggs"},{"name":"Coles No Fat Skim Milk 2L","quantity":1,"unit":"bottle","source":"other_items","category":"Dairy & Eggs"}]',
   '[{"name":"Beef mince","quantity":500,"unit":"g","source":"meal","coles_product":"Coles Beef Mince 500g"},{"name":"Canned tomatoes","quantity":2,"unit":"cans","source":"meal","coles_product":"Coles Diced Tomatoes 400g"},{"name":"Spaghetti","quantity":400,"unit":"g","source":"meal"},{"name":"Chicken breast","quantity":500,"unit":"g","source":"meal","coles_product":"Coles RSPCA Chicken Breast 500g"},{"name":"Broccoli","quantity":1,"unit":"head","source":"meal"},{"name":"Capsicum","quantity":1,"unit":"each","source":"meal","coles_product":"Coles Red Capsicum Each"},{"name":"Coles Iceberg Lettuce Each","quantity":1,"unit":"each","source":"other_items","category":"Produce"},{"name":"Coles Free Range Eggs 12pk","quantity":1,"unit":"dozen","source":"other_items","category":"Dairy & Eggs"},{"name":"Coles No Fat Skim Milk 2L","quantity":1,"unit":"bottle","source":"other_items","category":"Dairy & Eggs"}]',
   '["Onion","Garlic"]',
   '[]');

-- Session 3: dispatched (complete)
insert into public.weekly_sessions (id, household_id, session_date, status, coles_dispatched, final_list) values
  ('00000000-0000-0000-0000-000000000203', '00000000-0000-0000-0000-000000000001', '2026-03-24', 'dispatched', true,
   '[{"name":"Chicken breast","quantity":500,"unit":"g","source":"meal","category":"Meat"},{"name":"Broccoli","quantity":1,"unit":"head","source":"meal","category":"Produce"},{"name":"Coles Iceberg Lettuce Each","quantity":1,"unit":"each","source":"other_items","category":"Produce"},{"name":"Coles Free Range Eggs 12pk","quantity":1,"unit":"dozen","source":"other_items","category":"Dairy & Eggs"}]');

-- Weekly meals linking review session to recipes
insert into public.weekly_meals (session_id, recipe_id) values
  ('00000000-0000-0000-0000-000000000202', '00000000-0000-0000-0000-000000000101'),
  ('00000000-0000-0000-0000-000000000202', '00000000-0000-0000-0000-000000000102');

-- Automation logs for the dispatched session
insert into public.automation_logs (session_id, message, log_type) values
  ('00000000-0000-0000-0000-000000000203', 'Starting Coles automation for session 2026-03-24', 'info'),
  ('00000000-0000-0000-0000-000000000203', 'Logged in to Coles Online successfully', 'info'),
  ('00000000-0000-0000-0000-000000000203', 'Added 4 items to cart', 'info'),
  ('00000000-0000-0000-0000-000000000203', 'Could not find exact match for "Broccoli" — selected closest alternative', 'warning'),
  ('00000000-0000-0000-0000-000000000203', 'Order placed successfully — delivery window: 2026-03-25 10:00-12:00', 'info');
