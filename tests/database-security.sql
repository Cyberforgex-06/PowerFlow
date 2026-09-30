begin;
create temporary table pf_test_ids as
select gen_random_uuid() as admin_id,gen_random_uuid() as customer_id,
gen_random_uuid() as other_id,gen_random_uuid() as meter_id,
gen_random_uuid() as other_meter_id,gen_random_uuid() as tariff_id;
grant select on pf_test_ids to authenticated, anon;
insert into auth.users(id,email,raw_user_meta_data)
select admin_id,'pf-admin-'||admin_id||'@example.invalid','{"full_name":"Test Admin"}'::jsonb from pf_test_ids
union all select customer_id,'pf-customer-'||customer_id||'@example.invalid','{"full_name":"Test Customer"}'::jsonb from pf_test_ids
union all select other_id,'pf-other-'||other_id||'@example.invalid','{"full_name":"Test Other"}'::jsonb from pf_test_ids;
update public.profiles set role='admin' where id=(select admin_id from pf_test_ids);
insert into public.meters(id,customer_id,meter_number,meter_type)
select meter_id,customer_id,'TEST-'||meter_id,'postpaid' from pf_test_ids
union all select other_meter_id,other_id,'TEST-'||other_meter_id,'postpaid' from pf_test_ids;
insert into public.tariffs(id,name,rate_per_kwh,fixed_charge,tax_rate,effective_from)
select tariff_id,'Test tariff',60,1000,7.5,'2026-01-01' from pf_test_ids;

set local role authenticated;
select set_config('request.jwt.claims',json_build_object('sub',admin_id,'role','authenticated')::text,true) from pf_test_ids;
do $$
declare ids record; bill uuid; charged numeric;
begin
select * into ids from pf_test_ids;
bill := public.issue_bill(ids.meter_id,ids.tariff_id,1000,1286,'2026-09-01','2026-09-30','2026-10-10');
select total_amount into charged from public.bills where id=bill;
if charged <> 19522 then raise exception 'Incorrect charge: %',charged; end if;
if not exists(select 1 from public.meter_readings where meter_id=ids.meter_id and units_consumed=286) then raise exception 'Reading missing'; end if;
if not exists(select 1 from public.notifications where user_id=ids.customer_id) then raise exception 'Notification missing'; end if;
if not exists(select 1 from public.audit_logs where entity_id=bill) then raise exception 'Audit missing'; end if;
begin
perform public.issue_bill(ids.meter_id,ids.tariff_id,1000,1286,'2026-09-01','2026-09-30','2026-10-10');
raise exception 'Duplicate bill was accepted';
exception when unique_violation then null;
end;
begin
perform public.issue_bill(ids.meter_id,ids.tariff_id,1280,1500,'2026-10-01','2026-10-31','2026-11-10');
raise exception 'Discontinuous reading was accepted';
exception when invalid_parameter_value then null;
end;
if (select count(*) from public.bills where meter_id=ids.meter_id) <> 1 then raise exception 'Failed transaction left a bill'; end if;
end $$;

select set_config('request.jwt.claims',json_build_object('sub',customer_id,'role','authenticated')::text,true) from pf_test_ids;
do $$
declare ids record;
begin
select * into ids from pf_test_ids;
if (select count(*) from public.bills) <> 1 then raise exception 'Customer cannot read own bill'; end if;
if exists(select 1 from public.meters where id=ids.other_meter_id) then raise exception 'Customer can read another meter'; end if;
if exists(select 1 from public.profiles where id=ids.other_id) then raise exception 'Customer can read another profile'; end if;
update public.profiles set full_name='Updated Customer' where id=ids.customer_id;
if not exists(select 1 from public.profiles where id=ids.customer_id and full_name='Updated Customer') then raise exception 'Profile update failed'; end if;
begin
update public.profiles set role='admin' where id=ids.customer_id;
raise exception 'Customer elevated their role';
exception when insufficient_privilege then null;
end;
begin
perform public.issue_bill(ids.meter_id,ids.tariff_id,1286,1500,'2026-10-01','2026-10-31','2026-11-10');
raise exception 'Customer issued a bill';
exception when insufficient_privilege then null;
end;
end $$;

select set_config('request.jwt.claims',json_build_object('sub',other_id,'role','authenticated')::text,true) from pf_test_ids;
do $$ begin
if exists(select 1 from public.bills) then raise exception 'Another customer can read bill'; end if;
end $$;
set local role anon;
select set_config('request.jwt.claims','{"role":"anon"}',true);
do $$ begin
if exists(select 1 from public.bills) then raise exception 'Anonymous user can read bill'; end if;
end $$;
reset role;
select 'PASS: atomic billing, charge calculation, overlap protection, reading continuity, audit, customer isolation, profile edit, role escalation, admin guard, anonymous isolation' as result;
rollback;
