create table if not exists public.patients (
  id bigint primary key,
  name text not null,
  phone text,
  treatment text not null,
  status text not null default 'Nuevo',
  created_at timestamptz not null default now()
);

create table if not exists public.appointments (
  id bigint primary key,
  patient text not null,
  hour text not null,
  date text,
  treatment text not null default 'Consulta',
  status text not null default 'Pendiente',
  created_at timestamptz not null default now()
);

alter table public.patients enable row level security;
alter table public.appointments enable row level security;

create policy if not exists "Allow public read/write for patients" on public.patients
for all using (true) with check (true);

create policy if not exists "Allow public read/write for appointments" on public.appointments
for all using (true) with check (true);
