drop index if exists public.one_cage_per_keeper;

update public.profiles p
set assignment = coalesce(c.assigned_cages, 'Belum ditentukan')
from (
  select keeper_id, string_agg(name, ', ' order by id) as assigned_cages
  from public.cages
  where keeper_id is not null
  group by keeper_id
) c
where p.id = c.keeper_id
  and p.role = 'kandang';

update public.profiles p
set assignment = 'Belum ditentukan'
where p.role = 'kandang'
  and not exists (
    select 1
    from public.cages c
    where c.keeper_id = p.id
  );
