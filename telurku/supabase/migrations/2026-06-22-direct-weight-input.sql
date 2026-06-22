alter table public.deposits
drop constraint if exists deposits_reported_pieces_check;

alter table public.deposits
add constraint deposits_reported_pieces_check check (reported_pieces >= 0);

drop policy if exists "reception manages trips" on public.pickup_trips;
drop policy if exists "reception and admin manage trips" on public.pickup_trips;
drop policy if exists "reception and admin create direct deposits" on public.deposits;

create policy "reception and admin manage trips"
on public.pickup_trips
for all
to authenticated
using (public.my_role() in ('owner','penerimaan','admin'))
with check (public.my_role() in ('owner','penerimaan','admin'));

create policy "reception and admin create direct deposits"
on public.deposits
for insert
to authenticated
with check (
  public.my_role() in ('owner','penerimaan','admin')
  and reporter_id = auth.uid()
);
