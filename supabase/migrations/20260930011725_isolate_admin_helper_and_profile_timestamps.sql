create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'admin'
  );
$$;
revoke all on function private.is_admin() from public, anon, authenticated;

-- RLS policies call the private helper without exposing it as a REST RPC.
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select to authenticated
using (id = (select auth.uid()) or private.is_admin());

drop policy if exists profiles_admin_update on public.profiles;
create policy profiles_admin_update on public.profiles for update to authenticated
using (private.is_admin()) with check (private.is_admin());

drop policy if exists meters_select on public.meters;
create policy meters_select on public.meters for select to authenticated
using (customer_id = (select auth.uid()) or private.is_admin());
drop policy if exists meters_admin_all on public.meters;
create policy meters_admin_all on public.meters for all to authenticated
using (private.is_admin()) with check (private.is_admin());

drop policy if exists tariffs_select on public.tariffs;
create policy tariffs_select on public.tariffs for select to authenticated
using (active or private.is_admin());
drop policy if exists tariffs_admin_all on public.tariffs;
create policy tariffs_admin_all on public.tariffs for all to authenticated
using (private.is_admin()) with check (private.is_admin());

drop policy if exists readings_select on public.meter_readings;
create policy readings_select on public.meter_readings for select to authenticated
using (exists (
  select 1 from public.meters m
  where m.id = meter_id
    and (m.customer_id = (select auth.uid()) or private.is_admin())
));
drop policy if exists readings_admin_all on public.meter_readings;
create policy readings_admin_all on public.meter_readings for all to authenticated
using (private.is_admin()) with check (private.is_admin());

drop policy if exists bills_select on public.bills;
create policy bills_select on public.bills for select to authenticated
using (customer_id = (select auth.uid()) or private.is_admin());
drop policy if exists bills_admin_all on public.bills;
create policy bills_admin_all on public.bills for all to authenticated
using (private.is_admin()) with check (private.is_admin());

drop policy if exists payments_select on public.payments;
create policy payments_select on public.payments for select to authenticated
using (customer_id = (select auth.uid()) or private.is_admin());
drop policy if exists payments_admin_all on public.payments;
create policy payments_admin_all on public.payments for all to authenticated
using (private.is_admin()) with check (private.is_admin());

drop policy if exists notifications_select on public.notifications;
create policy notifications_select on public.notifications for select to authenticated
using (user_id = (select auth.uid()) or private.is_admin());
drop policy if exists notifications_admin_all on public.notifications;
create policy notifications_admin_all on public.notifications for all to authenticated
using (private.is_admin()) with check (private.is_admin());

drop policy if exists audit_admin_select on public.audit_logs;
create policy audit_admin_select on public.audit_logs for select to authenticated using (private.is_admin());
drop policy if exists security_events_admin_select on public.security_events;
create policy security_events_admin_select on public.security_events for select to authenticated using (private.is_admin());

drop function if exists public.is_admin();

create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
revoke all on function public.set_updated_at() from public, anon, authenticated;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();
