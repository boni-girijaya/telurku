alter type public.app_role add value if not exists 'kepala_kandang';

create or replace function public.can_manage_profile_password(target_profile_id uuid) returns boolean
language sql stable security definer set search_path = public
as $$
  select case
    when public.my_role()::text = 'owner' then true
    when public.my_role()::text = 'admin' then exists (
      select 1
      from public.profiles target
      where target.id = target_profile_id
        and target.role::text in ('kandang', 'kepala_kandang', 'penerimaan', 'gudang')
        and target.is_active = true
    )
    else false
  end
$$;

drop policy if exists "admin inserts subordinate profiles" on public.profiles;
drop policy if exists "admin updates subordinate profiles" on public.profiles;
drop policy if exists "operations read drivers" on public.drivers;
drop policy if exists "users read allowed deposits" on public.deposits;
drop policy if exists "owner and admin updates deposits" on public.deposits;
drop policy if exists "reception receives waiting deposits" on public.deposits;

create policy "admin inserts subordinate profiles"
on public.profiles
for insert
to authenticated
with check (
  public.my_role()::text = 'admin'
  and role::text in ('kandang', 'kepala_kandang', 'penerimaan', 'gudang')
);

create policy "admin updates subordinate profiles"
on public.profiles
for update
to authenticated
using (
  public.my_role()::text = 'admin'
  and role::text in ('kandang', 'kepala_kandang', 'penerimaan', 'gudang')
)
with check (
  public.my_role()::text = 'admin'
  and role::text in ('kandang', 'kepala_kandang', 'penerimaan', 'gudang')
);

create policy "operations read drivers"
on public.drivers
for select
to authenticated
using (public.my_role()::text in ('owner', 'kepala_kandang', 'penerimaan', 'admin'));

create policy "users read allowed deposits"
on public.deposits
for select
to authenticated
using (
  public.my_role()::text in ('owner', 'kepala_kandang', 'penerimaan', 'gudang', 'admin')
  or reporter_id = auth.uid()
);

create policy "owner and admin updates deposits"
on public.deposits
for update
to authenticated
using (public.my_role()::text in ('owner', 'admin'))
with check (public.my_role()::text in ('owner', 'admin'));

create policy "reception receives waiting deposits"
on public.deposits
for update
to authenticated
using (public.my_role()::text in ('owner', 'penerimaan') and status = 'waiting')
with check (public.my_role()::text in ('owner', 'penerimaan') and status = 'received');
