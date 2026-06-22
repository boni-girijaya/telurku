insert into public.drivers (name)
select name
from (values ('Budi Santoso'), ('Agus Salim'), ('Joko Susilo')) as seed(name)
where not exists (select 1 from public.drivers where drivers.name = seed.name);

update public.cages c
set keeper_id = p.id,
    updated_at = now()
from public.profiles p
where p.role = 'kandang'
  and p.is_active = true
  and p.assignment = c.name
  and c.keeper_id is distinct from p.id;
