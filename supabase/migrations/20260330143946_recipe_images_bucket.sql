-- Create a public storage bucket for recipe images
insert into storage.buckets (id, name, public)
values ('recipe-images', 'recipe-images', true)
on conflict (id) do nothing;

-- Allow authenticated users to upload recipe images
create policy "Authenticated users can upload recipe images"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'recipe-images');

-- Allow anyone to read recipe images (public bucket)
create policy "Anyone can read recipe images"
  on storage.objects for select
  using (bucket_id = 'recipe-images');

-- Allow authenticated users to update their uploads
create policy "Authenticated users can update recipe images"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'recipe-images');

-- Allow authenticated users to delete recipe images
create policy "Authenticated users can delete recipe images"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'recipe-images');
