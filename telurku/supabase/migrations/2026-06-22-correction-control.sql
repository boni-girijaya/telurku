create table if not exists public.app_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.app_settings enable row level security;

drop policy if exists "active users read app settings" on public.app_settings;
drop policy if exists "owner manages app settings" on public.app_settings;
drop policy if exists "reception manages trips" on public.pickup_trips;
drop policy if exists "reception and admin manage trips" on public.pickup_trips;
drop policy if exists "reception updates deposits" on public.deposits;
drop policy if exists "reception and admin updates deposits" on public.deposits;

create policy "active users read app settings"
on public.app_settings
for select
to authenticated
using (public.my_role() is not null);

create policy "owner manages app settings"
on public.app_settings
for all
to authenticated
using (public.my_role() = 'owner')
with check (public.my_role() = 'owner');

create policy "reception and admin manage trips"
on public.pickup_trips
for all
to authenticated
using (public.my_role() in ('owner','penerimaan','admin'))
with check (public.my_role() in ('owner','penerimaan','admin'));

create policy "reception and admin updates deposits"
on public.deposits
for update
to authenticated
using (public.my_role() in ('owner','penerimaan','admin'));

insert into public.app_settings (key, value)
values ('corrections_enabled', '{"enabled": false}'::jsonb)
on conflict (key) do nothing;
