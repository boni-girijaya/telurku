drop index if exists public.one_cage_per_keeper;

create table if not exists public.cage_assignments (
  cage_id bigint not null references public.cages(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (cage_id, profile_id)
);

alter table public.cage_assignments enable row level security;

drop policy if exists "active users read cage assignments" on public.cage_assignments;
drop policy if exists "owner and admin manage cage assignments" on public.cage_assignments;
drop policy if exists "keepers create deposits" on public.deposits;

create policy "active users read cage assignments"
on public.cage_assignments
for select
to authenticated
using (public.my_role() is not null);

create policy "owner and admin manage cage assignments"
on public.cage_assignments
for all
to authenticated
using (public.my_role() in ('owner','admin'))
with check (public.my_role() in ('owner','admin'));

create policy "keepers create deposits"
on public.deposits
for insert
to authenticated
with check (
  public.my_role() = 'kandang'
  and reporter_id = auth.uid()
  and exists (
    select 1
    from public.cage_assignments
    where cage_assignments.cage_id = deposits.cage_id
      and cage_assignments.profile_id = auth.uid()
  )
);

insert into public.cage_assignments (cage_id, profile_id)
select id, keeper_id
from public.cages
where keeper_id is not null
on conflict do nothing;

update public.profiles p
set assignment = coalesce(c.assigned_cages, 'Belum ditentukan')
from (
  select ca.profile_id, string_agg(c.name, ', ' order by c.id) as assigned_cages
  from public.cage_assignments ca
  join public.cages c on c.id = ca.cage_id
  group by ca.profile_id
) c
where p.id = c.profile_id
  and p.role = 'kandang';

update public.profiles p
set assignment = 'Belum ditentukan'
where p.role = 'kandang'
  and not exists (
    select 1
    from public.cage_assignments ca
    where ca.profile_id = p.id
  );
