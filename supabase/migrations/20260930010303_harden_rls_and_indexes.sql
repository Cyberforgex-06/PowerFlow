revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

create index if not exists audit_logs_actor_idx on public.audit_logs(actor_id);
create index if not exists bills_reading_idx on public.bills(reading_id);
create index if not exists bills_tariff_idx on public.bills(tariff_id);
create index if not exists readings_recorded_by_idx on public.meter_readings(recorded_by);
create index if not exists security_events_user_idx on public.security_events(user_id);

drop policy profiles_select on public.profiles;
create policy profiles_select on public.profiles for select to authenticated
using (id = (select auth.uid()) or (select public.is_admin()));

drop policy profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles for update to authenticated
using (id = (select auth.uid()))
with check (id = (select auth.uid()) and role = (select p.role from public.profiles p where p.id = (select auth.uid())));

drop policy meters_select on public.meters;
create policy meters_select on public.meters for select to authenticated
using (customer_id = (select auth.uid()) or (select public.is_admin()));

drop policy readings_select on public.meter_readings;
create policy readings_select on public.meter_readings for select to authenticated
using (exists(select 1 from public.meters m where m.id = meter_id and (m.customer_id = (select auth.uid()) or (select public.is_admin()))));

drop policy bills_select on public.bills;
create policy bills_select on public.bills for select to authenticated
using (customer_id = (select auth.uid()) or (select public.is_admin()));

drop policy payments_select on public.payments;
create policy payments_select on public.payments for select to authenticated
using (customer_id = (select auth.uid()) or (select public.is_admin()));

drop policy notifications_select on public.notifications;
create policy notifications_select on public.notifications for select to authenticated
using (user_id = (select auth.uid()) or (select public.is_admin()));

drop policy notifications_update_self on public.notifications;
create policy notifications_update_self on public.notifications for update to authenticated
using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
