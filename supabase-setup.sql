-- Jerovia Store · Setup para Supabase
-- Ejecutar en: Supabase dashboard → SQL Editor → New query → Run
-- 1) crea la tabla de productos  2) activa seguridad  3) crea el storage de imágenes

-- ---------- Tabla de productos ----------
create table if not exists public.products (
  id text primary key,
  name text not null,
  category text not null,
  brand text not null default '',
  price numeric not null default 0,
  emoji text not null default '🛍️',
  image text not null default '',
  note text not null default '',
  stock integer not null default 0,
  created_at timestamptz not null default now()
);

-- ---------- Seguridad (RLS) ----------
alter table public.products enable row level security;

-- Cualquiera puede leer los productos (la web pública)
drop policy if exists "read publico" on public.products;
create policy "read publico" on public.products
  for select using (true);

-- Solo usuarios logueados (el cliente en /admin.html) pueden escribir
drop policy if exists "admin escribe" on public.products;
create policy "admin escribe" on public.products
  for all to authenticated using (true) with check (true);

-- ---------- Storage para imágenes ----------
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

-- Leer imágenes: público
drop policy if exists "read imgs publicas" on storage.objects;
create policy "read imgs publicas" on storage.objects
  for select using (bucket_id = 'product-images');

-- Subir / editar / borrar imágenes: solo logueado
drop policy if exists "admin sube imagenes" on storage.objects;
create policy "admin sube imagenes" on storage.objects
  for insert to authenticated with check (bucket_id = 'product-images');

drop policy if exists "admin edita imagenes" on storage.objects;
create policy "admin edita imagenes" on storage.objects
  for update to authenticated using (bucket_id = 'product-images');

drop policy if exists "admin borra imagenes" on storage.objects;
create policy "admin borra imagenes" on storage.objects
  for delete to authenticated using (bucket_id = 'product-images');

-- ---------- Configuración de la web (moneda y cotización) ----------
create table if not exists public.settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.settings enable row level security;

-- Cualquiera puede leer la configuración (la web pública)
drop policy if exists "read settings publico" on public.settings;
create policy "read settings publico" on public.settings
  for select using (true);

-- Solo usuarios logueados (el cliente en /admin.html) pueden cambiarla
drop policy if exists "admin edita settings" on public.settings;
create policy "admin edita settings" on public.settings
  for all to authenticated using (true) with check (true);

insert into public.settings (key, value)
values ('store_config', '{"currency":"ARS","rate":1400}'::jsonb)
on conflict (key) do nothing;
