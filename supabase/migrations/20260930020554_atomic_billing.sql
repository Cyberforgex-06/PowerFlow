-- RLS expressions execute as the querying role. The helper remains in a schema
-- that is not exposed by the Data API, but authenticated queries need EXECUTE.
grant usage on schema private to authenticated;
grant execute on function private.is_admin() to authenticated;

create policy audit_admin_insert on public.audit_logs for insert to authenticated
with check (private.is_admin() and actor_id = (select auth.uid()));

create or replace function public.issue_bill(
  p_meter_id uuid, p_tariff_id uuid, p_previous numeric, p_current numeric,
  p_start date, p_end date, p_due date
) returns uuid
language plpgsql security invoker set search_path = ''
as $$
declare
  meter public.meters%rowtype;
  tariff public.tariffs%rowtype;
  last_reading public.meter_readings%rowtype;
  reading_id uuid;
  bill_id uuid;
  units numeric(14,2);
  energy numeric(12,2);
  tax numeric(12,2);
begin
  if auth.uid() is null or not exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  ) then raise exception 'Administrator access required' using errcode = '42501'; end if;

  if p_meter_id is null or p_tariff_id is null or p_previous is null
     or p_current is null or p_start is null or p_end is null or p_due is null
     or p_previous < 0 or p_current < p_previous
     or p_previous > 999999999999.99 or p_current > 999999999999.99
     or p_previous <> round(p_previous,2) or p_current <> round(p_current,2)
     or p_end < p_start or p_due < p_end then
    raise exception 'Invalid billing dates or readings' using errcode = '22023';
  end if;

  -- Serialize billing for this meter; duplicate and overlap checks stay atomic.
  select * into meter from public.meters where id = p_meter_id for update;
  if not found or meter.status <> 'active' or meter.meter_type <> 'postpaid' then
    raise exception 'An active postpaid meter is required' using errcode = '22023';
  end if;
  select * into tariff from public.tariffs where id = p_tariff_id for share;
  if not found or not tariff.active or tariff.effective_from > p_start
    or (tariff.effective_to is not null and tariff.effective_to < p_end)
    or tariff.tax_rate > 100 then
    raise exception 'Tariff is not valid for this billing period' using errcode = '22023';
  end if;
  if exists (
    select 1 from public.bills b where b.meter_id = p_meter_id and b.status <> 'cancelled'
    and b.billing_period_start <= p_end and b.billing_period_end >= p_start
  ) then raise exception 'This billing period overlaps an existing bill' using errcode = '23505'; end if;
  select * into last_reading from public.meter_readings
    where meter_id = p_meter_id order by reading_date desc limit 1;
  if found and (p_previous <> last_reading.current_reading
    or p_end <= last_reading.reading_date or p_start < last_reading.reading_date) then
    raise exception 'Reading must continue from the latest recorded reading' using errcode = '22023';
  end if;

  units := p_current - p_previous;
  energy := round(units * tariff.rate_per_kwh, 2);
  -- tax_rate is a percentage: 7.5 represents 7.5%, not 0.075.
  tax := round((energy + tariff.fixed_charge) * tariff.tax_rate / 100, 2);
  insert into public.meter_readings(meter_id,previous_reading,current_reading,reading_date,recorded_by)
    values(p_meter_id,p_previous,p_current,p_end,auth.uid()) returning id into reading_id;
  insert into public.bills(customer_id,meter_id,reading_id,tariff_id,billing_period_start,
    billing_period_end,units_consumed,energy_charge,fixed_charge,tax_amount,due_date)
    values(meter.customer_id,p_meter_id,reading_id,p_tariff_id,p_start,p_end,
    units,energy,tariff.fixed_charge,tax,p_due) returning id into bill_id;
  insert into public.notifications(user_id,title,message)
    values(meter.customer_id,'A new electricity bill is ready',
    'Your bill for ' || p_start::text || ' to ' || p_end::text || ' is available. Payment is due ' || p_due::text || '.');
  insert into public.audit_logs(actor_id,action,entity_type,entity_id,metadata)
    values(auth.uid(),'bill.issued','bill',bill_id,jsonb_build_object('meter_id',p_meter_id,'units',units));
  return bill_id;
end;
$$;
revoke all on function public.issue_bill(uuid,uuid,numeric,numeric,date,date,date) from public, anon;
grant execute on function public.issue_bill(uuid,uuid,numeric,numeric,date,date,date) to authenticated;
