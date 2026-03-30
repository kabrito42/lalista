-- 002: Core schema — categories, recipes, ingredients, pantry, longlist, coles preferences

-- Enable pg_trgm for fuzzy matching
create extension if not exists pg_trgm;

-- Categories
create table public.categories (
  id uuid default gen_random_uuid() primary key,
  household_id uuid not null references public.households(id) on delete cascade,
  name text not null,
  sort_order int not null default 0,
  is_default boolean not null default false,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

alter table public.categories enable row level security;

create trigger categories_updated_at
  before update on public.categories
  for each row execute function public.handle_updated_at();

-- Recipes
create table public.recipes (
  id uuid default gen_random_uuid() primary key,
  household_id uuid not null references public.households(id) on delete cascade,
  title text not null,
  servings int,
  prep_time int,
  cook_time int,
  source_url text,
  directions text,
  image_url text,
  notes text,
  ai_parsed boolean not null default false,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

alter table public.recipes enable row level security;

create trigger recipes_updated_at
  before update on public.recipes
  for each row execute function public.handle_updated_at();

-- Recipe Ingredients
create table public.recipe_ingredients (
  id uuid default gen_random_uuid() primary key,
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  text text not null,
  quantity text,
  unit text,
  coles_product text,
  sort_order int not null default 0,
  created_at timestamptz default now() not null
);

alter table public.recipe_ingredients enable row level security;

-- Pantry Items
create table public.pantry_items (
  id uuid default gen_random_uuid() primary key,
  household_id uuid not null references public.households(id) on delete cascade,
  name text not null,
  notes text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

alter table public.pantry_items enable row level security;

create trigger pantry_items_updated_at
  before update on public.pantry_items
  for each row execute function public.handle_updated_at();

-- Longlist Items
create table public.longlist_items (
  id uuid default gen_random_uuid() primary key,
  household_id uuid not null references public.households(id) on delete cascade,
  name text not null,
  category_id uuid references public.categories(id) on delete set null,
  default_qty int not null default 1,
  unit text,
  is_staple boolean not null default false,
  notes text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

alter table public.longlist_items enable row level security;

create trigger longlist_items_updated_at
  before update on public.longlist_items
  for each row execute function public.handle_updated_at();

-- Coles Preferences
create table public.coles_preferences (
  id uuid default gen_random_uuid() primary key,
  household_id uuid not null references public.households(id) on delete cascade,
  product_name text not null,
  pack_size text,
  brand text,
  last_price numeric,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

alter table public.coles_preferences enable row level security;

create trigger coles_preferences_updated_at
  before update on public.coles_preferences
  for each row execute function public.handle_updated_at();

-- Indexes for fuzzy matching
create index idx_pantry_items_name_trgm on public.pantry_items using gin (name gin_trgm_ops);
create index idx_longlist_items_name_trgm on public.longlist_items using gin (name gin_trgm_ops);
create index idx_coles_preferences_product_trgm on public.coles_preferences using gin (product_name gin_trgm_ops);
create index idx_recipe_ingredients_text_trgm on public.recipe_ingredients using gin (text gin_trgm_ops);

-- RLS helper: get current user's household_id
create or replace function public.current_household_id()
returns uuid as $$
  select household_id from public.profiles where id = auth.uid()
$$ language sql security definer stable;

-- RLS Policies: categories
create policy "Household members can read categories"
  on public.categories for select
  using (household_id = public.current_household_id());

create policy "Household members can insert categories"
  on public.categories for insert
  with check (household_id = public.current_household_id());

create policy "Household members can update categories"
  on public.categories for update
  using (household_id = public.current_household_id());

create policy "Household members can delete categories"
  on public.categories for delete
  using (household_id = public.current_household_id());

-- RLS Policies: recipes
create policy "Household members can read recipes"
  on public.recipes for select
  using (household_id = public.current_household_id());

create policy "Household members can insert recipes"
  on public.recipes for insert
  with check (household_id = public.current_household_id());

create policy "Household members can update recipes"
  on public.recipes for update
  using (household_id = public.current_household_id());

create policy "Household members can delete recipes"
  on public.recipes for delete
  using (household_id = public.current_household_id());

-- RLS Policies: recipe_ingredients (scoped via recipe's household)
create policy "Household members can read recipe ingredients"
  on public.recipe_ingredients for select
  using (
    recipe_id in (select id from public.recipes where household_id = public.current_household_id())
  );

create policy "Household members can insert recipe ingredients"
  on public.recipe_ingredients for insert
  with check (
    recipe_id in (select id from public.recipes where household_id = public.current_household_id())
  );

create policy "Household members can update recipe ingredients"
  on public.recipe_ingredients for update
  using (
    recipe_id in (select id from public.recipes where household_id = public.current_household_id())
  );

create policy "Household members can delete recipe ingredients"
  on public.recipe_ingredients for delete
  using (
    recipe_id in (select id from public.recipes where household_id = public.current_household_id())
  );

-- RLS Policies: pantry_items
create policy "Household members can read pantry items"
  on public.pantry_items for select
  using (household_id = public.current_household_id());

create policy "Household members can insert pantry items"
  on public.pantry_items for insert
  with check (household_id = public.current_household_id());

create policy "Household members can update pantry items"
  on public.pantry_items for update
  using (household_id = public.current_household_id());

create policy "Household members can delete pantry items"
  on public.pantry_items for delete
  using (household_id = public.current_household_id());

-- RLS Policies: longlist_items
create policy "Household members can read longlist items"
  on public.longlist_items for select
  using (household_id = public.current_household_id());

create policy "Household members can insert longlist items"
  on public.longlist_items for insert
  with check (household_id = public.current_household_id());

create policy "Household members can update longlist items"
  on public.longlist_items for update
  using (household_id = public.current_household_id());

create policy "Household members can delete longlist items"
  on public.longlist_items for delete
  using (household_id = public.current_household_id());

-- RLS Policies: coles_preferences
create policy "Household members can read coles preferences"
  on public.coles_preferences for select
  using (household_id = public.current_household_id());

create policy "Household members can insert coles preferences"
  on public.coles_preferences for insert
  with check (household_id = public.current_household_id());

create policy "Household members can update coles preferences"
  on public.coles_preferences for update
  using (household_id = public.current_household_id());

create policy "Household members can delete coles preferences"
  on public.coles_preferences for delete
  using (household_id = public.current_household_id());
