alter table public.profiles
  add column if not exists auth_email text unique,
  add column if not exists assignment text not null default 'Belum ditentukan';
