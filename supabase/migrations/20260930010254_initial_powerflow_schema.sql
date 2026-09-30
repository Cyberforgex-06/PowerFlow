create extension if not exists pgcrypto;

create type public.app_role as enum ('customer','admin');
create type public.meter_status as enum ('active','inactive','suspended');
create type public.bill_status as enum ('pending','paid','overdue','cancelled');
create type public.payment_status as enum ('pending','successful','failed','refunded');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null check (char_length(full_name) between 2 and 120),
  email text,
  phone text,
  role public.app_role not null default 'customer',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.meters (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.profiles(id) on delete cascade,
  meter_number text not null unique,
  meter_type text not null default 'prepaid' check (meter_type in ('prepaid','postpaid')),
  status public.meter_status not null default 'active',
  address text,
  created_at timestamptz not null default now()
);

create table public.tariffs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  rate_per_kwh numeric(12,2) not null check (rate_per_kwh >= 0),
  fixed_charge numeric(12,2) not null default 0 check (fixed_charge >= 0),
  tax_rate numeric(7,4) not null default 0 check (tax_rate >= 0),
  effective_from date not null,
  effective_to date,
  active boolean not null default true,
  check (effective_to is null or effective_to >= effective_from)
);

create table public.meter_readings (
  id uuid primary key default gen_random_uuid(),
  meter_id uuid not null references public.meters(id) on delete cascade,
  previous_reading numeric(14,2) not null check (previous_reading >= 0),
  current_reading numeric(14,2) not null check (current_reading >= previous_reading),
  units_consumed numeric(14,2) generated always as (current_reading - previous_reading) stored,
  reading_date date not null default current_date,
  recorded_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  unique (meter_id, reading_date)
);

create table public.bills (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.profiles(id) on delete cascade,
  meter_id uuid not null references public.meters(id) on delete restrict,
  reading_id uuid references public.meter_readings(id) on delete set null,
  tariff_id uuid references public.tariffs(id) on delete restrict,
  billing_period_start date not null,
  billing_period_end date not null,
  units_consumed numeric(14,2) not null check (units_consumed >= 0),
  energy_charge numeric(12,2) not null check (energy_charge >= 0),
  fixed_charge numeric(12,2) not null default 0 check (fixed_charge >= 0),
  tax_amount numeric(12,2) not null default 0 check (tax_amount >= 0),
  total_amount numeric(12,2) generated always as (energy_charge + fixed_charge + tax_amount) stored,
  status public.bill_status not null default 'pending',
  due_date date not null,
  created_at timestamptz not null default now(),
  check (billing_period_end >= billing_period_start)
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  bill_id uuid not null references public.bills(id) on delete restrict,
  customer_id uuid not null references public.profiles(id) on delete cascade,
  amount numeric(12,2) not null check (amount > 0),
  reference text not null unique,
  payment_method text,
  status public.payment_status not null default 'pending',
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  message text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,
  entity_type text,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.security_events (
  id bigint generated always as identity primary key,
  user_id uuid references public.profiles(id) on delete set null,
  event_type text not null,
  severity text not null default 'info' check (severity in ('info','warning','critical')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index meters_customer_idx on public.meters(customer_id);
create index readings_meter_date_idx on public.meter_readings(meter_id, reading_date desc);
create index bills_customer_idx on public.bills(customer_id);
create index bills_meter_idx on public.bills(meter_id);
create index payments_customer_idx on public.payments(customer_id);
create index payments_bill_idx on public.payments(bill_id);
create index notifications_user_idx on public.notifications(user_id);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.profiles(id, full_name, email)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'full_name',''), split_part(coalesce(new.email,''),'@',1), 'User'),
    new.email
  );
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = ''
as $$ select exists(select 1 from public.profiles where id = auth.uid() and role = 'admin'); $$;

alter table public.profiles enable row level security;
alter table public.meters enable row level security;
alter table public.tariffs enable row level security;
alter table public.meter_readings enable row level security;
alter table public.bills enable row level security;
alter table public.payments enable row level security;
alter table public.notifications enable row level security;
alter table public.audit_logs enable row level security;
alter table public.security_events enable row level security;

create policy profiles_select on public.profiles for select to authenticated using (id = auth.uid() or public.is_admin());
create policy profiles_update_self on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid() and role = (select role from public.profiles where id = auth.uid()));
create policy profiles_admin_update on public.profiles for update to authenticated using (public.is_admin()) with check (public.is_admin());

create policy meters_select on public.meters for select to authenticated using (customer_id = auth.uid() or public.is_admin());
create policy meters_admin_all on public.meters for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy tariffs_select on public.tariffs for select to authenticated using (active or public.is_admin());
create policy tariffs_admin_all on public.tariffs for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy readings_select on public.meter_readings for select to authenticated
using (exists(select 1 from public.meters m where m.id = meter_id and (m.customer_id = auth.uid() or public.is_admin())));
create policy readings_admin_all on public.meter_readings for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy bills_select on public.bills for select to authenticated using (customer_id = auth.uid() or public.is_admin());
create policy bills_admin_all on public.bills for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy payments_select on public.payments for select to authenticated using (customer_id = auth.uid() or public.is_admin());
create policy payments_admin_all on public.payments for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy notifications_select on public.notifications for select to authenticated using (user_id = auth.uid() or public.is_admin());
create policy notifications_update_self on public.notifications for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy notifications_admin_all on public.notifications for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy audit_admin_select on public.audit_logs for select to authenticated using (public.is_admin());
create policy security_events_admin_select on public.security_events for select to authenticated using (public.is_admin());
