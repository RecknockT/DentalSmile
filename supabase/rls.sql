alter table public.patients enable row level security;
alter table public.appointments enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'patients'
      and policyname = 'Allow public read patients'
  ) then
    create policy "Allow public read patients"
      on public.patients
      for select
      using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'patients'
      and policyname = 'Allow public insert patients'
  ) then
    create policy "Allow public insert patients"
      on public.patients
      for insert
      with check (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'patients'
      and policyname = 'Allow public update patients'
  ) then
    create policy "Allow public update patients"
      on public.patients
      for update
      using (true)
      with check (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'patients'
      and policyname = 'Allow public delete patients'
  ) then
    create policy "Allow public delete patients"
      on public.patients
      for delete
      using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'appointments'
      and policyname = 'Allow public read appointments'
  ) then
    create policy "Allow public read appointments"
      on public.appointments
      for select
      using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'appointments'
      and policyname = 'Allow public insert appointments'
  ) then
    create policy "Allow public insert appointments"
      on public.appointments
      for insert
      with check (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'appointments'
      and policyname = 'Allow public update appointments'
  ) then
    create policy "Allow public update appointments"
      on public.appointments
      for update
      using (true)
      with check (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'appointments'
      and policyname = 'Allow public delete appointments'
  ) then
    create policy "Allow public delete appointments"
      on public.appointments
      for delete
      using (true);
  end if;
end
$$;
