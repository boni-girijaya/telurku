drop policy if exists "reception updates deposits" on public.deposits;
drop policy if exists "reception and admin updates deposits" on public.deposits;
drop policy if exists "owner and admin updates deposits" on public.deposits;

create policy "owner and admin updates deposits"
on public.deposits
for update
to authenticated
using (public.my_role() in ('owner','admin'));
