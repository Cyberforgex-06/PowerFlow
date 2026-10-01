-- PowerBill database schema
-- Reconstructed from the connected Supabase project used by the deployment.
-- Supabase Auth is intentionally not used; Flask owns authentication.

create extension if not exists pgcrypto;

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  full_name varchar(120) not null,
  email varchar(254) not null unique,
  password_hash text not null,
  role varchar(24) not null default 'customer' check (role in ('admin','billing_officer','customer')),
  is_active boolean not null default true,
  failed_login_attempts integer not null default 0 check (failed_login_attempts >= 0),
  locked_until timestamptz,
  last_login_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.customer_profiles (
  user_id uuid primary key references public.users(id) on delete cascade,
  phone varchar(24),
  address text
);

create table if not exists public.tariffs (
  id bigint generated always as identity primary key,
  name varchar(100) not null unique,
  rate_per_kwh numeric not null check (rate_per_kwh >= 0),
  fixed_charge numeric not null default 0 check (fixed_charge >= 0),
  vat_percent numeric not null default 7.5 check (vat_percent >= 0 and vat_percent <= 100),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.meters (
  id bigint generated always as identity primary key,
  meter_number varchar(48) not null unique,
  customer_id uuid not null references public.users(id) on delete restrict,
  tariff_id bigint not null references public.tariffs(id) on delete restrict,
  address text not null,
  status varchar(24) not null default 'active' check (status in ('active','suspended','disconnected')),
  installed_at date not null default current_date
);

create table if not exists public.meter_readings (
  id bigint generated always as identity primary key,
  meter_id bigint not null references public.meters(id) on delete restrict,
  reading_kwh numeric not null check (reading_kwh >= 0),
  billing_period date not null check (extract(day from billing_period) = 1),
  submitted_by uuid not null references public.users(id),
  created_at timestamptz not null default now(),
  unique (meter_id, billing_period)
);

create table if not exists public.bills (
  id bigint generated always as identity primary key,
  meter_id bigint not null references public.meters(id) on delete restrict,
  reading_id bigint not null unique references public.meter_readings(id),
  billing_period date not null,
  previous_reading numeric not null check (previous_reading >= 0),
  current_reading numeric not null check (current_reading >= 0),
  units_consumed numeric generated always as (current_reading - previous_reading) stored,
  rate_per_kwh numeric not null check (rate_per_kwh >= 0),
  fixed_charge numeric not null check (fixed_charge >= 0),
  vat_percent numeric not null,
  energy_charge numeric not null check (energy_charge >= 0),
  vat_amount numeric not null check (vat_amount >= 0),
  total_amount numeric not null check (total_amount >= 0),
  status varchar(16) not null default 'unpaid' check (status in ('unpaid','paid','overdue')),
  due_date date not null,
  generated_by uuid references public.users(id) on delete set null,
  generated_at timestamptz not null default now(),
  unique (meter_id, billing_period),
  check (current_reading >= previous_reading),
  check (total_amount = energy_charge + fixed_charge + vat_amount)
);

create table if not exists public.payments (
  id bigint generated always as identity primary key,
  bill_id bigint not null references public.bills(id) on delete restrict,
  amount numeric not null check (amount > 0),
  method varchar(24) not null check (method in ('card','bank_transfer','ussd','cash')),
  reference varchar(32) not null unique,
  status varchar(16) not null default 'pending' check (status in ('pending','successful','failed')),
  paid_at timestamptz,
  recorded_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.complaints (
  id bigint generated always as identity primary key,
  bill_id bigint references public.bills(id) on delete restrict,
  customer_id uuid not null references public.users(id) on delete restrict,
  subject varchar(160) not null,
  message text not null,
  status varchar(24) not null default 'open' check (status in ('open','in_review','resolved','rejected')),
  response text,
  resolved_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create table if not exists public.audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid references public.users(id) on delete set null,
  action varchar(80) not null,
  entity varchar(50),
  entity_id varchar(64),
  ip_address inet,
  user_agent text,
  details jsonb,
  created_at timestamptz not null default now()
);

-- The browser never talks to Supabase. RLS remains enabled with no policies;
-- the server-side PostgreSQL role used by Flask is the trusted database boundary.
alter table public.users enable row level security;
alter table public.customer_profiles enable row level security;
alter table public.tariffs enable row level security;
alter table public.meters enable row level security;
alter table public.meter_readings enable row level security;
alter table public.bills enable row level security;
alter table public.payments enable row level security;
alter table public.complaints enable row level security;
alter table public.audit_logs enable row level security;

create or replace function public.audit_logs_immutable()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  raise exception 'audit_logs is append-only';
end;
$$;

drop trigger if exists audit_logs_no_update_delete on public.audit_logs;
create trigger audit_logs_no_update_delete
before update or delete on public.audit_logs
for each row execute function public.audit_logs_immutable();
