drop policy if exists "warehouse manages gradings" on public.daily_gradings;

create policy "warehouse manages gradings"
on public.daily_gradings
for all
to authenticated
using (public.my_role() in ('owner','admin','gudang'))
with check (public.my_role() in ('owner','admin','gudang'));
