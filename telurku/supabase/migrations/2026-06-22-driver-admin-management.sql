drop policy if exists "owner manages drivers" on public.drivers;
drop policy if exists "owner and admin manage drivers" on public.drivers;

create policy "owner and admin manage drivers"
on public.drivers
for all
to authenticated
using (public.my_role() in ('owner','admin'))
with check (public.my_role() in ('owner','admin'));
