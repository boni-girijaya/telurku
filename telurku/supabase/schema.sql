create extension if not exists pgcrypto;

create type public.app_role as enum ('owner', 'kandang', 'penerimaan', 'gudang', 'admin');
create type public.cage_status as enum ('aktif', 'belum_bertelur', 'afkir', 'kosong', 'perawatan');
create type public.report_status as enum ('draft', 'waiting', 'received', 'graded', 'closed', 'cancelled');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  auth_email text unique,
  full_name text not null,
  role public.app_role not null,
  assignment text not null default 'Belum ditentukan',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.profile_passwords (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  password_text text not null check (length(password_text) >= 6),
  updated_by uuid references public.profiles(id),
  updated_at timestamptz not null default now()
);

create table public.cages (
  id bigint generated always as identity primary key,
  code text not null unique,
  name text not null,
  status public.cage_status not null default 'aktif',
  note text,
  keeper_id uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index one_cage_per_keeper on public.cages (keeper_id) where keeper_id is not null;

create table public.drivers (
  id bigint generated always as identity primary key,
  name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.pickup_trips (
  id uuid primary key default gen_random_uuid(),
  trip_date date not null default current_date,
  trip_no integer not null check (trip_no > 0),
  driver_id bigint references public.drivers(id),
  receiver_id uuid references public.profiles(id),
  status public.report_status not null default 'waiting',
  received_at timestamptz,
  created_at timestamptz not null default now(),
  unique (trip_date, trip_no)
);

create table public.deposits (
  id uuid primary key default gen_random_uuid(),
  reference_no text not null unique,
  report_date date not null default current_date,
  reported_at timestamptz not null default now(),
  cage_id bigint not null references public.cages(id),
  trip_no integer not null check (trip_no > 0),
  trip_id uuid references public.pickup_trips(id),
  reported_pieces integer not null check (reported_pieces >= 0),
  actual_pieces integer check (actual_pieces >= 0),
  net_weight_kg numeric(10,2) check (net_weight_kg > 0),
  reporter_id uuid not null references public.profiles(id),
  status public.report_status not null default 'waiting',
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.daily_gradings (
  id uuid primary key default gen_random_uuid(),
  grading_date date not null unique,
  grade_a_kg numeric(10,2) not null default 0,
  grade_b_kg numeric(10,2) not null default 0,
  grade_c_kg numeric(10,2) not null default 0,
  grade_d_kg numeric(10,2) not null default 0,
  grade_e_kg numeric(10,2) not null default 0,
  note text,
  is_closed boolean not null default false,
  author_id uuid not null references public.profiles(id),
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.app_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table public.audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid references public.profiles(id),
  action text not null,
  entity_type text not null,
  entity_id text not null,
  before_data jsonb,
  after_data jsonb,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.profile_passwords enable row level security;
alter table public.cages enable row level security;
alter table public.drivers enable row level security;
alter table public.pickup_trips enable row level security;
alter table public.deposits enable row level security;
alter table public.daily_gradings enable row level security;
alter table public.app_settings enable row level security;
alter table public.audit_logs enable row level security;

create or replace function public.my_role() returns public.app_role
language sql stable security definer set search_path = public
as $$ select role from public.profiles where id = auth.uid() and is_active = true $$;

create or replace function public.can_manage_profile_password(target_profile_id uuid) returns boolean
language sql stable security definer set search_path = public
as $$
  select case
    when public.my_role() = 'owner' then true
    when public.my_role() = 'admin' then exists (
      select 1
      from public.profiles target
      where target.id = target_profile_id
        and target.role in ('kandang', 'penerimaan', 'gudang')
        and target.is_active = true
    )
    else false
  end
$$;

create policy "active users read profiles" on public.profiles for select to authenticated using (public.my_role() is not null);
create policy "owner manages profiles" on public.profiles for all to authenticated using (public.my_role() = 'owner') with check (public.my_role() = 'owner');
create policy "admin inserts subordinate profiles" on public.profiles for insert to authenticated with check (public.my_role() = 'admin' and role in ('kandang','penerimaan','gudang'));
create policy "admin updates subordinate profiles" on public.profiles for update to authenticated using (public.my_role() = 'admin' and role in ('kandang','penerimaan','gudang')) with check (public.my_role() = 'admin' and role in ('kandang','penerimaan','gudang'));
create policy "owner and admin read managed passwords" on public.profile_passwords for select to authenticated using (public.can_manage_profile_password(profile_id));
create policy "owner and admin insert managed passwords" on public.profile_passwords for insert to authenticated with check (public.can_manage_profile_password(profile_id) and updated_by = auth.uid());
create policy "owner and admin update managed passwords" on public.profile_passwords for update to authenticated using (public.can_manage_profile_password(profile_id)) with check (public.can_manage_profile_password(profile_id) and updated_by = auth.uid());
create policy "owner deletes managed passwords" on public.profile_passwords for delete to authenticated using (public.my_role() = 'owner');
create policy "active users read cages" on public.cages for select to authenticated using (public.my_role() is not null);
create policy "owner and admin manage cages" on public.cages for all to authenticated using (public.my_role() in ('owner','admin')) with check (public.my_role() in ('owner','admin'));
create policy "operations read drivers" on public.drivers for select to authenticated using (public.my_role() in ('owner','penerimaan','admin'));
create policy "owner and admin manage drivers" on public.drivers for all to authenticated using (public.my_role() in ('owner','admin')) with check (public.my_role() in ('owner','admin'));
create policy "operations read trips" on public.pickup_trips for select to authenticated using (public.my_role() is not null);
create policy "reception and admin manage trips" on public.pickup_trips for all to authenticated using (public.my_role() in ('owner','penerimaan','admin')) with check (public.my_role() in ('owner','penerimaan','admin'));

create policy "users read allowed deposits" on public.deposits for select to authenticated using (
  public.my_role() in ('owner','penerimaan','gudang','admin') or reporter_id = auth.uid()
);
create policy "keepers create deposits" on public.deposits for insert to authenticated with check (
  public.my_role() = 'kandang' and reporter_id = auth.uid()
  and exists (select 1 from public.cages where cages.id = deposits.cage_id and cages.keeper_id = auth.uid())
);
create policy "reception and admin create direct deposits" on public.deposits for insert to authenticated with check (
  public.my_role() in ('owner','penerimaan','admin') and reporter_id = auth.uid()
);
create policy "keepers edit waiting deposits" on public.deposits for update to authenticated using (
  public.my_role() = 'kandang' and reporter_id = auth.uid() and status = 'waiting'
);
create policy "reception and admin updates deposits" on public.deposits for update to authenticated using (public.my_role() in ('owner','penerimaan','admin'));

create policy "active users read gradings" on public.daily_gradings for select to authenticated using (public.my_role() is not null);
create policy "warehouse manages gradings" on public.daily_gradings for all to authenticated using (public.my_role() in ('owner','gudang')) with check (public.my_role() in ('owner','gudang'));
create policy "active users read app settings" on public.app_settings for select to authenticated using (public.my_role() is not null);
create policy "owner manages app settings" on public.app_settings for all to authenticated using (public.my_role() = 'owner') with check (public.my_role() = 'owner');
create policy "owner reads audit" on public.audit_logs for select to authenticated using (public.my_role() = 'owner');

insert into public.cages (code, name)
select 'K' || lpad(i::text, 2, '0'), 'Kandang ' || i
from generate_series(1, 30) as i
on conflict (code) do nothing;

insert into public.drivers (name)
select name
from (values ('Budi Santoso'), ('Agus Salim'), ('Joko Susilo')) as seed(name)
where not exists (select 1 from public.drivers where drivers.name = seed.name);

insert into public.app_settings (key, value)
values ('corrections_enabled', '{"enabled": false}'::jsonb)
on conflict (key) do nothing;
